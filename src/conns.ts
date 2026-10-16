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
(['burro', 'vaca', 'techo'] as GeoId[]).forEach((g, i) => add({ id: 'h-' + g, a: 'c:hid:r', b: 'g:' + g, color: C.water, min: 2, max: 8, delay: 0.6 + i * 0.65, models: ['hid'] }));

// ---- Regenerativo: corredores existentes (rondas) y propuestos (conexión conceptual)
add({ id: 'r-ronda', a: 'c:reg:r', b: 'g:fucha', color: C.green, min: 3, max: 8, delay: 0.5, models: ['reg'], title: 'Ronda hídrica del Río Fucha: corredor existente (NOD-EEP04)' });
add({ id: 'r-hub', a: 'c:reg:r', b: 'g:hub', color: C.green, dashed: true, min: 3, max: 8, delay: 1.1, models: ['reg'], title: 'Corredor propuesto El Burro – La Vaca – Techo (NOD-EEP09): hipótesis, no existe como corredor' });
(['burro', 'vaca', 'techo'] as GeoId[]).forEach((g, i) => add({ id: 'r-' + g, a: 'g:hub', b: 'g:' + g, color: C.green, dashed: true, arrow: true, min: 3, max: 8, delay: 1.6 + i * 0.5, models: ['reg'], title: arista('EDG-5' + (i + 1)).razon }));

// ---- Comercio ecológico y autonomía territorial
add({ id: 'c-cora', a: 'c:com:r', b: 'g:corabastos', color: C.earth, min: 4, max: 8, delay: 0.5, models: ['com'] });
add({ id: 'c-patio', a: 'c:com:r', b: 'g:patio', color: C.earth, min: 4, max: 8, delay: 0.9, models: ['com'] });
add({ id: 'c-art', a: 'g:patio', b: 'g:corabastos', color: C.earth, dashed: true, min: 4, max: 8, delay: 1.4, models: ['com'], label: 'articulación propuesta' });

// ---- Circularidad: se conecta al ciclo y el ciclo a Corabastos
add({ id: 'ci-ring', a: 'c:cir:r', b: 'x:ringL', color: C.orange, min: 5, max: 5, delay: 0.5, models: ['cir'] });
add({ id: 'ci-cora', a: 'x:residuos', b: 'g:corabastos', color: C.orange, min: 5, max: 5, delay: 1.2, models: ['cir'], title: 'Generación de residuos orgánicos en Corabastos (NOD-ECO01)' });
add({ id: 'ci-net', a: 'c:cir:r', b: 'g:corabastos', color: C.orange, min: 8, max: 8, delay: 0.5, models: ['cir'] });

// ---- Límites ecológicos: tensiones y dependencias del Excel del proyecto
add({ id: 'l-cali', a: 'c:lim:r', b: 'g:cali', color: C.grey, min: 6, max: 8, delay: 0.4, models: ['lim'] });
add({ id: 'l-13', a: 'c:lim:r', b: 'g:calle13', color: C.grey, min: 6, max: 8, delay: 0.6, models: ['lim'] });
LIMIT_EDGES.forEach((e, i) => {
  const dep = isDependency(e.id);
  add({
    id: 'e-' + e.id, a: 'g:' + e.a, b: 'g:' + e.b, color: dep ? C.grey : '#ffffff', dashed: dep, min: 6, max: 8, delay: 0.9 + i * 0.28, models: ['lim'],
    kind: dep ? 'dep' : 'tension', label: e.id, title: arista(e.id).tipo + ' (' + arista(e.id).tension + '): ' + arista(e.id).razon,
  });
});

// ---- Biocéntrico: criterio transversal sobre todo lo anterior
(['eco', 'hid', 'reg', 'com', 'cir', 'lim'] as ModelId[]).forEach((m, i) => add({ id: 'b-' + m, a: 'c:bio:l', b: 'c:' + m + ':l', color: C.bio, bulge: true, min: 7, max: 7, delay: 0.5 + i * 0.18, models: ['bio', m] }));
add({ id: 'b-tingua', a: 'c:bio:r', b: 'g:tingua', color: C.bio, min: 7, max: 8, delay: 1.3, models: ['bio'] });
add({ id: 'b-vuelo', a: 'c:bio:r', b: 'g:vuelo', color: C.bio, min: 7, max: 8, delay: 1.5, models: ['bio'] });

// ---- red propia (secuencia 8)
add({ id: 'n-hid-reg', a: 'c:hid:b', b: 'c:reg:t', color: C.water, arrow: true, min: 8, max: 8, delay: 1.0, models: ['hid', 'reg'] });
add({ id: 'n-reg-com', a: 'c:reg:b', b: 'c:com:t', color: C.green, arrow: true, min: 8, max: 8, delay: 1.2, models: ['reg', 'com'], label: 'transformación ecológica y económica' });
add({ id: 'n-com-cir', a: 'c:com:b', b: 'c:cir:t', color: C.earth, arrow: true, min: 8, max: 8, delay: 1.4, models: ['com', 'cir'] });
add({ id: 'n-lim', a: 'c:lim:t', b: 'f:eco:b', color: C.grey, min: 8, max: 8, delay: 1.6, models: ['lim', 'eco', 'hid', 'reg', 'com', 'cir'], label: 'condiciona' });
add({ id: 'n-bio', a: 'c:bio:b', b: 'f:eco:t', color: C.bio, min: 8, max: 8, delay: 1.8, models: ['bio', 'eco', 'hid', 'reg', 'com', 'cir', 'lim'], label: 'criterio de evaluación' });

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
