# Red propia · Macromodelos territoriales de Kennedy

Secuencia interactiva (React + TypeScript + GSAP/ScrollTrigger + SVG + MapLibre GL JS) que continúa la presentación
de Modelamiento Dinámico: siete macromodelos (Ecocéntrico, Hidrocéntrico, Regenerativo, Comercio ecológico y autonomía
territorial, Circularidad, Límites ecológicos, Biocéntrico) que se articulan en la **Red propia** y se anclan al mapa real de Kennedy.

Mismo estilo de https://anasoficasca-code.github.io/problemaskennedy/ (escenario oscuro, tarjetas con ícono, conectores con flujo).

## Navegación
Clic en las tarjetas, botones Atrás/Continuar, flechas del teclado o scroll vertical. En la última secuencia, **Explorar red**.

## Fuentes (nada inventado)
- Red hídrica, humedales (El Burro, La Vaca, Techo) y vías: OpenStreetMap (Overpass), © colaboradores de OpenStreetMap (ODbL).
- Coordenadas y relaciones (EDG-xx) de tensión/dependencia: `raw/red-pot-kennedy-visor.xlsx` (hojas NODOS y ARISTAS).
- UPL: Decreto 555 de 2021.
- Corredor El Burro – La Vaca – Techo: **propuesto** (hipótesis NOD-EEP09), dibujado discontinuo. Rondas de Fucha/Bogotá: existentes.
- Circularidad: flujos propuestos discontinuos, sin cantidades. Límites ecológicos: sin umbrales normativos ni cuantitativos.

## Desarrollo
```
npm install
npm run dev
npm run data   # regenera public/data/geo.json y src/data/proyecto.json desde /raw
npm run build  # compila a /docs (GitHub Pages)
```
