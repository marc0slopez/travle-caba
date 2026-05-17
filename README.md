# YENDLE

Juego argentino de rutas: conectá lugares vecinos hasta llegar de un punto a otro. El nombre viene de una forma muy nuestra de decir que estamos en camino: **yendo**.

La versión actual se concentra en dos experiencias sólidas: **YENDLE x CABA** y **YENDLE x GBA**.

## Estado actual

- App 100% frontend, lista para GitHub Pages.
- Motor de juego genérico para distintos mapas.
- Packs disponibles:
  - `caba-barrios`: barrios de la Ciudad de Buenos Aires.
  - `gba-partidos`: 24 partidos del Gran Buenos Aires en sentido administrativo, sin CABA.
- Solo modo diario: una ruta por fecha y por pack.
- La diaria busca rutas de 3 a 6 unidades intermedias.
- Al ganar o rendirse solo se puede compartir el resultado o volver al inicio.
- Estadísticas locales, racha, ranking local, tutorial, pistas, silueta y sonido opcional.

## Versiones

- **YENDLE x CABA**: barrios porteños.
- **YENDLE x GBA**: partidos del Gran Buenos Aires sin CABA.

## Estructura

```text
web/
  index.html
  yendle.html
  data/
    packs/
      caba-barrios/
      gba-partidos/
  js/
    constants.js
    dataloader.js
    game.js
    graphs.js
    main.js
    pro.js
    ui.js
scripts/
  dev-server.mjs
tests/
  game.test.mjs
```

## Desarrollo local

```bash
node scripts/dev-server.mjs
```

Después abrí `http://localhost:4173`.

## URLs útiles

- Home: `http://localhost:4173/index.html`
- YENDLE x CABA: `http://localhost:4173/yendle.html?p=caba-barrios&daily=1`
- YENDLE x GBA: `http://localhost:4173/yendle.html?p=gba-partidos&daily=1`

## Tests

```bash
node tests/game.test.mjs
```

## Datos

- CABA barrios: GeoJSON local basado en datos abiertos de la Ciudad de Buenos Aires.
- GBA partidos: GeoJSON derivado de Georef Argentina, filtrando los 24 partidos del Gran Buenos Aires administrativo y excluyendo CABA.

Las adyacencias de GBA están explícitas en `web/data/packs/gba-partidos/relaciones.json` para poder auditarlas y corregirlas manualmente.
