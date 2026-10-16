// Contenido de la secuencia de macromodelos. Los textos de cada macromodelo vienen del guion del proyecto;
// las coordenadas y relaciones espaciales salen del Excel del proyecto (src/data/proyecto.json, hojas NODOS y ARISTAS).
import proyecto from './data/proyecto.json';

export type LngLat = [number, number];
type Nodo = { id: string; nombre: string; capa: string; lat: number; lon: number };
type Arista = { id: string; a: string; b: string; tipo: string; tension: string; razon: string };

const NODOS = proyecto.nodos as Record<string, Nodo>;
export const ARISTAS = proyecto.aristas as Record<string, Arista>;

export const P = (code: string): LngLat => [NODOS[code].lon, NODOS[code].lat];
export const NOMBRE = (code: string) => NODOS[code].nombre;

// paleta de la referencia (problemaskennedy) más el azul hídrico y el naranja de circularidad
export const COLORS = {
  cream: '#ebe5d9',
  water: '#6ea8d6',
  green: '#7fbf8e',
  earth: '#cdae67',
  orange: '#e6956a',
  grey: '#b4b4b4',
  bio: '#f0f0f0',
  ink: '#0a0a0a',
};

export type ModelId = 'eco' | 'hid' | 'reg' | 'com' | 'cir' | 'lim' | 'bio';

export interface Model {
  id: ModelId;
  n: string;
  title: string;
  short: string;
  text: string;
  color: string;
  ink: string;
  appear: number; // secuencia en la que aparece
  role: string;
}

export const MODELS: Model[] = [
  { id: 'eco', n: '01', title: 'Ecocéntrico', short: 'Ecocéntrico', color: COLORS.cream, ink: '#0a0a0a', appear: 0, role: 'Marco conceptual general',
    text: 'El territorio entendido como un sistema de interdependencias entre todas las formas de vida.' },
  { id: 'hid', n: '02', title: 'Hidrocéntrico', short: 'Hidrocéntrico', color: COLORS.water, ink: '#04121c', appear: 1, role: 'Contenido dentro del Ecocéntrico',
    text: 'El agua y la red hídrica como estructura que organiza el territorio.' },
  { id: 'reg', n: '03', title: 'Regenerativo', short: 'Regenerativo', color: COLORS.green, ink: '#04150a', appear: 3, role: 'Transformación ecológica',
    text: 'Restauración de ecosistemas degradados y recuperación de conectividad ecológica.' },
  { id: 'com', n: '04', title: 'Comercio ecológico y autonomía territorial', short: 'Comercio ecológico', color: COLORS.earth, ink: '#1a1405', appear: 4, role: 'Transformación económica',
    text: 'Fortalecimiento de la producción local y reducción de la dependencia de insumos externos.' },
  { id: 'cir', n: '05', title: 'Circularidad', short: 'Circularidad', color: COLORS.orange, ink: '#1f0d04', appear: 5, role: 'Transformación ecológica y económica',
    text: 'Los residuos orgánicos se reincorporan como insumos para nuevos ciclos productivos.' },
  { id: 'lim', n: '06', title: 'Límites ecológicos', short: 'Límites ecológicos', color: COLORS.grey, ink: '#0a0a0a', appear: 6, role: 'Criterio transversal',
    text: 'Las actividades económicas y los sistemas de movilidad deben ajustarse a la capacidad ecológica del territorio.' },
  { id: 'bio', n: '07', title: 'Biocéntrico', short: 'Biocéntrico', color: COLORS.bio, ink: '#0a0a0a', appear: 7, role: 'Criterio transversal de evaluación',
    text: 'La continuidad de las distintas formas de vida como criterio para orientar las transformaciones territoriales.' },
];
export const MODEL = Object.fromEntries(MODELS.map((m) => [m.id, m])) as Record<ModelId, Model>;

export const STEP_LABELS = ['Ecocéntrico', 'Hidrocéntrico', 'Red hídrica', 'Regenerativo', 'Comercio ecológico', 'Circularidad', 'Límites ecológicos', 'Biocéntrico', 'Red propia'];
export const N = STEP_LABELS.length;

// índice de cada macromodelo en la columna (la cámara vertical sigue al activo)
export const SPINE: ModelId[] = ['eco', 'hid', 'reg', 'com', 'cir', 'lim', 'bio'];
export const ACTIVE_BY_BEAT = [0, 1, 1, 2, 3, 4, 5, 6, -1];

// puntos del territorio (todos con coordenadas del Excel del proyecto)
export const GEO = {
  burro: { ll: P('EEP01'), label: 'El Burro' },
  vaca: { ll: P('EEP02'), label: 'La Vaca' },
  techo: { ll: P('EEP03'), label: 'Techo' },
  hub: { ll: P('EEP09'), label: 'Corredor propuesto' },
  fucha: { ll: P('EEP04'), label: 'Ronda del Fucha' },
  corabastos: { ll: P('ECO01'), label: 'Corabastos' },
  patio: { ll: P('ECO03'), label: 'Economía popular · Patio Bonito' },
  cali: { ll: P('MOV02'), label: 'Av. Ciudad de Cali' },
  americas: { ll: P('MOV03'), label: 'Av. de las Américas' },
  calle13: { ll: P('ECO05'), label: 'Corredor logístico Calle 13' },
  aero: { ll: P('AE09'), label: 'AE09 · Distrito aeroportuario' },
  tintal: { ll: P('AE15'), label: 'AE15 · Eje Tintal' },
  tingua: { ll: P('BIO01'), label: 'Tingua bogotana' },
  vuelo: { ll: P('BIO06'), label: 'Corredores de avifauna' },
  magdalena: { ll: P('EEP08'), label: 'Canal Magdalena' },
} as const;
export type GeoId = keyof typeof GEO;

// relaciones del Excel que se muestran como tensiones y dependencias (secuencia 6)
export const LIMIT_EDGES: { id: string; a: GeoId; b: GeoId }[] = [
  { id: 'EDG-15', a: 'corabastos', b: 'cali' },
  { id: 'EDG-16', a: 'cali', b: 'burro' },
  { id: 'EDG-14', a: 'corabastos', b: 'vaca' },
  { id: 'EDG-02', a: 'aero', b: 'techo' },
  { id: 'EDG-56', a: 'aero', b: 'calle13' },
  { id: 'EDG-54', a: 'magdalena', b: 'techo' },
  { id: 'EDG-04', a: 'tintal', b: 'burro' },
];
export const isDependency = (id: string) => ['Articulación funcional', 'Encadenamiento económico y plusvalía'].includes(ARISTAS[id].tipo);

// cuadros de cámara
export const BOUNDS = {
  kennedy: [-74.186, 4.606, -74.126, 4.664] as [number, number, number, number],
  humedales: [-74.168, 4.622, -74.136, 4.652] as [number, number, number, number],
  corabastos: [-74.1735, 4.6125, -74.1395, 4.6405] as [number, number, number, number],
  nucleo: [-74.1745, 4.6175, -74.1285, 4.6595] as [number, number, number, number],
};

export const CYCLE = [
  { id: 'consumo', label: 'Consumo' },
  { id: 'residuos', label: 'Residuos orgánicos' },
  { id: 'aprov', label: 'Aprovechamiento' },
  { id: 'insumos', label: 'Nuevos insumos' },
  { id: 'prod', label: 'Producción' },
];
// los flujos propuestos se distinguen de los existentes; no se estiman cantidades
export const CYCLE_PROPOSED = [false, true, true, true, false];
