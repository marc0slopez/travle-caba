# YENDLE CABA/AMBA

Adiviná la ruta entre barrios de la Ciudad y Provincia de Buenos Aires. La idea es simple: te damos un barrio de origen y uno de destino, y tenés que descubrir qué barrios intermedios conectan el camino más corto.

Este proyecto quedó preparado como app web estática CABA-only, sin backend Flask y sin datos de GBA/Zona Norte, para que pueda publicarse en GitHub Pages.

## Estado actual

- Juego 100% frontend con HTML, CSS y JavaScript modular.
- Datos locales en \`web/data/\`: relaciones, pistas y GeoJSON de barrios de CABA.
- Mapa SVG generado en el navegador desde el GeoJSON, sin Leaflet ni dependencias externas para renderizar la ciudad.
- Dificultades:
  - Turista: 1-2 barrios intermedios.
  - Vecino: 3 barrios intermedios.
  - Taxista: 4-5 barrios intermedios.

## Estructura

\`\`\`text
web/
  index.html
  travle.html
  data/
    barrios_caba.geojson
    pistas.json
    relaciones.json
  js/
    constants.js
    dataloader.js
    game.js
    graphs.js
    main.js
    ui.js
scripts/
  dev-server.mjs
tests/
  game.test.mjs
\`\`\`

## Desarrollo local

Requiere Node.js.

\`\`\`bash
node scripts/dev-server.mjs
\`\`\`

Después abrí \`http://localhost:4173\`.

## Tests

\`\`\`bash
node tests/game.test.mjs
\`\`\`

## Publicación en GitHub Pages

La app está lista para publicarse desde la carpeta \`web/\` como sitio estático. En GitHub Pages podés configurar el deploy usando esa carpeta como raíz publicada, o mover el contenido de \`web/\` a la raíz si preferís un repositorio dedicado solo al sitio.
