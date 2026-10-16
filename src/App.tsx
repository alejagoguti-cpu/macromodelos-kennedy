import { cloneElement, type ReactElement } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ArrowLeft, ArrowRight, Bird, Droplets, Gauge, Leaf, MousePointerClick, Network, PackagePlus, Recycle, ShoppingBasket, Sprout, Store, Trash2, Wheat } from 'lucide-react';
import { ACTIVE_BY_BEAT, BOUNDS, COLORS, CYCLE, CYCLE_PROPOSED, GEO, MODEL, MODELS, N, SPINE, STEP_LABELS, type GeoId, type ModelId } from './content';
import { CONNS, REL_TEXT, type Conn } from './conns';
import { MapView, type Pad } from './mapview';
import { Kennedy3D } from './kennedy3d';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const ICONS: Record<ModelId, ReactElement> = {
  eco: <Leaf />, hid: <Droplets />, reg: <Sprout />, com: <Store />, cir: <Recycle />, lim: <Gauge />, bio: <Bird />,
};
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------ disposición de las tarjetas por secuencia
interface St { x: number; y: number; o: number; s: number; w: number; compact: boolean; d: number }

function layout(b: number, W: number, H: number, m: boolean): Record<string, St> {
  const L: Record<string, St> = {};
  const cw = m ? Math.min(W * 0.9, 380) : 340;
  const nw = m ? W * 0.58 : 232;
  const sx = m ? W * 0.5 : W * 0.2;
  const gap = m ? 150 : 150;
  const y0 = m ? 104 : 132;
  const act = ACTIVE_BY_BEAT[b];
  const target = H * (m ? 0.3 : 0.44);
  const cam = b >= 8 ? 0 : Math.min(0, target - (y0 + Math.max(act, 0) * gap));
  const netY: Record<ModelId, number> = { bio: 0.165, eco: 0.335, hid: 0.455, reg: 0.565, com: 0.655, cir: 0.745, lim: 0.85 };
  const netX = m ? W * 0.3 : W * 0.17;
  SPINE.forEach((id, i) => {
    const mod = MODEL[id];
    const vis = b >= mod.appear && !(b === 0);
    if (b >= 8) {
      L[id] = { x: netX, y: H * netY[id], o: 1, s: 1, w: nw, compact: true, d: 0.1 + i * 0.08 };
    } else {
      // la tarjeta activa va completa; las anteriores quedan como fichas compactas que suben
      const ya = Math.max(y0 + 60, target);
      const y = i === act ? ya : i < act ? ya - 132 - (act - i - 1) * 102 : ya + 140;
      const o = !vis ? 0 : i === act ? 1 : Math.max(0.28, 0.7 - (act - i) * 0.14);
      const fade = y < 128 ? 0 : o;
      L[id] = { x: sx, y: vis ? y : y + 24, o: id === 'eco' && b === 0 ? 0 : fade, s: vis ? 1 : 0.94, w: i === act ? cw : cw * 0.82, compact: i !== act, d: i === act ? 0.45 : 0 };
    }
  });
  // título central del inicio: se desplaza hacia la parte superior y cede el paso a la tarjeta
  L.hero = b === 0 ? { x: W / 2, y: H * 0.46, o: 1, s: 1, w: 0, compact: false, d: 0 } : { x: sx, y: y0 + cam, o: 0, s: 0.55, w: 0, compact: false, d: 0 };
  return L;
}

function camera(b: number, W: number, H: number, m: boolean): { box: [number, number, number, number]; pad: Pad; az: number; el: number } {
  const pad: Pad = m ? { top: H * 0.5, right: 14, bottom: 80, left: 14 } : { top: 80, right: 40, bottom: 90, left: W * 0.4 };
  if (b === 2) return { box: BOUNDS.kennedy, pad, az: -0.2, el: 0.9 };
  if (b === 3) return { box: BOUNDS.humedales, pad, az: 0.18, el: 0.85 };
  if (b === 4 || b === 5) {
    if (b === 5 && !m) pad.right = W * 0.34;
    if (b === 5 && m) pad.top = H * 0.36;
    return { box: BOUNDS.corabastos, pad, az: -0.28, el: 0.78 };
  }
  if (b === 8) { pad.left = m ? 14 : W * 0.46; }
  return { box: BOUNDS.kennedy, pad, az: b === 7 ? 0.2 : b === 8 ? -0.1 : 0, el: b >= 6 ? 1.0 : 0.95 };
}

