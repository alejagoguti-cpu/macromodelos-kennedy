// Construye los datos del proyecto a partir de fuentes reales guardadas en /raw:
//  - OpenStreetMap (Overpass): red hídrica, humedales y vías (© colaboradores de OpenStreetMap, ODbL).
//  - red-pot-kennedy-visor.xlsx: nodos y relaciones del proyecto (coordenadas y justificación).
//  - UPL del Decreto 555 de 2021 (contexto cartográfico).
import fs from 'node:fs';
import ExcelJS from 'exceljs';

const read = (f) => JSON.parse(fs.readFileSync('raw/' + f, 'utf8'));
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const ll = (g) => g.map((p) => [r5(p.lon), r5(p.lat)]);

// ---------- agua (líneas) y cuerpos de agua (polígonos)
const ov = read('overpass-agua.json').elements;
const lines = [];
const polys = [];
const WET = { 479823059: 'vaca', 586687934: 'vaca' };
for (const e of ov) {
  if (e.type !== 'way' || !e.geometry) continue;
  const t = e.tags || {};
  if (t.waterway) {
    const kind = t.waterway === 'river' ? 'rio' : 'canal';
    lines.push({ type: 'Feature', properties: { name: t.name || '', kind }, geometry: { type: 'LineString', coordinates: ll(e.geometry) } });
  } else if (t.natural === 'water' || t.natural === 'wetland') {
    const g = ll(e.geometry);
    const a = g[0], b = g[g.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) g.push(a);
    if (g.length < 4) continue;
    polys.push({ type: 'Feature', properties: { name: t.name || '', wet: WET[e.id] || 'agua' }, geometry: { type: 'Polygon', coordinates: [g] } });
  }
}

// ---------- relaciones (El Burro, Techo): se cosen los anillos exteriores
function stitch(members) {
  const segs = members.filter((m) => m.role === 'outer' && m.geometry).map((m) => ll(m.geometry));
  const rings = [];
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
  while (segs.length) {
    let ring = segs.shift();
    let guard = 0;
    while (!same(ring[0], ring[ring.length - 1]) && guard++ < 50) {
      const end = ring[ring.length - 1];
      const i = segs.findIndex((s) => same(s[0], end) || same(s[s.length - 1], end));
      if (i < 0) break;
      const s = segs.splice(i, 1)[0];
      ring = ring.concat(same(s[0], end) ? s.slice(1) : s.slice(0, -1).reverse());
    }
    if (!same(ring[0], ring[ring.length - 1])) ring.push(ring[0]);
    if (ring.length >= 4) rings.push(ring);
  }
  return rings;
}
const REL = { 8695506: 'burro', 8695507: 'burro', 8695641: 'techo', 8694260: 'techo' };
for (const e of read('overpass-relaciones.json').elements) {
  for (const ring of stitch(e.members || [])) {
    polys.push({ type: 'Feature', properties: { name: (e.tags || {}).name || '', wet: REL[e.id] }, geometry: { type: 'Polygon', coordinates: [ring] } });
  }
}

// ---------- vías principales
const vias = read('overpass-vias.json').elements
  .filter((e) => e.geometry)
  .map((e) => ({ type: 'Feature', properties: { name: e.tags.name || '', cls: e.tags.highway }, geometry: { type: 'LineString', coordinates: ll(e.geometry) } }));

// ---------- UPL (solo las del entorno de Kennedy)
const box = [-74.25, 4.54, -74.07, 4.72];
const upl = read('upl-bogota.geojson');
const inBox = (c) => (typeof c[0] === 'number' ? c[0] > box[0] && c[0] < box[2] && c[1] > box[1] && c[1] < box[3] : c.some(inBox));
const KENNEDY = new Set(['UPL13', 'UPL14', 'UPL15', 'UPL18']);
upl.features = upl.features
  .filter((f) => inBox(f.geometry.coordinates))
  .map((f) => ({ ...f, properties: { ...f.properties, kennedy: KENNEDY.has(f.properties.CODIGO_UPL) } }));

fs.writeFileSync('public/data/geo.json', JSON.stringify({
  upl,
  agua: { type: 'FeatureCollection', features: lines },
  cuerpos: { type: 'FeatureCollection', features: polys },
  vias: { type: 'FeatureCollection', features: vias },
}));

// ---------- nodos y relaciones del Excel del proyecto
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('raw/red-pot-kennedy-visor.xlsx');
const val = (x) => (x && x.result !== undefined ? x.result : x);
const nodos = {};
wb.getWorksheet('NODOS').eachRow((row, i) => {
  if (i === 1) return;
  const v = row.values.slice(1).map(val);
  nodos[v[0].replace('NOD-', '')] = { id: v[0], nombre: v[1], capa: v[2], lat: v[12], lon: v[13] };
});
const aristas = {};
wb.getWorksheet('ARISTAS').eachRow((row, i) => {
  if (i === 1) return;
  const v = row.values.slice(1).map(val);
  aristas[v[0]] = { id: v[0], a: v[1].replace('NOD-', ''), b: v[2].replace('NOD-', ''), tipo: v[3], tension: v[6], razon: String(v[5] || '') };
});
fs.writeFileSync('src/data/proyecto.json', JSON.stringify({ nodos, aristas }));
console.log('OK', { lineas: lines.length, cuerpos: polys.length, vias: vias.length, upl: upl.features.length, nodos: Object.keys(nodos).length, aristas: Object.keys(aristas).length });
