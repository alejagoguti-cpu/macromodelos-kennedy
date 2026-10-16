import { ARISTAS, COLORS, GEO, LIMIT_EDGES, MODEL, isDependency, type GeoId, type ModelId } from './content';

// Una conexión entre dos anclas.
//  c:<modelo>:<t|b|l|r>  borde de una tarjeta     g:<punto>  punto del territorio (se proyecta sobre el mapa)
//  x:<id>  punto del ciclo                         f:<eco|bio>:<t|b>  borde de un campo conceptual
export interface Conn {
  id: string;
  a: string;
  b: string;
  color: string;
  dashed?: boolean; // propuesto (no existente)
  arrow?: boolean;
  min: number;
  max: number;
  models: ModelId[];
  delay?: number;
  label?: string;
  title?: string;
  bulge?: boolean;
  kind?: 'tension' | 'dep';
  exp?: boolean; // solo en el modo explorar
}

const C = COLORS;
const arista = (id: string) => ARISTAS[id];

export const CONNS: Conn[] = [];
const add = (c: Conn) => CONNS.push(c);

// ---- columna vertical (secuencias 1 a 7)
add({ id: 's-eco-hid', a: 'c:eco:b', b: 'c:hid:t', color: C.cream, arrow: true, min: 1, max: 7, delay: 0.9, models: ['eco', 'hid'] });
add({ id: 's-hid-reg', a: 'c:hid:b', b: 'c:reg:t', color: C.water, arrow: true, min: 3, max: 7, delay: 0.7, models: ['hid', 'reg'] });
add({ id: 's-reg-com', a: 'c:reg:b', b: 'c:com:t', color: C.green, arrow: true, min: 4, max: 7, delay: 0.7, models: ['reg', 'com'] });
add({ id: 's-com-cir', a: 'c:com:b', b: 'c:cir:t', color: C.earth, arrow: true, min: 5, max: 7, delay: 0.7, models: ['com', 'cir'] });
add({ id: 's-cir-lim', a: 'c:cir:b', b: 'c:lim:t', color: C.orange, arrow: true, min: 6, max: 7, delay: 0.7, models: ['cir', 'lim'] });

// ---- Hidrocéntrico: humedales y red hídrica reales
(['burro', 'vaca', 'techo'] as GeoId[]).forEach((g, i) => add({ id: 'h-' + g, a: 'c:hid:r', b: 'g:' + g, color: C.water, min: 2, max: 2, delay: 0.6 + i * 0.65, models: ['hid'] }));

// ---- Regenerativo: corredores existentes (rondas) y propuestos (conexión conceptual)
add({ id: 'r-ronda', a: 'c:reg:r', b: 'g:fucha', color: C.green, min: 3, max: 3, delay: 0.5, models: ['reg'], title: 'Ronda hídrica del Río Fucha: corredor existente (NOD-EEP04)' });
add({ id: 'r-hub', a: 'c:reg:r', b: 'g:hub', color: C.green, dashed: true, min: 3, max: 3, delay: 1.1, models: ['reg'], title: 'Corredor propuesto El Burro – La Vaca – Techo (NOD-EEP09): hipótesis, no existe como corredor' });
(['burro', 'vaca', 'techo'] as GeoId[]).forEach((g, i) => add({ id: 'r-' + g, a: 'g:hub', b: 'g:' + g, color: C.green, dashed: true, arrow: true, min: 3, max: 3, delay: 1.6 + i * 0.5, models: ['reg'], title: arista('EDG-5' + (i + 1)).razon }));

// ---- Comercio ecológico y autonomía territorial
add({ id: 'c-cora', a: 'c:com:r', b: 'g:corabastos', color: C.earth, min: 4, max: 4, delay: 0.5, models: ['com'] });
add({ id: 'c-patio', a: 'c:com:r', b: 'g:patio', color: C.earth, min: 4, max: 4, delay: 0.9, models: ['com'] });
add({ id: 'c-art', a: 'g:patio', b: 'g:corabastos', color: C.earth, dashed: true, min: 4, max: 4, delay: 1.4, models: ['com'], title: 'Articulación propuesta entre Corabastos y la economía popular de Patio Bonito (estrategia, no condición comprobada)' });

// ---- Circularidad: se conecta al ciclo y el ciclo a Corabastos
add({ id: 'ci-cora', a: 'x:residuos', b: 'g:corabastos', color: C.orange, min: 5, max: 5, delay: 1.2, models: ['cir'], title: 'Generación de residuos orgánicos en Corabastos (NOD-ECO01)' });
add({ id: 'ci-net', a: 'o:cir', b: 'g:corabastos', color: C.orange, min: 8, max: 8, delay: 0.5, models: ['cir'], exp: true });

