export const DIFICULTADES = {
  facil: {
    id: 'facil',
    label: 'Turista',
    minIntermedios: 1,
    maxIntermedios: 2
  },
  medio: {
    id: 'medio',
    label: 'Vecino',
    minIntermedios: 3,
    maxIntermedios: 3
  },
  dificil: {
    id: 'dificil',
    label: 'Taxista',
    minIntermedios: 4,
    maxIntermedios: 5
  }
};

export const PACKS = {
  "caba-barrios": {
    "id": "caba-barrios",
    "label": "CABA Barrios",
    "shortLabel": "CABA",
    "gameTitle": "YENDLE x CABA",
    "regionLabel": "Barrios de Buenos Aires",
    "mapAriaLabel": "Mapa de barrios de CABA",
    "unitSingular": "barrio",
    "unitPlural": "barrios",
    "defaultDifficulty": "facil",
    "dataPath": "data/packs/caba-barrios"
  },
  "amba-partidos": {
    "id": "amba-partidos",
    "label": "AMBA Partidos",
    "shortLabel": "AMBA",
    "gameTitle": "YENDLE x AMBA",
    "regionLabel": "Partidos y CABA",
    "mapAriaLabel": "Mapa de partidos del AMBA",
    "unitSingular": "partido",
    "unitPlural": "partidos",
    "defaultDifficulty": "medio",
    "dataPath": "data/packs/amba-partidos",
    "routeRules": {
      "blockedIntermediateIds": ["caba"],
      "excludedRouteIds": ["caba"]
    },
    "decorativeRegions": {
      "caba": {
        "label": "Postales de CABA",
        "images": [
          "data/images/caba/obelo.png",
          "data/images/caba/empa frasco.png",
          "data/images/caba/caminito.png",
          "data/images/caba/teatro colon.png"
        ]
      }
    }
  }
};

export const DEFAULT_PACK = 'caba-barrios';
export const DEFAULT_DIFFICULTY = 'facil';
export const HINTS_LIMIT = 3;

export function resolvePackId(value) {
  return PACKS[value] ? value : DEFAULT_PACK;
}
