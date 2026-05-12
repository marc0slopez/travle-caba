# YENDLE

Juego argentino de rutas: conectá lugares vecinos hasta llegar de un punto a otro. El nombre viene de una forma muy nuestra de decir que estamos en camino: **yendo**.

La versión estable actual incluye **YENDLE x CABA** y una arquitectura inicial de **packs de mapas** para seguir expandiendo sin romper CABA.

## Estado actual

- App 100% frontend, lista para GitHub Pages.
- Motor de juego genérico para distintos mapas.
- Packs disponibles:
  - `caba-barrios`: barrios de la Ciudad de Buenos Aires.
  - `amba-partidos`: CABA + partidos del AMBA como unidades de juego.
- Modo diario con semilla por fecha y pack.
- Rutas aleatorias por dificultad.
- Estadísticas locales, racha, ranking local y compartir resultado.
- Tutorial inicial, pistas, silueta y sonido opcional.

## Versiones

- **YENDLE x CABA**: barrios porteños.
- **YENDLE x AMBA**: CABA y partidos del área metropolitana.
- Futuro posible: **YENDLE x GBA**, **YENDLE x Comunas**, **YENDLE x Zona Norte**.

## Dificultades

- Turista: 1-2 unidades intermedias.
- Vecino: 3 unidades intermedias.
- Taxista: 4-5 unidades intermedias.

## Estructura

```text
web/
  index.html
  yendle.html
  data/
    packs/
      caba-barrios/
      amba-partidos/
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
- YENDLE x CABA: `http://localhost:4173/yendle.html?p=caba-barrios&d=facil`
- YENDLE x AMBA: `http://localhost:4173/yendle.html?p=amba-partidos&d=facil`

## Tests

```bash
node tests/game.test.mjs
```

## Datos

- CABA barrios: GeoJSON local basado en datos abiertos de la Ciudad de Buenos Aires.
- AMBA partidos: GeoJSON generado desde la descarga completa de Georef Argentina (`departamentos.geojson`), filtrando partidos de Buenos Aires, más CABA construida desde el mapa local.

Las adyacencias de AMBA están explícitas en `web/data/packs/amba-partidos/relaciones.json` para poder auditarlas y corregirlas manualmente.
