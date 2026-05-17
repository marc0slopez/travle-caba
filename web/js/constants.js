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
    maxIntermedios: 6
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
        maxIntermedios: 6,
        fallbackToClosest: true
      }
    }
  };
}

export const PACKS = {
  'caba-barrios': {
    id: 'caba-barrios',
    label: 'CABA Barrios',
    shortLabel: 'CABA',
    gameTitle: 'YENDLE x CABA',
    regionLabel: 'Barrios de Buenos Aires',
    mapAriaLabel: 'Mapa de barrios de CABA',
    unitSingular: 'barrio',
    unitPlural: 'barrios',
    defaultDifficulty: 'diaria',
    dataPath: 'data/packs/caba-barrios',
    routeRules: dailyOnlyRules()
  },
  'gba-partidos': {
    id: 'gba-partidos',
    label: 'GBA Partidos',
    shortLabel: 'GBA',
    gameTitle: 'YENDLE x GBA',
    regionLabel: 'Partidos del Gran Buenos Aires',
    mapAriaLabel: 'Mapa de partidos del Gran Buenos Aires sin CABA',
    unitSingular: 'partido',
    unitPlural: 'partidos',
    defaultDifficulty: 'diaria',
    dataPath: 'data/packs/gba-partidos',
    routeRules: dailyOnlyRules()
  }
};

const PACK_ALIASES = {
  'amba-partidos': 'gba-partidos',
  'gba-norte-partidos': 'gba-partidos',
  'gba-oeste-partidos': 'gba-partidos',
  'gba-sur-partidos': 'gba-partidos',
  'san-isidro-localidades': 'gba-partidos'
};

export const DEFAULT_PACK = 'caba-barrios';
export const DEFAULT_DIFFICULTY = 'diaria';
export const HINTS_LIMIT = 3;

export function resolvePackId(value) {
  const id = PACK_ALIASES[value] || value;
  return PACKS[id] ? id : DEFAULT_PACK;
}
