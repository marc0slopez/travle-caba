import { DEFAULT_DIFFICULTY, DIFICULTADES } from './constants.js';

const ALIASES = new Map([
  ['la_boca', 'boca'],
  ['villa_general_mitre', 'villa_gral_mitre'],
  ['villa_gral_mitre', 'villa_gral_mitre'],
  ['general_mitre', 'villa_gral_mitre'],
  ['gral_mitre', 'villa_gral_mitre'],
  ['villa_mitre', 'villa_gral_mitre']
]);

const DISPLAY_NAMES = {
  agronomia: 'Agronomía',
  almagro: 'Almagro',
  balvanera: 'Balvanera',
  barracas: 'Barracas',
  belgrano: 'Belgrano',
  boca: 'La Boca',
  boedo: 'Boedo',
  caballito: 'Caballito',
  chacarita: 'Chacarita',
  coghlan: 'Coghlan',
  colegiales: 'Colegiales',
  constitucion: 'Constitución',
  flores: 'Flores',
  floresta: 'Floresta',
  liniers: 'Liniers',
  mataderos: 'Mataderos',
  monserrat: 'Monserrat',
  monte_castro: 'Monte Castro',
  nueva_pompeya: 'Nueva Pompeya',
  nunez: 'Núñez',
  palermo: 'Palermo',
  parque_avellaneda: 'Parque Avellaneda',
  parque_chacabuco: 'Parque Chacabuco',
  parque_chas: 'Parque Chas',
  parque_patricios: 'Parque Patricios',
  paternal: 'Paternal',
  puerto_madero: 'Puerto Madero',
  recoleta: 'Recoleta',
  retiro: 'Retiro',
  saavedra: 'Saavedra',
  san_cristobal: 'San Cristóbal',
  san_nicolas: 'San Nicolás',
  san_telmo: 'San Telmo',
  velez_sarsfield: 'Vélez Sarsfield',
  versalles: 'Versalles',
  villa_crespo: 'Villa Crespo',
  villa_del_parque: 'Villa del Parque',
  villa_devoto: 'Villa Devoto',
  villa_gral_mitre: 'Villa General Mitre',
  villa_lugano: 'Villa Lugano',
  villa_luro: 'Villa Luro',
  villa_ortuzar: 'Villa Ortúzar',
  villa_pueyrredon: 'Villa Pueyrredón',
  villa_real: 'Villa Real',
  villa_riachuelo: 'Villa Riachuelo',
  villa_santa_rita: 'Villa Santa Rita',
  villa_soldati: 'Villa Soldati',
  villa_urquiza: 'Villa Urquiza'
};

export function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

export function canonicalId(value) {
  const normalized = normalizeName(value);
  return ALIASES.get(normalized) || normalized;
}

export function displayName(id) {
  const canonical = canonicalId(id);
  if (DISPLAY_NAMES[canonical]) return DISPLAY_NAMES[canonical];
  return canonical
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function buildDisplayNames(geojson) {
  const names = { ...DISPLAY_NAMES };
  for (const feature of geojson?.features || []) {
    const id = canonicalId(feature.properties?.id || feature.properties?.name || feature.properties?.BARRIO);
    names[id] = DISPLAY_NAMES[id] || displayName(id);
  }
  return names;
}

export function buildGraph(relaciones) {
  const graph = new Map();

  function ensureNode(rawId) {
    const id = canonicalId(rawId);
    if (!graph.has(id)) graph.set(id, new Set());
    return id;
  }

  for (const [rawBarrio, rawVecinos] of Object.entries(relaciones || {})) {
    const barrio = ensureNode(rawBarrio);
    for (const rawVecino of rawVecinos || []) {
      const vecino = ensureNode(rawVecino);
      graph.get(barrio).add(vecino);
      graph.get(vecino).add(barrio);
    }
  }

  return graph;
}

export function shortestPath(graph, start, end) {
  const from = canonicalId(start);
  const to = canonicalId(end);
  if (!graph.has(from) || !graph.has(to)) return null;
  if (from === to) return [from];

  const queue = [[from]];
  const visited = new Set([from]);

  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];

    for (const next of graph.get(last) || []) {
      if (visited.has(next)) continue;
      const nextPath = path.concat(next);
      if (next === to) return nextPath;
      visited.add(next);
      queue.push(nextPath);
    }
  }

  return null;
}

