export const PATHS = {
  RELACIONES: 'data/relaciones.json',
  PISTAS: 'data/pistas.json',
  BARRIOS: 'data/barrios_caba.geojson'
};

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

export const DEFAULT_DIFFICULTY = 'facil';
export const HINTS_LIMIT = 3;
