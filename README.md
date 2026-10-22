# Red propia · Macromodelos territoriales de Kennedy

Secuencia interactiva (React + TypeScript + GSAP/ScrollTrigger + SVG + Three.js 3D + MapLibre GL JS) de Modelamiento Dinámico territorial: diez macromodelos que articulan dimensiones ecológicas, socio-reproductivas, económicas, políticas y de **gobernanza heterárquica**, anclados a la cartografía real de Kennedy (Bogotá).

Mismo estilo de https://anasoficasca-code.github.io/problemaskennedy/ (escenario oscuro, tarjetas con ícono, conectores con flujo y constelación orbital interactiva).

## Macromodelos del Territorio

1. **Ecocéntrico** (`01`): Marco conceptual general de interdependencia vital.
2. **Hidrocéntrico** (`02`): El agua y la red hídrica como estructura que organiza el territorio.
3. **Regenerativo** (`03`): Restauración ecológica y recuperación de conectividad biológica.
4. **Comercio ecológico y autonomía territorial** (`04`): Producción local y soberanía de abastecimiento.
5. **Circularidad** (`05`): Reincorporación de residuos orgánicos en nuevos ciclos productivos.
6. **Sociocéntrico y redes de cuidado** (`06`): Sostenimiento colectivo de la vida, articulando las Manzanas del Cuidado y los recicladores de oficio como soporte del metabolismo urbano.
7. **Organización comunitaria y autogestión** (`07`): Autogestión barrial, Juntas de Acción Comunal (JAC) y colectivos ambientales como sujetos políticos de defensa territorial.
8. **Gobernanza heterárquica** (`08`): Toma de decisiones en red policéntrica y horizontal sin mando piramidal: articulación no subordinada entre comunidades de base, academia e instituciones públicas.
9. **Límites ecológicos** (`09`): Criterio transversal de capacidad de carga ecológica e infraestructural.
10. **Biocéntrico** (`10`): Criterio transversal de evaluación centrado en la continuidad de toda forma de vida.

## La Red Propia Heterárquica

Al final del recorrido (secuencia 12), el modo **Explorar red** despliega la constelación orbital completa: una estructura **heterárquica** donde ningún centro o macromodelo impone una jerarquía vertical absoluta, sino que coexisten relaciones horizontales, bucles de retroalimentación y anclajes en equipamientos y nodos reales de Kennedy.

## Fuentes y Datos
- Red hídrica, humedales (El Burro, La Vaca, Techo) y vías: OpenStreetMap (Overpass), © colaboradores de OpenStreetMap (ODbL).
- Coordenadas y relaciones (EDG-xx) de tensión/dependencia: `raw/red-pot-kennedy-visor.xlsx` (hojas NODOS y ARISTAS).
- Manzanas del Cuidado, Biblioteca El Tintal y equipamientos: Sistema Distrital de Cuidado / POT Bogotá (Decreto 555 de 2021).
- Colectivos ambientales y JAC: actores clave y custodia biocultural territorial documentada en el modelo de red.

## Desarrollo
```bash
npm install
npm run dev
npm run build   # compila a /docs (GitHub Pages)
```