// ------------------------------------------------------------ geometría
const rect = (e: Element | null | undefined) => (e ? e.getBoundingClientRect() : null);
interface Pt { x: number; y: number; dx: number; dy: number }

export default function App() {
  const [beat, setBeat] = useState(0);
  const [explore, setExplore] = useState(false);
  const [sel, setSel] = useState<ModelId | null>(null);
  const [size, setSize] = useState({ W: window.innerWidth, H: window.innerHeight });
  const [mapOk, setMapOk] = useState(false);
  const [view3d, setView3d] = useState(true);
  const [k3p, setK3p] = useState(0);
  const { W, H } = size;
  const m = W < 760;

  const stageRef = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const cards = useRef<Record<string, HTMLElement | null>>({});
  const lanes = useRef<Record<string, HTMLElement | null>>({});
  const mv = useRef<MapView | null>(null);
  const k3 = useRef<Kennedy3D | null>(null);
  const k3El = useRef<HTMLDivElement>(null);
  const v3 = useRef(true);
  const beatRef = useRef(0);
  const lock = useRef(false);
  const statics = useRef<Record<string, Pt>>({});
  const prevOn = useRef<Set<string>>(new Set());
  const inited = useRef(false);

  // ---------------- navegación (clic, botones, teclado y desplazamiento vertical sincronizado)
  const go = useCallback((n: number) => {
    n = Math.max(0, Math.min(N - 1, n));
    if (n === beatRef.current) return;
    beatRef.current = n;
    setBeat(n);
    if (n < 8) { setExplore(false); setSel(null); }
    const target = n * window.innerHeight;
    lock.current = true;
    gsap.to(window, { scrollTo: target, duration: reduced() ? 0 : 0.9, ease: 'power2.inOut', onComplete: () => { lock.current = false; } });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(beatRef.current + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(beatRef.current - 1); }
      if (e.key === 'Escape') { setSel(null); }
    };
    const onResize = () => setSize({ W: window.innerWidth, H: window.innerHeight });
    addEventListener('keydown', onKey);
    addEventListener('resize', onResize);
    return () => { removeEventListener('keydown', onKey); removeEventListener('resize', onResize); };
  }, [go]);

  useLayoutEffect(() => {
    const st = ScrollTrigger.create({
      trigger: spacerRef.current, start: 'top top', end: 'bottom bottom',
      snap: { snapTo: 1 / (N - 1), duration: { min: 0.2, max: 0.6 }, ease: 'power2.inOut' },
      onUpdate: (self) => {
        if (lock.current) return;
        const n = Math.round(self.progress * (N - 1));
        if (n !== beatRef.current) { beatRef.current = n; setBeat(n); if (n < 8) { setExplore(false); setSel(null); } }
      },
    });
    return () => st.kill();
  }, []);

  // ---------------- mapa
  useEffect(() => {
    const pad = camera(0, W, H, m).pad;
    const v = new MapView(mapEl.current!, pad);
    mv.current = v;
    v.ready.then(() => { setMapOk(true); });
    return () => { v.map.remove(); mv.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const k = new Kennedy3D(k3El.current!);
    k3.current = k;
    return () => { k.dispose(); k3.current = null; };
  }, []);
  useEffect(() => { if (beat >= 1 && k3.current) k3.current.load(setK3p); }, [beat]);
  useEffect(() => { v3.current = view3d; }, [view3d]);
  useEffect(() => { if (k3.current) k3.current.active = beat >= 2 && view3d; }, [beat, view3d]);
  useEffect(() => { k3.current?.resize(); }, [W, H]);
  useEffect(() => { if (k3.current) k3.current.state(beat, explore ? sel : null); }, [beat, explore, sel]);

  useEffect(() => {
    const c = camera(beat, W, H, m);
    if (k3.current) k3.current.fit(c.box, c.pad, reduced() ? 0 : beat === beatRef.current ? 1.9 : 0, c.az, c.el);
    if (!mapOk || !mv.current) return;
    mv.current.fit(c.box, c.pad, reduced() ? 0 : beat === beatRef.current ? 1800 : 0);
    mv.current.map.resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, mapOk, m, W, H]);

  useEffect(() => {
    if (mapOk && mv.current) mv.current.state(beat, explore ? sel : null);
  }, [beat, mapOk, explore, sel]);

  // el mapa se integra a la composición: aparece al hacer clic en el Hidrocéntrico
  useLayoutEffect(() => {
    gsap.to(mapEl.current, { opacity: beat >= 2 && !view3d ? 1 : 0, duration: reduced() ? 0 : 1.4, ease: 'power2.out' });
    gsap.to(k3El.current, { opacity: beat >= 2 && view3d ? 1 : 0, duration: reduced() ? 0 : 1.4, ease: 'power2.out' });
    gsap.to('#wash', { opacity: beat >= 2 && beat <= 7 ? 1 : 0, duration: 1 });
  }, [beat, view3d]);

  // ---------------- tarjetas
  useLayoutEffect(() => {
    gsap.set(Object.values(cards.current).filter((e) => e && !e.classList.contains('herosub') && e.tagName !== 'P'), { xPercent: -50, yPercent: -50 });
    gsap.set(cards.current.heroSub, { opacity: 0, y: 14 });
  }, []);
  const lay = useMemo(() => layout(beat, W, H, m), [beat, W, H, m]);
  useLayoutEffect(() => {
    const first = !inited.current;
    inited.current = true;
    const dur = reduced() || first ? 0 : 0.95;
    for (const k of Object.keys(lay)) {
      const el = k === 'hero' ? cards.current.hero : cards.current[k];
      if (!el) continue;
      const s = lay[k];
      const dim = explore && sel ? (isRelated(sel, k as ModelId) ? 1 : 0.18) : 1;
      gsap.to(el, {
        x: s.x, y: s.y, opacity: s.o * dim, scale: s.s, width: s.w || undefined, duration: dur, delay: reduced() || first ? 0 : s.d, ease: 'power3.inOut', overwrite: 'auto',
        onStart: () => { if (k !== 'hero') el.classList.toggle('compact', s.compact); },
      });
      if (k !== 'hero') el.style.pointerEvents = s.o > 0.2 && (beat < 8 || explore) ? 'auto' : 'none';
    }
    if (beat === 0) gsap.to(cards.current.heroSub, { opacity: 1, y: 0, duration: 1, delay: 0.5, overwrite: 'auto' });
    else gsap.to(cards.current.heroSub, { opacity: 0, duration: 0.4, overwrite: 'auto' });
  }, [lay, explore, sel, beat]);

  // ---------------- conexiones declarativas: visibles según secuencia y modo explorar
  const conns = useMemo(() => CONNS.filter((c) => beat >= c.min && beat <= c.max && (!c.exp || (explore && sel && c.models.includes(sel)))), [beat, explore, sel]);
  const related = (c: Conn) => !explore || !sel || sel === 'eco' || sel === 'lim' || sel === 'bio' || c.models.includes(sel);
  const geoColor = useMemo(() => {
    const g: Record<string, string> = {};
    for (const c of conns) for (const a of [c.a, c.b]) if (a.startsWith('g:') && related(c)) g[a.slice(2)] = g[a.slice(2)] || c.color;
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conns, explore, sel]);

  // ciclo de circularidad (centro y radio)
  const cyc = useMemo(() => {
    const cx = m ? W * 0.5 : Math.min(W * 0.74, W - 250 - Math.min(W * 0.115, H * 0.25));
    const cy = m ? H * 0.7 : H * 0.5;
    const R = m ? Math.min(W * 0.22, 120) : Math.min(W * 0.115, H * 0.25);
    const pts = CYCLE.map((c, i) => {
      const a = (-90 + i * 72) * (Math.PI / 180);
      return { ...c, a, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    return { cx, cy, R, pts };
  }, [W, H, m]);
  useEffect(() => {
    const p = cyc.pts[1];
    statics.current = {
      ringL: { x: cyc.cx - cyc.R - 14, y: cyc.cy, dx: -1, dy: 0 },
      residuos: { x: p.x, y: p.y, dx: 0, dy: 0 },
    };
  }, [cyc]);

  // ---------------- bucle de dibujo: las conexiones siguen a sus nodos y al mapa en cada cuadro
  useEffect(() => {
    const anchor = (s: string, other: Pt | null): Pt | null => {
      const [k, a, b] = s.split(':');
      if (k === 'c' || k === 'f') {
        const r = rect(k === 'c' ? cards.current[a] : lanes.current[a]);
        if (!r) return null;
        if (b === 'b') return { x: r.left + r.width / 2, y: r.bottom, dx: 0, dy: 1 };
        if (b === 't') return { x: r.left + r.width / 2, y: r.top, dx: 0, dy: -1 };
        if (b === 'l') return { x: r.left, y: r.top + r.height / 2, dx: -1, dy: 0 };
        return { x: r.right, y: r.top + r.height / 2, dx: 1, dy: 0 };
      }
      if (k === 'g') {
        if (v3.current) {
          const q = k3.current?.project(GEO[a as GeoId].ll);
          return q ? { x: q.x, y: q.y, dx: 0, dy: 0 } : null;
        }
        const v = mv.current;
        if (!v || !v.map.loaded()) return null;
        const p = v.project(GEO[a as GeoId].ll);
        return { x: p.x, y: p.y, dx: 0, dy: 0 };
      }
      return statics.current[a] || null;
    };
    type Pd = { t: number; r: number; b: number; l: number };
    const union = (ids: string[], pad: Pd) => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const id of ids) {
        const r = rect(cards.current[id]);
        if (!r) continue;
        x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
      }
      return { x: x0 - pad.l, y: y0 - pad.t, w: x1 - x0 + pad.l + pad.r, h: y1 - y0 + pad.t + pad.b };
    };
    const setLane = (key: string, ids: string[], pad: Pd) => {
      const el = lanes.current[key];
      if (!el) return;
      const u = union(ids, pad);
      el.style.transform = 'translate(' + u.x + 'px,' + u.y + 'px)';
      el.style.width = u.w + 'px';
      el.style.height = u.h + 'px';
    };
    // ---- ningún texto se superpone con otro: las etiquetas del territorio y de las conexiones buscan un hueco libre
    interface Box { x: number; y: number; w: number; h: number }
    const hit = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const toBox = (r: DOMRect, pad = 3): Box => ({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
    const declutter = (svg: SVGSVGElement, mids: Record<string, { x: number; y: number }>) => {
      const Wd = window.innerWidth, Hd = window.innerHeight;
      const occ: Box[] = [{ x: 0, y: 0, w: Wd, h: 66 }, { x: 0, y: Hd - 64, w: Wd, h: 64 }];
      for (const id of Object.keys(cards.current)) {
        const el = cards.current[id];
        if (!el || id === 'heroSub') continue;
        if (parseFloat(el.style.opacity || '0') > 0.12) occ.push(toBox(el.getBoundingClientRect(), 4));
      }
      document.querySelectorAll('.lane.on .chip, #legend, #panel, .herosub').forEach((el) => occ.push(toBox(el.getBoundingClientRect(), 4)));
      svg.querySelectorAll('.cyc.on text').forEach((el) => occ.push(toBox(el.getBoundingClientRect(), 3)));
      const place = (px: number, py: number, w: number, h: number, cands: [number, number][], mid: boolean) => {
        for (const [dx, dy] of cands) {
          const x = px + dx - (mid ? w / 2 : dx < 0 ? w : 0);
          const bx: Box = { x, y: py + dy - h + 3, w, h };
          if (bx.x < 6 || bx.x + bx.w > Wd - 6 || bx.y < 70 || bx.y + bx.h > Hd - 70) continue;
          if (occ.some((o) => hit(bx, o))) continue;
          occ.push(bx);
          return { x: px + dx, y: py + dy };
        }
        return null;
      };
      svg.querySelectorAll<SVGGElement>('g.gp.on').forEach((g) => {
        const t = g.querySelector<SVGTextElement>('.gl')!;
        const P = g.getAttribute('transform')?.match(/translate\(([-\d.]+)[ ,]([-\d.]+)\)/);
        if (!P) return;
        const px = parseFloat(P[1]), py = parseFloat(P[2]);
        if (!t.dataset.w) t.dataset.w = String(t.getComputedTextLength() + 8);
        const w = parseFloat(t.dataset.w);
        const pos = place(px, py, w, 13, [[10, -6], [10, 16], [-10, -6], [-10, 16], [0, -18], [0, 28], [26, -22], [-26, 32]], false);
        if (pos) {
          t.setAttribute('text-anchor', pos.x < px - 1 ? 'end' : 'start');
          t.setAttribute('x', String(pos.x - px));
          t.setAttribute('y', String(pos.y - py));
          t.style.opacity = '1';
        } else t.style.opacity = '0';
      });
      svg.querySelectorAll<SVGTextElement>('text.el.on').forEach((t) => {
        const m = mids[t.dataset.el!];
        if (!m) return;
        if (!t.dataset.w) t.dataset.w = String(t.getComputedTextLength() + 8);
        const pos = place(m.x, m.y, parseFloat(t.dataset.w), 13, [[0, -8], [0, 16], [0, -24], [0, 32], [0, -40], [0, 48]], true);
        if (pos) { t.setAttribute('x', String(pos.x)); t.setAttribute('y', String(pos.y)); t.style.opacity = ''; } else t.style.opacity = '0';
      });
    };
    const tick = () => {
      const b = beatRef.current;
      // el margen superior deja sitio a la etiqueta del campo para que nunca pise el texto de las tarjetas
      setLane('eco', b >= 8 ? ['eco', 'hid', 'reg', 'com', 'cir'] : ['eco', 'hid'], { t: 38, r: 22, b: 20, l: 22 });
      setLane('hid', ['hid'], { t: 30, r: 11, b: 11, l: 11 });
      setLane('bio', SPINE, { t: 16, r: 28, b: 16, l: 28 });
      const mids: Record<string, { x: number; y: number }> = {};
      const svg = svgRef.current;
      if (!svg) return;
      svg.querySelectorAll<SVGGElement>('g[data-cn]').forEach((g) => {
        const A = anchor(g.dataset.a!, null);
        const B = anchor(g.dataset.b!, null);
        if (!A || !B) return;
        const dist = Math.hypot(B.x - A.x, B.y - A.y);
        const k = g.dataset.bulge === '1' ? 0 : Math.max(36, dist * 0.42);
        const bulge = g.dataset.bulge === '1' ? 26 + Math.abs(B.y - A.y) * 0.05 : 0;
        const c1 = { x: A.x + A.dx * k - (bulge && A.dx === -1 ? bulge : 0), y: A.y + A.dy * k };
        const c2 = { x: B.x + B.dx * k - (bulge && B.dx === -1 ? bulge : 0), y: B.y + B.dy * k };
        const d = 'M' + A.x + ' ' + A.y + 'C' + c1.x + ' ' + c1.y + ' ' + c2.x + ' ' + c2.y + ' ' + B.x + ' ' + B.y;
        g.querySelectorAll('path[data-p]').forEach((p) => p.setAttribute('d', d));
        const ar = g.querySelector('.arrow');
        if (ar) {
          const ex = B.x - c2.x, ey = B.y - c2.y;
          const ang = Math.atan2(ey || (B.y - A.y), ex || (B.x - A.x)) * (180 / Math.PI);
          ar.setAttribute('transform', 'translate(' + B.x + ' ' + B.y + ') rotate(' + ang + ')');
        }
        const lb = svg.querySelector<SVGTextElement>('text[data-el="' + g.dataset.cn + '"]');
        if (lb) {
          const t = 0.5, u = 1 - t;
          const mx = u * u * u * A.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * B.x;
          const my = u * u * u * A.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * B.y;
          mids[g.dataset.cn!] = { x: mx, y: my };
        }
      });
      svg.querySelectorAll<SVGGElement>('g[data-g]').forEach((g) => {
        const P = anchor('g:' + g.dataset.g, null);
        if (P) g.setAttribute('transform', 'translate(' + P.x + ' ' + P.y + ')');
      });
      declutter(svg, mids);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [mapOk]);

  // destello que recorre cada conexión al aparecer
  useEffect(() => {
    const now = new Set(conns.filter(related).map((c) => c.id));
    const svg = svgRef.current;
    if (svg && !reduced()) {
      now.forEach((id) => {
        if (prevOn.current.has(id)) return;
        const c = CONNS.find((x) => x.id === id)!;
        const t = svg.querySelector('g[data-cn="' + id + '"] .trav');
        if (!t) return;
        setTimeout(() => { t.classList.remove('go'); void (t as SVGElement).getBoundingClientRect(); t.classList.add('go'); }, ((c.delay || 0) + 0.55) * 1000);
      });
    }
    prevOn.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conns, explore, sel]);

  const ripple = (e: React.MouseEvent, color: string) => {
    const r = document.createElement('div');
    r.className = 'ripple';
    r.style.cssText = 'left:' + e.clientX + 'px;top:' + e.clientY + 'px;--c:' + color;
    stageRef.current?.appendChild(r);
    setTimeout(() => r.remove(), 1000);
  };

  const onCard = (e: React.MouseEvent, id: ModelId) => {
    e.stopPropagation();
    ripple(e, MODEL[id].color);
    if (beat >= 8) { if (explore) setSel(sel === id ? null : id); return; }
    const act = ACTIVE_BY_BEAT[beat];
    if (SPINE[act] === id) go(beat + 1);
  };

  const selModel = sel ? MODEL[sel] : null;
  const dashedLegend = beat >= 3;

  return (
    <>
      <div ref={spacerRef} style={{ height: N * 100 + 'vh' }} aria-hidden />
      <div id="stage" ref={stageRef} onClick={() => { if (explore) setSel(null); }}>
        <div id="map" ref={mapEl} style={{ opacity: 0 }} />
        <div id="k3d" ref={k3El} style={{ opacity: 0 }} />
        <div id="wash" style={{ opacity: 0 }} />

        {/* campos conceptuales: el Hidrocéntrico queda dentro del Ecocéntrico; Biocéntrico y Límites los atraviesan */}
        <div ref={(e) => { lanes.current.bio = e; }} className={'lane bio' + (beat >= 8 ? ' on' : '')} style={{ ['--c' as string]: COLORS.bio }}>
          <span className="chip"><Bird />Biocéntrico · criterio transversal</span>
        </div>
        <div ref={(e) => { lanes.current.eco = e; }} className={'lane eco' + ((beat >= 1 && beat <= 2) || beat >= 8 ? ' on' : '')} style={{ ['--c' as string]: COLORS.cream }}>
          <span className="chip"><Leaf />{beat >= 8 ? 'Ecocéntrico · marco general' : 'Campo ecocéntrico'}</span>
        </div>
        <div ref={(e) => { lanes.current.hid = e; }} className={'lane hid' + ((beat >= 1 && beat <= 2) || beat >= 8 ? ' on' : '')} style={{ ['--c' as string]: COLORS.water }}>
          <span className="chip"><Droplets />Contenido en el Ecocéntrico</span>
        </div>

        {/* conexiones y puntos del territorio */}
        <svg id="links" ref={svgRef} width={W} height={H}>
          <g className={'cyc' + (beat === 5 || (beat === 8 && explore && sel === 'cir') ? ' on' : '')}>
            <CycleSvg cyc={cyc} />
          </g>
          {CONNS.map((c) => {
            const on = conns.includes(c) && related(c);
            const soft = beat <= 7 && c.max >= 8 && ((c.min <= 6 && beat >= c.min + 2) || (c.id[0] === 'e' && beat === 7));
            return (
              <g key={c.id} data-cn={c.id} data-a={c.a} data-b={c.b} data-bulge={c.bulge ? 1 : 0}
                className={'cn' + (on ? ' on' : '') + (c.dashed ? ' dsh' : '') + (soft ? ' soft' : '') + (beat === 8 && explore && sel && !related(c) ? ' dimS' : '')}
                style={{ ['--c' as string]: c.color, ['--dl' as string]: (on ? c.delay || 0 : 0) + 's' }}>
                {c.title && <title>{c.title}</title>}
                <path data-p className="base" pathLength={1} />
                <path data-p className="flow" pathLength={1} />
                <path data-p className="trav" pathLength={1} />
                {c.arrow && <path className="arrow" d="M-9 -5 L3 0 L-9 5 Z" />}
              </g>
            );
          })}
          {CONNS.filter((c) => c.label).map((c) => (
            <text key={'t' + c.id} data-el={c.id} className={'el' + (conns.includes(c) && related(c) ? ' on' : '')} textAnchor="middle" style={{ ['--c' as string]: c.color, ['--dl' as string]: (c.delay || 0) + 0.4 + 's' }}>{c.label}</text>
          ))}
          {(Object.keys(GEO) as GeoId[]).map((g) => (
            <g key={g} data-g={g} className={'gp' + (geoColor[g] ? ' on' : '')} style={{ ['--c' as string]: geoColor[g] || '#fff' }}>
              <circle className="gr" r="5" />
              <circle className="gd" r="3.4" />
              <text x="9" y="-7" className="gl">{GEO[g].label}</text>
            </g>
          ))}
        </svg>

        {/* inicio: una sola palabra en el centro */}
        <div ref={(e) => { cards.current.hero = e; }} className="abs hero" onClick={() => beat === 0 && go(1)} style={{ cursor: beat === 0 ? 'pointer' : 'default', pointerEvents: beat === 0 ? 'auto' : 'none' }}>
          <div className="node d0 on" style={{ ['--c' as string]: COLORS.cream, ['--ink' as string]: '#0a0a0a' }}>
            <div className="tile"><Leaf /></div>
            <div className="txt"><div className="id">MACROMODELO 01</div><div className="lb">ECOCÉNTRICO</div></div>
          </div>
        </div>
        <p ref={(e) => { cards.current.heroSub = e; }} className="herosub" style={{ top: H * 0.46 + (m ? 112 : 128) }}>
          El territorio entendido como un sistema de interdependencias entre todas las formas de vida.
        </p>
        <div id="hint" className={beat === 0 ? '' : 'hide'}><MousePointerClick />Haz clic en Ecocéntrico para comenzar</div>

        {MODELS.map((mod) => (
          <div key={mod.id} ref={(e) => { cards.current[mod.id] = e; }} data-id={mod.id}
            className={'abs node d1 on mm-' + mod.id + (explore && sel === mod.id ? ' sel' : '')}
            style={{ ['--c' as string]: mod.color, ['--ink' as string]: mod.ink, opacity: 0, cursor: 'pointer' }}
            onClick={(e) => onCard(e, mod.id)}>
            <div className="wm">{ICONS[mod.id]}</div>
            <div className="tile">{ICONS[mod.id]}</div>
            <div className="txt">
              <div className="id">MACROMODELO {mod.n}</div>
              <div className="lb">{mod.title}</div>
              <p className="dsc">{mod.text}</p>
              {mod.id === 'reg' && (
                <div className="chain" aria-label="vínculos animados">
                  {['agua', 'vegetación', 'biodiversidad', 'regulación térmica'].map((t, i) => (<span key={t} style={{ animationDelay: i * 0.9 + 's' }}>{t}</span>))}
                </div>
              )}
              {mod.id === 'com' && <span className="tag">estrategia propuesta · no es una condición comprobada</span>}
              {mod.id === 'hid' && <span className="tag blue">humedales y red hídrica según cartografía real</span>}
            </div>
          </div>
        ))}

        {/* modo explorar */}
        {beat === 8 && explore && (
          <div id="panel" className={sel ? 'on' : ''} style={{ ['--c' as string]: selModel?.color || '#fff' }}>
            {selModel ? (
              <>
                <div className="kick">{selModel.role}</div>
                <h3>{selModel.title}</h3>
                <p>{selModel.text}</p>
                <div className="kick" style={{ marginTop: 12 }}>Relaciones</div>
                <ul>{REL_TEXT[selModel.id].rel.map(([id, t]) => (<li key={id} onClick={(e) => { e.stopPropagation(); setSel(id); }}><i style={{ background: MODEL[id].color }} /><b>{MODEL[id].short}</b> · {t}</li>))}</ul>
                <div className="kick" style={{ marginTop: 12 }}>Anclajes en el territorio</div>
                <div className="geos">{REL_TEXT[selModel.id].geo.map((g) => (<span key={g}>{GEO[g].label}</span>))}</div>
              </>
            ) : (
              <div className="kick">Selecciona un macromodelo para ver sus relaciones</div>
            )}
          </div>
        )}

        <div id="bar">
          <div id="brand">
            <div className="logo"><Network /></div>
            <div><h1>Red propia · Kennedy</h1><p>Modelamiento dinámico · macromodelos territoriales</p></div>
          </div>
          {beat >= 2 && (
            <button className="btn" onClick={() => setView3d(!view3d)} title="Cambiar entre el Kennedy 3D y el mapa 2D">
              <Network />{view3d ? 'Mapa 2D' : 'Kennedy 3D'}
              {view3d && k3p < 1 && <span className="kick" style={{ marginLeft: 4 }}>{Math.round(k3p * 100)}%</span>}
            </button>
          )}
          {beat === 8 && (
            <button className={'btn pri' + (explore ? ' act' : '')} onClick={() => { setExplore(!explore); setSel(null); }}>
              <Network />{explore ? 'Salir de explorar' : 'Explorar red'}
            </button>
          )}
        </div>

        {dashedLegend && (
          <div id="legend">
            <span><svg width="26" height="8"><path d="M1 4H25" stroke="#bbb" strokeWidth="2" strokeLinecap="round" /></svg>existente</span>
            <span><svg width="26" height="8"><path d="M1 4H25" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" /></svg>propuesto</span>
            {beat >= 6 && <span><svg width="26" height="8"><path d="M1 4H25" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>tensión · EDG</span>}
            {beat >= 6 && <span><svg width="26" height="8"><path d="M1 4H25" stroke="#8e8e8e" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" /></svg>dependencia · EDG</span>}
          </div>
        )}
        <p className="attr">Cartografía © colaboradores de OpenStreetMap · UPL Decreto 555 de 2021</p>

        <div id="nav">
          <button className="btn" style={{ visibility: beat === 0 ? 'hidden' : 'visible' }} onClick={() => go(beat - 1)}><ArrowLeft />Atrás</button>
          <div className="steps">
            <div className="ticks">{STEP_LABELS.map((s, i) => (<span key={s} onClick={() => go(i)} style={{ height: i === beat ? 16 : 7, background: i <= beat ? '#f0f0f0' : '#383838' }} />))}</div>
            <span className="kick hidemob">{String(beat + 1).padStart(2, '0')} · {STEP_LABELS[beat]}</span>
          </div>
          <button className="btn" style={{ visibility: beat === N - 1 ? 'hidden' : 'visible' }} onClick={() => go(beat + 1)}>Continuar<ArrowRight /></button>
        </div>
      </div>
    </>
  );
}

function isRelated(sel: ModelId, id: ModelId) {
  if (sel === id) return true;
  if (sel === 'eco' || sel === 'lim' || sel === 'bio') return true;
  return REL_TEXT[sel].rel.some(([r]) => r === id);
}

// ------------------------------------------------------------ ciclo de circularidad
const CYC_ICON: Record<string, ReactElement> = {
  consumo: <ShoppingBasket />, residuos: <Trash2 />, aprov: <Recycle />, insumos: <PackagePlus />, prod: <Wheat />,
};
const CYC_LINES: Record<string, string[]> = {
  consumo: ['Consumo'], residuos: ['Residuos', 'orgánicos'], aprov: ['Aprovechamiento'], insumos: ['Nuevos', 'insumos'], prod: ['Producción'],
};
function CycleSvg({ cyc }: { cyc: { cx: number; cy: number; R: number; pts: { id: string; label: string; a: number; x: number; y: number }[] } }) {
  const { cx, cy, R, pts } = cyc;
  const T = 30; // mitad de la ficha
  const gapA = (T + 12) / R;
  const arcs = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const a0 = p.a + gapA;
    let a1 = q.a - gapA;
    if (a1 < a0) a1 += Math.PI * 2;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    return { d: 'M' + x0 + ' ' + y0 + 'A' + R + ' ' + R + ' 0 0 1 ' + x1 + ' ' + y1, x1, y1, ang: (a1 + Math.PI / 2) * (180 / Math.PI), prop: CYCLE_PROPOSED[i], i };
  });
  return (
    <>
      <circle cx={cx} cy={cy} r={R + T + 26} className="cycbg" />
      <circle cx={cx} cy={cy} r={R - T - 18} className="cycin" />
      {arcs.map((a) => (
        <g key={a.i} className={'cycarc' + (a.prop ? ' dsh' : '')} style={{ ['--c' as string]: COLORS.orange, ['--dl' as string]: 0.5 + a.i * 0.45 + 's' }}>
          <path d={a.d} className="base" pathLength={1} />
          <path d={a.d} className="flow" pathLength={1} />
          <path className="arrow on" d="M-9 -5 L3 0 L-9 5 Z" transform={'translate(' + a.x1 + ' ' + a.y1 + ') rotate(' + a.ang + ')'} />
        </g>
      ))}
      {pts.map((p, i) => {
        const prop = CYCLE_PROPOSED[i === 0 ? 4 : i - 1];
        const cos = Math.cos(p.a), sin = Math.sin(p.a);
        const right = cos > 0.25, left = cos < -0.25;
        const lines = CYC_LINES[p.id];
        const lx = p.x + (right ? T + 12 : left ? -T - 12 : 0);
        const ly = right || left ? p.y - (lines.length - 1) * 7 : sin < 0 ? p.y - T - 12 - (lines.length - 1) * 14 : p.y + T + 20;
        return (
          <g key={p.id} className="cycnode" style={{ ['--dl' as string]: 0.3 + i * 0.45 + 's', ['--i' as string]: i }}>
            <title>{prop ? 'Flujo propuesto' : 'Flujo existente'}: {p.label}</title>
            <rect x={p.x - T} y={p.y - T} width={T * 2} height={T * 2} rx="16" className={'cyctile' + (prop ? ' prop' : '')} />
            <g style={{ color: COLORS.orange }}>
              {cloneElement(CYC_ICON[p.id], { x: p.x - 15, y: p.y - 15, size: 30, strokeWidth: 1.8 } as object)}
            </g>
            <text x={p.x - T + 6} y={p.y - T + 14} className="cycnum">{String(i + 1).padStart(2, '0')}</text>
            <text x={lx} y={ly} textAnchor={right ? 'start' : left ? 'end' : 'middle'} className="cyclb">
              {lines.map((l, k) => (<tspan key={k} x={lx} dy={k === 0 ? 0 : 14}>{l}</tspan>))}
            </text>
          </g>
        );
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" className="cyctitle">CIRCULARIDAD</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="cycsub">ciclo de residuos orgánicos</text>
      <text x={cx} y={cy + 26} textAnchor="middle" className="cycsub">sin cantidades estimadas</text>
    </>
  );
}
