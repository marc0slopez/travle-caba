# YENDLE

Juego argentino de rutas: conectá lugares vecinos hasta llegar de un punto a otro. El nombre viene de una forma muy nuestra de decir que estamos en camino: **yendo**.

La versión estable actual incluye **YENDLE x CABA** y una arquitectura inicial de **packs de mapas** para seguir expandiendo sin romper CABA.

## Estado actual

- App 100% frontend, lista para GitHub Pages.
- Motor de juego genérico para distintos mapas.
- Packs disponibles:
  - `caba-barrios`: barrios de la Ciudad de Buenos Aires.
  - `amba-partidos`: CABA + partidos del AMBA como unidades de juego.
  - `gba-norte-partidos`: partidos del Gran Buenos Aires Norte, sin CABA.
  - `gba-oeste-partidos`: partidos del Gran Buenos Aires Oeste, sin CABA.
  - `gba-sur-partidos`: partidos del Gran Buenos Aires Sur, sin CABA.
- Modo diario con semilla por fecha y pack.
- Rutas aleatorias por dificultad en CABA y AMBA.
- Packs GBA Norte/Oeste/Sur en modo diario único, sin nueva ruta ni reintento.
- Estadísticas locales, racha, ranking local y compartir resultado.
- Tutorial inicial, pistas, silueta y sonido opcional.

## Versiones

- **YENDLE x CABA**: barrios porteños.
- **YENDLE x AMBA**: CABA y partidos del área metropolitana.
- **YENDLE x GBA Norte**: partidos de zona norte por cordones, sin CABA.
- **YENDLE x GBA Oeste**: partidos de zona oeste por cordones, sin CABA.
- **YENDLE x GBA Sur**: partidos de zona sur por cordones, sin CABA.
- Futuro posible: **YENDLE x Comunas**, **YENDLE diario por packs**.

## Modos de juego

- CABA y AMBA mantienen rutas aleatorias por dificultad: Turista, Vecino y Taxista.
- GBA Norte, GBA Oeste y GBA Sur funcionan como juego diario: una sola ruta por fecha y pack.
- En los packs GBA no se puede pedir nueva ruta ni reintentar la misma diaria.
- La diaria busca rutas de 3 a 5 unidades intermedias cuando el grafo real de la zona lo permite; en zonas compactas usa la ruta más larga disponible para no inventar vecinos falsos.

## Estructura

```text
web/
  index.html
  yendle.html
  data/
    packs/
      caba-barrios/
      amba-partidos/
      gba-norte-partidos/
      gba-oeste-partidos/
      gba-sur-partidos/
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
- YENDLE x GBA Norte: `http://localhost:4173/yendle.html?p=gba-norte-partidos&daily=1`
- YENDLE x GBA Oeste: `http://localhost:4173/yendle.html?p=gba-oeste-partidos&daily=1`
- YENDLE x GBA Sur: `http://localhost:4173/yendle.html?p=gba-sur-partidos&daily=1`

## Tests

```bash
node tests/game.test.mjs
```

## Datos

- CABA barrios: GeoJSON local basado en datos abiertos de la Ciudad de Buenos Aires.
- AMBA partidos: GeoJSON generado desde la descarga completa de Georef Argentina (`departamentos.geojson`), filtrando partidos de Buenos Aires, más CABA construida desde el mapa local.

Las adyacencias de AMBA están explícitas en `web/data/packs/amba-partidos/relaciones.json` para poder auditarlas y corregirlas manualmente.
