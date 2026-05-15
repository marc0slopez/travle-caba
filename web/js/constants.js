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
  },
  diaria: {
    id: 'diaria',
    label: 'Diaria',
    minIntermedios: 3,
    maxIntermedios: 5
  }
};

function dailyOnlyRules() {
  return {
    dailyOnly: true,
    disableNewRoute: true,
    disableRetry: true,
    availableDifficulties: ['diaria'],
    difficultyRules: {
      diaria: {
        minIntermedios: 3,
        maxIntermedios: 5,
        fallbackToClosest: true
      }
    }
  };
}

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
    }
  },
  "gba-norte-partidos": {
    "id": "gba-norte-partidos",
    "label": "GBA Norte",
    "shortLabel": "GBA Norte",
    "gameTitle": "YENDLE x GBA Norte",
    "regionLabel": "Partidos del Gran Buenos Aires Norte",
    "mapAriaLabel": "Mapa de partidos de GBA Norte",
    "unitSingular": "partido",
    "unitPlural": "partidos",
    "defaultDifficulty": "diaria",
    "dataPath": "data/packs/gba-norte-partidos",
    "routeRules": dailyOnlyRules()
  },
  "gba-oeste-partidos": {
    "id": "gba-oeste-partidos",
    "label": "GBA Oeste",
    "shortLabel": "GBA Oeste",
    "gameTitle": "YENDLE x GBA Oeste",
    "regionLabel": "Partidos del Gran Buenos Aires Oeste",
    "mapAriaLabel": "Mapa de partidos de GBA Oeste",
    "unitSingular": "partido",
    "unitPlural": "partidos",
    "defaultDifficulty": "diaria",
    "dataPath": "data/packs/gba-oeste-partidos",
    "routeRules": dailyOnlyRules()
  },
  "gba-sur-partidos": {
    "id": "gba-sur-partidos",
    "label": "GBA Sur",
    "shortLabel": "GBA Sur",
    "gameTitle": "YENDLE x GBA Sur",
    "regionLabel": "Partidos del Gran Buenos Aires Sur",
    "mapAriaLabel": "Mapa de partidos de GBA Sur",
    "unitSingular": "partido",
    "unitPlural": "partidos",
    "defaultDifficulty": "diaria",
    "dataPath": "data/packs/gba-sur-partidos",
    "routeRules": dailyOnlyRules()
  }
};

export const DEFAULT_PACK = 'caba-barrios';
export const DEFAULT_DIFFICULTY = 'facil';
export const HINTS_LIMIT = 3;

export function resolvePackId(value) {
  return PACKS[value] ? value : DEFAULT_PACK;
}