// ---- Límites ecológicos: tensiones y dependencias del Excel del proyecto
add({ id: 'l-cali', a: 'c:lim:r', b: 'g:cali', color: C.grey, min: 6, max: 6, delay: 0.4, models: ['lim'] });
LIMIT_EDGES.forEach((e, i) => {
  const dep = isDependency(e.id);
  add({
    id: 'e-' + e.id, a: 'g:' + e.a, b: 'g:' + e.b, color: dep ? C.grey : '#ffffff', dashed: dep, min: 6, max: 6, delay: 0.9 + i * 0.28, models: ['lim'],
    kind: dep ? 'dep' : 'tension', title: e.id + ' · ' + arista(e.id).tipo + ' (' + arista(e.id).tension + '): ' + arista(e.id).razon,
  });
});

// ---- Biocéntrico: criterio transversal sobre todo lo anterior (el corchete lateral se dibuja aparte)
add({ id: 'b-tingua', a: 'c:bio:r', b: 'g:tingua', color: C.bio, min: 7, max: 7, delay: 1.3, models: ['bio'] });
add({ id: 'b-vuelo', a: 'c:bio:r', b: 'g:vuelo', color: C.bio, min: 7, max: 7, delay: 1.5, models: ['bio'] });

// ---- red propia (secuencia 8): relaciones entre macromodelos
add({ id: 'n-eco-hid', a: 'o:eco', b: 'o:hid', color: C.cream, arrow: true, min: 8, max: 8, delay: 0.9, models: ['eco', 'hid'], title: 'El Hidrocéntrico está contenido dentro del enfoque Ecocéntrico' });
add({ id: 'n-hid-reg', a: 'o:hid', b: 'o:reg', color: C.water, arrow: true, min: 8, max: 8, delay: 1.2, models: ['hid', 'reg'] });
add({ id: 'n-reg-com', a: 'o:reg', b: 'o:com', color: C.green, arrow: true, min: 8, max: 8, delay: 1.5, models: ['reg', 'com'], label: 'transformación ecológica y económica' });
add({ id: 'n-com-cir', a: 'o:com', b: 'o:cir', color: C.earth, arrow: true, min: 8, max: 8, delay: 1.8, models: ['com', 'cir'] });

// red propia: las mismas relaciones espaciales; las que unen dos puntos del territorio solo al explorar
for (const o of CONNS.slice()) {
  if (o.max === 8 || !(o.a.startsWith('g:') || o.b.startsWith('g:')) || o.a.startsWith('x:')) continue;
  add({ ...o, id: o.id + '-n', a: o.a.startsWith('c:') ? 'o:' + o.a.split(':')[1] : o.a, min: 8, max: 8, exp: true });
}

// relaciones narradas por macromodelo (modo explorar)
export const REL_TEXT: Record<ModelId, { rel: [ModelId, string][]; geo: GeoId[] }> = {
  eco: { rel: [['hid', 'contiene al Hidrocéntrico'], ['reg', 'enmarca la regeneración'], ['com', 'enmarca el comercio ecológico'], ['cir', 'enmarca la circularidad']], geo: ['burro', 'vaca', 'techo', 'corabastos'] },
  hid: { rel: [['eco', 'está contenido en el Ecocéntrico'], ['reg', 'el agua soporta la regeneración']], geo: ['burro', 'vaca', 'techo'] },
  reg: { rel: [['hid', 'se apoya en la red hídrica'], ['com', 'transformación ecológica → económica']], geo: ['fucha', 'hub', 'burro', 'vaca', 'techo'] },
  com: { rel: [['reg', 'recibe la transformación ecológica'], ['cir', 'cierra ciclos productivos']], geo: ['corabastos', 'patio'] },
  cir: { rel: [['com', 'reincorpora residuos a la producción']], geo: ['corabastos'] },
  lim: { rel: [['eco', 'condiciona al sistema completo'], ['com', 'ajusta actividades económicas'], ['cir', 'ajusta los ciclos']], geo: ['cali', 'calle13', 'corabastos', 'aero', 'burro', 'techo'] },
  bio: { rel: [['eco', 'criterio transversal de evaluación'], ['lim', 'orienta los límites']], geo: ['tingua', 'vuelo'] },
};
export const modelColor = (m: ModelId) => MODEL[m].color;
export { GEO };
