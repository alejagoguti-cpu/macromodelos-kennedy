import { ARISTAS, COLORS, GEO, LIMIT_EDGES, MODEL, isDependency, type GeoId, type ModelId } from './content';

// Una conexión entre dos anclas.
//  c:<modelo>:<t|b|l|r>  borde de una tarjeta     g:<punto>  punto del territorio (se proyecta sobre el mapa)
//  x:<id>  punto del ciclo                         f:<eco|bio>:<t|b>  borde de un campo conceptual
export interface Conn {
  id: string;
  a: string;
  b: string;
  color: string;
  dashed?: boolean; // propuesto o relación heterárquica no subordinada
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

// ---- columna vertical (secuencias 1 a 10)
add({ id: 's-eco-hid', a: 'c:eco:b', b: 'c:hid:t', color: C.cream, arrow: true, min: 1, max: 10, delay: 0.9, models: ['eco', 'hid'] });
add({ id: 's-hid-reg', a: 'c:hid:b', b: 'c:reg:t', color: C.water, arrow: true, min: 3, max: 10, delay: 0.7, models: ['hid', 'reg'] });
add({ id: 's-reg-com', a: 'c:reg:b', b: 'c:com:t', color: C.green, arrow: true, min: 4, max: 10, delay: 0.7, models: ['reg', 'com'] });
add({ id: 's-com-cir', a: 'c:com:b', b: 'c:cir:t', color: C.earth, arrow: true, min: 5, max: 10, delay: 0.7, models: ['com', 'cir'] });
add({ id: 's-cir-soc', a: 'c:cir:b', b: 'c:soc:t', color: C.orange, arrow: true, min: 6, max: 10, delay: 0.7, models: ['cir', 'soc'] });
add({ id: 's-soc-org', a: 'c:soc:b', b: 'c:org:t', color: C.care, arrow: true, min: 7, max: 10, delay: 0.7, models: ['soc', 'org'] });
add({ id: 's-org-het', a: 'c:org:b', b: 'c:het:t', color: C.org, arrow: true, min: 8, max: 10, delay: 0.7, models: ['org', 'het'] });
add({ id: 's-het-lim', a: 'c:het:b', b: 'c:lim:t', color: C.gov, arrow: true, min: 9, max: 10, delay: 0.7, models: ['het', 'lim'] });

// ---- Hidrocéntrico: humedales y red hídrica reales (secuencia 2)
(['burro', 'vaca', 'techo'] as GeoId[]).forEach((g, i) => add({ id: 'h-' + g, a: 'c:hid:r', b: 'g:' + g, color: C.water, min: 2, max: 2, delay: 0.6 + i * 0.65, models: ['hid'] }));

// ---- Regenerativo: corredores existentes (rondas) y propuestos (secuencia 3)
add({ id: 'r-ronda', a: 'c:reg:r', b: 'g:fucha', color: C.green, min: 3, max: 3, delay: 0.5, models: ['reg'], title: 'Ronda hídrica del Río Fucha: corredor existente (NOD-EEP04)' });
add({ id: 'r-hub', a: 'c:reg:r', b: 'g:hub', color: C.green, dashed: true, min: 3, max: 3, delay: 1.1, models: ['reg'], title: 'Corredor propuesto El Burro – La Vaca – Techo (NOD-EEP09): hipótesis, no existe como corredor continuo' });
(['burro', 'vaca', 'techo'] as GeoId[]).forEach((g, i) => add({ id: 'r-' + g, a: 'g:hub', b: 'g:' + g, color: C.green, dashed: true, arrow: true, min: 3, max: 3, delay: 1.6 + i * 0.5, models: ['reg'], title: arista('EDG-5' + (i + 1))?.razon || '' }));

// ---- Comercio ecológico y autonomía territorial (secuencia 4)
add({ id: 'c-cora', a: 'c:com:r', b: 'g:corabastos', color: C.earth, min: 4, max: 4, delay: 0.5, models: ['com'] });
add({ id: 'c-patio', a: 'c:com:r', b: 'g:patio', color: C.earth, min: 4, max: 4, delay: 0.9, models: ['com'] });
add({ id: 'c-art', a: 'g:patio', b: 'g:corabastos', color: C.earth, dashed: true, min: 4, max: 4, delay: 1.4, models: ['com'], title: 'Articulación propuesta entre Corabastos y la economía popular de Patio Bonito' });

// ---- Circularidad: se conecta al ciclo y el ciclo a Corabastos (secuencia 5)
add({ id: 'ci-cora', a: 'x:residuos', b: 'g:corabastos', color: C.orange, min: 5, max: 5, delay: 1.2, models: ['cir'], title: 'Generación y aprovechamiento de residuos orgánicos en Corabastos (NOD-ECO01)' });
add({ id: 'ci-net', a: 'o:cir', b: 'g:corabastos', color: C.orange, min: 11, max: 11, delay: 0.5, models: ['cir'], exp: true });

// ---- Sociocéntrico y redes de cuidado (secuencia 6)
add({ id: 'so-cui', a: 'c:soc:r', b: 'g:cui', color: C.care, min: 6, max: 6, delay: 0.5, models: ['soc'], title: 'Manzanas del Cuidado de Kennedy (NOD-CUI01): relevo y reconocimiento del trabajo de cuidado' });
add({ id: 'so-patio', a: 'c:soc:r', b: 'g:patio', color: C.care, min: 6, max: 6, delay: 0.9, models: ['soc'], title: 'Economía popular y reciclaje en Patio Bonito (NOD-ECO03)' });
add({ id: 'so-tintal', a: 'c:soc:r', b: 'g:tintal_bib', color: C.care, min: 6, max: 6, delay: 1.3, models: ['soc'], title: 'Biblioteca Pública El Tintal (NOD-CUI02): equipamiento cultural y comunitario de encuentro' });
add({ id: 'so-art', a: 'g:cui', b: 'g:patio', color: C.care, dashed: true, min: 6, max: 6, delay: 1.6, models: ['soc'], title: 'Articulación social: los servicios de cuidado sostienen a las familias de la economía popular (EDG-21)' });

// ---- Organización comunitaria y autogestión (secuencia 7)
add({ id: 'og-jac', a: 'c:org:r', b: 'g:jac', color: C.org, min: 7, max: 7, delay: 0.5, models: ['org'], title: 'Juntas de Acción Comunal de Kennedy (NOD-ACT02): tejido barrial y autogestión histórica' });
add({ id: 'og-col', a: 'c:org:r', b: 'g:colectivos', color: C.org, min: 7, max: 7, delay: 0.9, models: ['org'], title: 'Colectivos Ambientales Comunitarios (NOD-ACT01): guardianes y defensores del agua' });
add({ id: 'og-aul', a: 'c:org:r', b: 'g:aulas', color: C.org, min: 7, max: 7, delay: 1.3, models: ['org'], title: 'Aulas Ambientales en Humedales (NOD-CUI03): educación popular y apropiación social' });
add({ id: 'og-burro', a: 'g:colectivos', b: 'g:burro', color: C.org, dashed: true, min: 7, max: 7, delay: 1.6, models: ['org'], title: 'Custodia biocultural: colectivos comunitarios defienden y restauran El Burro (EDG-22)' });
add({ id: 'og-jac-col', a: 'g:jac', b: 'g:colectivos', color: C.org, dashed: true, min: 7, max: 7, delay: 1.9, models: ['org'], title: 'Articulación de base: alianza entre organización comunal barrial y colectivos socioambientales' });

// ---- Gobernanza heterárquica (secuencia 8)
add({ id: 'gt-col', a: 'c:het:r', b: 'g:colectivos', color: C.gov, min: 8, max: 8, delay: 0.4, models: ['het'], title: 'Colectivos Comunitarios como nodo autónomo de gobernanza ecológica (NOD-ACT01)' });
add({ id: 'gt-alc', a: 'c:het:r', b: 'g:alcaldia', color: C.gov, min: 8, max: 8, delay: 0.7, models: ['het'], title: 'Alcaldía Local, SDA y EAAB como entidades de articulación pública (NOD-ACT05)' });
add({ id: 'gt-aca', a: 'c:het:r', b: 'g:academia', color: C.gov, min: 8, max: 8, delay: 1.0, models: ['het'], title: 'Jardín Botánico y Academia (U. La Salle, NOD-ACT10): coproducción de conocimiento' });
add({ id: 'gt-jac', a: 'c:het:r', b: 'g:jac', color: C.gov, min: 8, max: 8, delay: 1.3, models: ['het'], title: 'JAC de Kennedy en concertación territorial no subordinada (NOD-ACT02)' });
add({ id: 'gt-net1', a: 'g:colectivos', b: 'g:alcaldia', color: C.gov, dashed: true, min: 8, max: 8, delay: 1.7, models: ['het'], kind: 'tension', title: 'Tensión productiva y control político entre colectivos comunitarios y autoridades distritales (EDG-23)' });
add({ id: 'gt-net2', a: 'g:colectivos', b: 'g:academia', color: C.gov, dashed: true, min: 8, max: 8, delay: 2.0, models: ['het'], title: 'Alianza comunitaria y científica: monitoreo biocultural y biofiltros ciudadanos (EDG-D211)' });
add({ id: 'gt-net3', a: 'g:jac', b: 'g:alcaldia', color: C.gov, dashed: true, min: 8, max: 8, delay: 2.3, models: ['het'], kind: 'dep', title: 'Gobernanza participativa: concertación de presupuestos locales y gestión territorial de base (EDG-24)' });

// ---- Límites ecológicos: tensiones y dependencias (secuencia 9)
add({ id: 'l-cali', a: 'c:lim:r', b: 'g:cali', color: C.grey, min: 9, max: 9, delay: 0.4, models: ['lim'] });
LIMIT_EDGES.forEach((e, i) => {
  const dep = isDependency(e.id);
  add({
    id: 'e-' + e.id, a: 'g:' + e.a, b: 'g:' + e.b, color: dep ? C.grey : '#ffffff', dashed: dep, min: 9, max: 9, delay: 0.9 + i * 0.28, models: ['lim'],
    kind: dep ? 'dep' : 'tension', title: e.id + ' · ' + arista(e.id).tipo + ' (' + arista(e.id).tension + '): ' + arista(e.id).razon,
  });
});

// ---- Biocéntrico: criterio transversal de evaluación (secuencia 10)
add({ id: 'b-tingua', a: 'c:bio:r', b: 'g:tingua', color: C.bio, min: 10, max: 10, delay: 1.3, models: ['bio'] });
add({ id: 'b-vuelo', a: 'c:bio:r', b: 'g:vuelo', color: C.bio, min: 10, max: 10, delay: 1.5, models: ['bio'] });

// ---- Red propia heterárquica (secuencia 11): trama policéntrica e interdependiente entre macromodelos
add({ id: 'n-eco-hid', a: 'o:eco', b: 'o:hid', color: C.cream, arrow: true, min: 11, max: 11, delay: 0.7, models: ['eco', 'hid'], title: 'El Hidrocéntrico está contenido dentro del enfoque Ecocéntrico' });
add({ id: 'n-hid-reg', a: 'o:hid', b: 'o:reg', color: C.water, arrow: true, min: 11, max: 11, delay: 0.9, models: ['hid', 'reg'], title: 'La red hídrica estructura la regeneración ecológica' });
add({ id: 'n-reg-com', a: 'o:reg', b: 'o:com', color: C.green, arrow: true, min: 11, max: 11, delay: 1.1, models: ['reg', 'com'], label: 'transformación socioecológica' });
add({ id: 'n-com-cir', a: 'o:com', b: 'o:cir', color: C.earth, arrow: true, min: 11, max: 11, delay: 1.3, models: ['com', 'cir'], title: 'Economía local y cierre de ciclos productivos' });
add({ id: 'n-cir-soc', a: 'o:cir', b: 'o:soc', color: C.orange, arrow: true, min: 11, max: 11, delay: 1.5, models: ['cir', 'soc'], title: 'Aprovechamiento popular de residuos y economía del cuidado' });
add({ id: 'n-soc-org', a: 'o:soc', b: 'o:org', color: C.care, arrow: true, min: 11, max: 11, delay: 1.7, models: ['soc', 'org'], title: 'El cuidado barrial sostiene el poder y la organización comunitaria' });
add({ id: 'n-org-het', a: 'o:org', b: 'o:het', color: C.org, arrow: true, min: 11, max: 11, delay: 1.9, models: ['org', 'het'], label: 'articulación heterárquica' });
add({ id: 'n-het-reg', a: 'o:het', b: 'o:reg', color: C.gov, dashed: true, arrow: true, min: 11, max: 11, delay: 2.1, models: ['het', 'reg'], title: 'Acuerdos de gobernanza heterárquica para la restauración ecológica' });
add({ id: 'n-het-soc', a: 'o:het', b: 'o:soc', color: C.gov, dashed: true, arrow: true, min: 11, max: 11, delay: 2.3, models: ['het', 'soc'], title: 'Gobernanza policéntrica con prioridad en infraestructura del cuidado' });
add({ id: 'n-org-hid', a: 'o:org', b: 'o:hid', color: C.water, dashed: true, arrow: true, min: 11, max: 11, delay: 2.5, models: ['org', 'hid'], title: 'Custodia comunitaria y defensa directa del sistema hídrico' });

// Red propia: proyecciones espaciales de los puntos del territorio en el modo explorar
for (const o of CONNS.slice()) {
  if (o.max === 11 || !(o.a.startsWith('g:') || o.b.startsWith('g:')) || o.a.startsWith('x:')) continue;
  add({ ...o, id: o.id + '-n', a: o.a.startsWith('c:') ? 'o:' + o.a.split(':')[1] : o.a, min: 11, max: 11, exp: true });
}

// relaciones narradas por macromodelo (modo explorar heterárquico)
export const REL_TEXT: Record<ModelId, { rel: [ModelId, string][]; geo: GeoId[] }> = {
  eco: {
    rel: [
      ['hid', 'contiene al Hidrocéntrico'],
      ['reg', 'enmarca la regeneración ecológica'],
      ['com', 'enmarca la economía local'],
      ['soc', 'integra el cuidado como soporte de la vida'],
      ['org', 'nutre la conciencia ambiental comunitaria'],
      ['het', 'orienta la red de gobernanza compartida'],
    ],
    geo: ['burro', 'vaca', 'techo', 'corabastos', 'cui', 'colectivos'],
  },
  hid: {
    rel: [
      ['eco', 'está contenido en el Ecocéntrico'],
      ['reg', 'el agua soporta la regeneración'],
      ['org', 'los colectivos comunitarios son custodios de los humedales'],
      ['het', 'mesa de cuenca y gobernanza del agua'],
    ],
    geo: ['burro', 'vaca', 'techo', 'fucha', 'magdalena'],
  },
  reg: {
    rel: [
      ['hid', 'se apoya en la red hídrica y rondas'],
      ['com', 'transformación socioecológica y económica'],
      ['org', 'siembras y restauración comunitaria activa'],
      ['het', 'acuerdos de co-manejo ambiental'],
    ],
    geo: ['fucha', 'hub', 'burro', 'vaca', 'techo', 'aulas'],
  },
  com: {
    rel: [
      ['reg', 'recibe la transformación ecológica'],
      ['cir', 'cierra ciclos productivos'],
      ['soc', 'abastece y dinamiza la economía popular barrial'],
    ],
    geo: ['corabastos', 'patio'],
  },
  cir: {
    rel: [
      ['com', 'reincorpora residuos a la producción'],
      ['soc', 'reciclaje de base y dignificación laboral'],
    ],
    geo: ['corabastos', 'patio'],
  },
  soc: {
    rel: [
      ['cir', 'los recicladores populares articulan los flujos de materiales'],
      ['com', 'economía popular y soberanía de abastecimiento'],
      ['org', 'el tejido vecinal sostiene el cuidado cotidiano'],
      ['het', 'incidencia en el Sistema Distrital de Cuidado sin subordinación'],
    ],
    geo: ['cui', 'patio', 'tintal_bib'],
  },
  org: {
    rel: [
      ['soc', 'la comunidad organizada gestiona el cuidado barrial'],
      ['hid', 'defensa jurídica y territorial de los humedales'],
      ['reg', 'voluntariado comunitario en restauración ecológica'],
      ['het', 'sujeto político horizontal en la red de gobernanza heterárquica'],
    ],
    geo: ['jac', 'colectivos', 'aulas', 'burro'],
  },
  het: {
    rel: [
      ['org', 'articula el poder comunal sin subordinarlo jerárquicamente'],
      ['soc', 'garantiza infraestructura social y derechos de cuidado'],
      ['lim', 'pacta límites concertados al crecimiento constructivo y logístico'],
      ['hid', 'cogestión policéntrica de la cuenca hídrica'],
    ],
    geo: ['colectivos', 'alcaldia', 'academia', 'jac'],
  },
  lim: {
    rel: [
      ['eco', 'condiciona al sistema completo'],
      ['het', 'acuerdos vinculantes de capacidad de carga'],
      ['com', 'ajusta actividades económicas y logísticas'],
      ['cir', 'ajusta los ciclos de residuos y materiales'],
    ],
    geo: ['cali', 'calle13', 'corabastos', 'aero', 'burro', 'techo'],
  },
  bio: {
    rel: [
      ['eco', 'criterio transversal de evaluación'],
      ['lim', 'orienta los límites ecológicos'],
      ['het', 'reconocimiento de derechos de la naturaleza'],
    ],
    geo: ['tingua', 'vuelo'],
  },
};

export const modelColor = (m: ModelId) => MODEL[m].color;
export { GEO };
