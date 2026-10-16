// Kennedy 3D: la base real del proyecto humedalburro-secuencia (edificios, vías, manzanas, parques, agua y árboles)
// en las mismas coordenadas de escena: escena = ((x_raw - 5341.33) / 10, -(y_raw - 3161.9) / 10).
// La relación lat/lon → escena se ajustó por mínimos cuadrados con los 136 nodos georreferenciados de esa red (error < 0,01 u).
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import gsap from 'gsap';
import { BOUNDS, COLORS, type LngLat } from './content';
import type { Pad } from './mapview';

const SCALE = 0.1, CX = 5341.33, CY = 3161.9;
const rawToScene = (x: number, y: number) => ({ x: (x - CX) * SCALE, z: -(y - CY) * SCALE });
export const llToScene = (lon: number, lat: number) => ({
  x: 822788.3546359004 + 11092.648646158505 * lon - 13.182207869247996 * lat,
  z: 50308.77183477081 - 13.243326973107992 * lon - 11054.913452408508 * lat,
});

type Box = [number, number, number, number];
const A = './assets/';
const getJson = (f: string) => fetch(A + f).then((r) => { if (!r.ok) throw new Error(f); return r.json(); });
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export class Kennedy3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  base = new THREE.Group();
  over = new THREE.Group();
  mats: LineMaterial[] = [];
  fills: Record<string, THREE.MeshBasicMaterial> = {};
  lines: Record<string, { m: LineMaterial; base: number }> = {};
  cam = { tx: 0, tz: 0, dist: 600, az: 0, el: 0.95 };
  pad: Pad = { top: 0, right: 0, bottom: 0, left: 0 };
  W = 1; H = 1;
  status = 'idle';
  progress = 0;
  onProgress?: (p: number) => void;
  t0 = performance.now();
  running = true;
  walls: THREE.Mesh[] = [];
  active = false;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(38, 1, 2, 9000);
    this.scene.add(this.base, this.over);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sun = new THREE.DirectionalLight(0xdde6ff, 1.1);
    sun.position.set(-300, 520, 260);
    this.scene.add(sun);
    this.resize();
    this.buildOverlay();
    const loop = () => {
      if (!this.running) return;
      if (this.active) {
        this.update();
        this.renderer.render(this.scene, this.camera);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  dispose() { this.running = false; this.renderer.dispose(); this.renderer.domElement.remove(); }

  resize() {
    this.W = this.host.clientWidth || window.innerWidth;
    this.H = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(this.W, this.H);
    this.camera.aspect = this.W / this.H;
    this.mats.forEach((m) => m.resolution.set(this.W, this.H));
    this.applyView();
  }

  // el área libre del mapa (a la derecha de la columna) queda centrada con un desplazamiento de la vista
  private applyView() {
    const p = this.pad;
    this.camera.setViewOffset(this.W, this.H, -(p.left - p.right) / 2, -(p.top - p.bottom) / 2, this.W, this.H);
    this.camera.updateProjectionMatrix();
  }

  private update() {
    const c = this.cam;
    const drift = Math.sin((performance.now() - this.t0) / 9000) * 0.05;
    const az = c.az + drift;
    const r = c.dist;
    this.camera.position.set(c.tx + r * Math.sin(az) * Math.cos(c.el), r * Math.sin(c.el), c.tz + r * Math.cos(az) * Math.cos(c.el));
    this.camera.lookAt(c.tx, 0, c.tz);
    this.camera.updateMatrixWorld();
    // las fachadas solo se dibujan en los acercamientos (ligero en vistas amplias)
    const show = this.cam.dist < 700;
    if (this.walls.length && this.walls[0].visible !== show) this.walls.forEach((w) => { w.visible = show; });
  }

  project(ll: LngLat): { x: number; y: number } | null {
    const p = llToScene(ll[0], ll[1]);
    const v = new THREE.Vector3(p.x, 1.2, p.z);
    v.project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * this.W, y: (-v.y * 0.5 + 0.5) * this.H };
  }

  // ---------------- cámara: encuadre por cuadro geográfico
  fit(box: Box, pad: Pad, duration = 1.8, az = -0.18, el = 0.92) {
    this.pad = pad;
    this.applyView();
    const a = llToScene(box[0], box[1]), b = llToScene(box[2], box[3]);
    const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2;
    const hx = Math.abs(b.x - a.x) / 2, hz = Math.abs(b.z - a.z) / 2;
    const fw = Math.max(0.25, (this.W - pad.left - pad.right) / this.W);
    const fh = Math.max(0.25, (this.H - pad.top - pad.bottom) / this.H);
    const t = Math.tan((this.camera.fov * Math.PI) / 360);
    const dist = Math.max(hx / (t * this.camera.aspect * fw), (hz * Math.sin(el)) / (t * fh)) * 1.2;
    gsap.to(this.cam, { tx: cx, tz: cz, dist, az, el, duration, ease: 'power3.inOut', overwrite: true });
  }

  // ---------------- base 3D (se carga una sola vez)
  load(onProgress?: (p: number) => void) {
    if (this.status !== 'idle') return;
    this.status = 'loading';
    this.onProgress = onProgress;
    const done = (p: number) => { this.progress = p; onProgress?.(p); };
    (async () => {
      const mk = (c: number, o = 1, extra: object = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, flatShading: true, side: THREE.DoubleSide, transparent: o < 1, opacity: o, ...extra });
      const g = this.base;
      // parques
      try {
        const parks = await getJson('kennedy_parques.json');
        g.add(this.flat(parks.map((p: any) => p.pts), 0.02, new THREE.MeshBasicMaterial({ color: 0x101c15, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })));
      } catch { /* sin parques */ }
      done(0.08);
      try {
        const net = await getJson('kennedy_net.json');
        const pos: number[] = [];
        net.edges.forEach(([, pts]: [string, number[][]]) => { for (let i = 0; i < pts.length - 1; i++) { const p = rawToScene(pts[i][0], pts[i][1]), q = rawToScene(pts[i + 1][0], pts[i + 1][1]); pos.push(p.x, 0.04, p.z, q.x, 0.04, q.z); } });
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x4a515b, transparent: true, opacity: 0.45 })));
      } catch { /* sin vías */ }
      done(0.16);
      try {
        const water = await getJson('kennedy_water_bodies.json');
        g.add(this.flat(water.map((w: any) => w.pts), 0.06, new THREE.MeshBasicMaterial({ color: 0x1f3d57, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })));
      } catch { /* sin agua */ }
      done(0.22);
      try {
        const man = await getJson('kennedy_manzanas.json');
        const pos: number[] = [];
        man.forEach((m: any) => { for (let i = 0; i < m.pts.length - 1; i++) { const p = rawToScene(m.pts[i][0], m.pts[i][1]), q = rawToScene(m.pts[i + 1][0], m.pts[i + 1][1]); pos.push(p.x, 0.01, p.z, q.x, 0.01, q.z); } });
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2c3036, transparent: true, opacity: 0.35 })));
      } catch { /* sin manzanas */ }
      done(0.3);
      // árboles reales: nube de puntos (barata y no depende de la cámara)
      try {
        const trees = await getJson('kennedy_trees_real.json');
        const pos = new Float32Array(trees.length * 3);
        trees.forEach((t: any, i: number) => { const p = rawToScene(t[0], t[1]); pos[i * 3] = p.x; pos[i * 3 + 1] = Math.max(0.35, t[2] * SCALE * 0.7); pos[i * 3 + 2] = p.z; });
        const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(tg, new THREE.PointsMaterial({ color: 0x2f5e44, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.28, depthWrite: false }));
        pts.frustumCulled = false; g.add(pts);
      } catch { /* sin árboles */ }
      done(0.42);
      // techos y fachadas del modelo
      for (const [f, col] of [['kennedy_roofs_flat.json', 0x20242a], ['kennedy_facades.json', 0x2a2623]] as const) {
        try {
          const data = await getJson(f);
          const sp = data.verts.map((v: number[]) => { const p = rawToScene(v[0], v[1]); return [p.x, v[2] * SCALE, p.z]; });
          const pos: number[] = [];
          data.tris.forEach(([a, b, c]: number[]) => { const pa = sp[a], pb = sp[b], pc = sp[c]; if (pa && pb && pc) pos.push(...pa, ...pb, ...pc); });
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.add(new THREE.Mesh(geo, mk(col)));
        } catch { /* omitido */ }
      }
      done(0.5);
      // edificios (243 mil): se construyen por lotes para no bloquear la animación
      try {
        const list = await getJson('kennedy_buildings.json');
        const mat = mk(0x16191e);
        const roofMat = mk(0x1e2228);
        // celdas espaciales: cada una es una malla propia y se descarta sola cuando queda fuera de cuadro
        const CELL = 900;
        const cells = new Map<number, any[]>();
        list.forEach((b: any) => { const p = b.pts[0]; const key = Math.floor(p[0] / CELL) * 1000 + Math.floor(p[1] / CELL); (cells.get(key) || cells.set(key, []).get(key)!).push(b); });
        let n = 0;
        for (const items of cells.values()) {
          const pos: number[] = [];
          const roof: number[] = [];
          for (const b of items) {
            const pts = b.pts.map((p: number[]) => rawToScene(p[0], p[1]));
            const h = Math.max(0.3, b.h * SCALE * 1.15);
            if (pts.length < 4) continue;
            for (let i = 0; i < pts.length - 1; i++) {
              const a = pts[i], c = pts[i + 1];
              pos.push(a.x, 0, a.z, c.x, 0, c.z, c.x, h, c.z, a.x, 0, a.z, c.x, h, c.z, a.x, h, a.z);
            }
            let tri: number[][] = [];
            try { tri = THREE.ShapeUtils.triangulateShape(pts.map((p: any) => new THREE.Vector2(p.x, p.z)), []); } catch { tri = []; }
            tri.forEach(([ia, ib, ic]) => roof.push(pts[ia].x, h, pts[ia].z, pts[ib].x, h, pts[ib].z, pts[ic].x, h, pts[ic].z));
          }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          geo.computeBoundingSphere();
          const wm = new THREE.Mesh(geo, mat); g.add(wm); this.walls.push(wm);
          const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(roof, 3));
          rg.computeBoundingSphere();
          g.add(new THREE.Mesh(rg, roofMat));
          n++;
          if (n % 3 === 0) { done(0.5 + 0.5 * Math.min(1, n / cells.size)); await tick(); }
        }
      } catch { /* sin edificios */ }
      this.status = 'ready';
      done(1);
    })();
  }

  // polígonos planos triangulados (parques, agua)
  private flat(polys: number[][][], y: number, mat: THREE.Material) {
    const pos: number[] = [];
    polys.forEach((poly) => {
      const pts = poly.map((p) => rawToScene(p[0], p[1]));
      if (pts.length < 3) return;
      let tri: number[][] = [];
      try { tri = THREE.ShapeUtils.triangulateShape(pts.map((p) => new THREE.Vector2(p.x, p.z)), []); } catch { tri = []; }
      tri.forEach(([a, b, c]) => pos.push(pts[a].x, y, pts[a].z, pts[b].x, y, pts[b].z, pts[c].x, y, pts[c].z));
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 1; return m;
  }

  // ---------------- capas del proyecto: red hídrica y humedales reales (OpenStreetMap) sobre la base
  private fat(segs: number[], color: string, width: number, key: string) {
    const geo = new LineSegmentsGeometry(); geo.setPositions(segs);
    const mat = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: width, transparent: true, opacity: 0, depthTest: false });
    mat.resolution.set(this.W, this.H);
    this.mats.push(mat);
    const l = new LineSegments2(geo, mat); l.renderOrder = 10; this.over.add(l);
    this.lines[key] = { m: mat, base: 0 };
  }
  private async buildOverlay() {
    const geo = await fetch('./data/geo.json').then((r) => r.json());
    const toSegs = (feats: any[], y: number) => {
      const s: number[] = [];
      feats.forEach((f) => { const c = f.geometry.coordinates; for (let i = 0; i < c.length - 1; i++) { const a = llToScene(c[i][0], c[i][1]), b = llToScene(c[i + 1][0], c[i + 1][1]); s.push(a.x, y, a.z, b.x, y, b.z); } });
      return s;
    };
    const rios = geo.agua.features.filter((f: any) => f.properties.kind === 'rio');
    const canales = geo.agua.features.filter((f: any) => f.properties.kind === 'canal');
    this.fat(toSegs(rios, 0.9), COLORS.green, 3, 'rondas');
    this.fat(toSegs(canales, 0.8), COLORS.water, 0.8, 'canal');
    this.fat(toSegs(rios, 1.0), COLORS.water, 1.4, 'rio');
    for (const k of ['burro', 'vaca', 'techo']) {
      const feats = geo.cuerpos.features.filter((f: any) => f.properties.wet === k);
      const pos: number[] = [];
      const ring: any[] = [];
      feats.forEach((f: any) => {
        const pts = f.geometry.coordinates[0].map((c: number[]) => llToScene(c[0], c[1]));
        ring.push({ geometry: { coordinates: f.geometry.coordinates[0] } });
        let tri: number[][] = [];
        try { tri = THREE.ShapeUtils.triangulateShape(pts.map((p: any) => new THREE.Vector2(p.x, p.z)), []); } catch { tri = []; }
        tri.forEach(([a, b, c]) => pos.push(pts[a].x, 1.0, pts[a].z, pts[b].x, 1.0, pts[b].z, pts[c].x, 1.0, pts[c].z));
      });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.MeshBasicMaterial({ color: COLORS.water, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false });
      const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 9; this.over.add(mesh); this.fills[k] = mat;
      this.fat(toSegs(ring, 1.1), COLORS.water, 2.2, 'w-' + k);
    }
    const vias = geo.vias.features.filter((f: any) => f.properties.cls === 'trunk');
    this.fat(toSegs(vias, 0.7), '#9a9a9a', 1.4, 'vias');
    const vias2 = geo.vias.features.filter((f: any) => f.properties.cls !== 'trunk');
    this.fat(toSegs(vias2, 0.6), '#5d5d5d', 0.8, 'vias2');
    this.state(this.last[0], this.last[1]);
  }

  private fade(mat: { opacity: number }, v: number, delay = 0, dur = 0.9) {
    gsap.to(mat, { opacity: v, duration: dur, delay, ease: 'power2.out', overwrite: true });
  }
  // mismas reglas de visibilidad por secuencia que el mapa 2D
  last: [number, string | null] = [0, null];
  state(beat: number, sel: string | null = null) {
    this.last = [beat, sel];
    const all = beat >= 8 && !sel;
    const hid = beat >= 2 && beat <= 7 ? 1 : beat === 8 ? (all || sel === 'hid' || sel === 'eco' ? 1 : 0.25) : 0;
    const dim = beat >= 3 && beat <= 7 ? 0.7 : 1;
    const hk = hid * dim;
    ['burro', 'vaca', 'techo'].forEach((k, i) => {
      if (this.fills[k]) this.fade(this.fills[k], hk ? 0.4 : 0, hk ? 0.5 + i * 0.65 : 0);
      const l = this.lines['w-' + k]; if (l) this.fade(l.m, hk ? 1 : 0, hk ? 0.5 + i * 0.65 : 0);
    });
    if (this.lines.rio) this.fade(this.lines.rio.m, hk ? 0.7 : 0, hk ? 2.2 : 0, 1.2);
    if (this.lines.canal) this.fade(this.lines.canal.m, hk ? 0.28 : 0, hk ? 2.6 : 0, 1.2);
    const reg = (beat === 3 || beat === 4) || (beat === 8 && (all || sel === 'reg' || sel === 'eco')) ? 0.4 : 0;
    if (this.lines.rondas) this.fade(this.lines.rondas.m, reg, reg ? 0.9 : 0);
    const vias = beat === 6 || beat === 7 || (beat === 8 && (all || sel === 'lim' || sel === 'com')) ? 1 : 0;
    if (this.lines.vias) this.fade(this.lines.vias.m, vias ? 0.95 : 0, 0.3);
    if (this.lines.vias2) this.fade(this.lines.vias2.m, vias ? 0.6 : 0, 0.5);
  }
}

export { BOUNDS };