export function routesForDifficulty(graph, difficulty = DEFAULT_DIFFICULTY) {
  const rule = DIFICULTADES[difficulty] || DIFICULTADES[DEFAULT_DIFFICULTY];
  const nodes = Array.from(graph.keys());
  const routes = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const path = shortestPath(graph, nodes[i], nodes[j]);
      if (!path) continue;
      const intermedios = path.length - 2;
      if (intermedios >= rule.minIntermedios && intermedios <= rule.maxIntermedios) {
        routes.push(path);
      }
    }
  }

  return routes;
}

export function createGame(relaciones, difficulty = DEFAULT_DIFFICULTY, random = Math.random) {
  const graph = buildGraph(relaciones);
  const routes = routesForDifficulty(graph, difficulty);
  if (!routes.length) {
    throw new Error('No hay rutas disponibles para la dificultad seleccionada.');
  }

  const route = routes[Math.floor(random() * routes.length)];
  return {
    graph,
    difficulty,
    targetPath: route,
    start: route[0],
    end: route[route.length - 1],
    guessed: new Set(),
    wrongGuesses: [],
    usedHints: {},
    revealedHints: [],
    usedHintCount: 0,
    status: 'playing'
  };
}

export function getIntermediates(state) {
  return state.targetPath.slice(1, -1);
}

export function getNextPendingId(state) {
  return getIntermediates(state).find((id) => !state.guessed.has(id)) || null;
}

export function progress(state) {
  const total = getIntermediates(state).length;
  return {
    aciertos: state.guessed.size,
    total,
    finished: total > 0 && state.guessed.size >= total
  };
}

export function validateGuess(state, rawGuess) {
  if (!rawGuess || !String(rawGuess).trim()) {
    return { type: 'empty', message: 'Escribí un barrio.' };
  }

  if (state.status !== 'playing') {
    return { type: 'finished', message: 'La partida ya terminó. Pedí una nueva ruta.' };
  }

  const id = canonicalId(rawGuess);
  if (!state.graph.has(id)) {
    return { type: 'invalid', id, message: 'Ese barrio no está en el mapa de CABA.' };
  }

  if (id === state.start || id === state.end) {
    return { type: 'revealed', id, message: 'El origen y el destino ya están revelados.' };
  }

  if (state.guessed.has(id)) {
    return { type: 'duplicate', id, message: 'Ya habías adivinado ese barrio.' };
  }

  if (getIntermediates(state).includes(id)) {
    state.guessed.add(id);
    if (progress(state).finished) state.status = 'won';
    return { type: 'correct', id, finished: state.status === 'won', message: 'Correcto.' };
  }

  state.wrongGuesses.push(id);
  return { type: 'wrong', id, message: 'No forma parte de esta ruta.' };
}

export function normalizeHints(rawHints) {
  const hints = {};
  for (const [rawName, values] of Object.entries(rawHints || {})) {
    hints[canonicalId(rawName)] = values;
  }
  return hints;
}

export function getHint(state, hints) {
  const target = getNextPendingId(state);
  if (!target) {
    return { ok: false, message: 'No quedan barrios pendientes.' };
  }

  const used = state.usedHints[target] || [];
  const available = hints[target] || [];
  const nextIndex = available.findIndex((_, index) => !used.includes(index));

  if (nextIndex >= 0) {
    used.push(nextIndex);
    state.usedHints[target] = used;
    state.usedHintCount += 1;
    const text = available[nextIndex];
    state.revealedHints.push(text);
    return { ok: true, target, text };
  }

  if (!used.includes('letter')) {
    used.push('letter');
    state.usedHints[target] = used;
    state.usedHintCount += 1;
    const text = 'Empieza con la letra ' + displayName(target).charAt(0) + '.';
    state.revealedHints.push(text);
    return { ok: true, target, text };
  }

  return { ok: false, target, message: 'No quedan más pistas para ese barrio.' };
}

export function markSilhouetteHint(state, target) {
  if (!target || state.usedHintCount >= 3) return false;
  const used = state.usedHints[target] || [];
  if (used.includes('silhouette')) return false;
  used.push('silhouette');
  state.usedHints[target] = used;
  state.usedHintCount += 1;
  return true;
}
