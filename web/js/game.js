import { DEFAULT_DIFFICULTY, DIFICULTADES, HINTS_LIMIT } from './constants.js';

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

function walkGeoCoordinates(geometry, callback) {
  if (geometry?.type === 'Polygon') {
    for (const ring of geometry.coordinates || []) {
      for (const point of ring) callback(point);
    }
  }

  if (geometry?.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates || []) {
      for (const ring of polygon) {
        for (const point of ring) callback(point);
      }
    }
  }
}

function featureCenterLonLat(feature) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  walkGeoCoordinates(feature.geometry, ([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  if (!Number.isFinite(minLon)) return null;
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}

function distanceLonLat(a, b) {
  if (!a || !b) return 1;
  const meanLat = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const dx = (a[0] - b[0]) * Math.cos(meanLat);
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy) || 1;
}

function edgeKey(a, b) {
  return a < b ? a + '|' + b : b + '|' + a;
}

export function buildRouteWeights(relaciones, geojson) {
  const centers = new Map();
  for (const feature of geojson?.features || []) {
    const id = canonicalId(feature.properties?.id || feature.properties?.name || feature.properties?.BARRIO);
    const center = featureCenterLonLat(feature);
    if (center) centers.set(id, center);
  }

  const weights = new Map();
  for (const [rawId, rawNeighbors] of Object.entries(relaciones || {})) {
    const id = canonicalId(rawId);
    for (const rawNeighbor of rawNeighbors || []) {
      const neighbor = canonicalId(rawNeighbor);
      weights.set(edgeKey(id, neighbor), distanceLonLat(centers.get(id), centers.get(neighbor)));
    }
  }
  return weights;
}

function edgeWeight(weights, a, b) {
  if (!weights) return 1;
  if (weights instanceof Map) return weights.get(edgeKey(a, b)) || 1;
  return weights[edgeKey(a, b)] || weights[a + '|' + b] || weights[b + '|' + a] || 1;
}

function blockedIntermediateSet(options = {}) {
  const ids = options.blockedIntermediateIds || options.routeRules?.blockedIntermediateIds || [];
  return new Set(ids.map(canonicalId));
}

function excludedRouteSet(options = {}) {
  const ids = options.excludedRouteIds || options.routeRules?.excludedRouteIds || [];
  return new Set(ids.map(canonicalId));
}

export function shortestPath(graph, start, end, options = {}) {
  const from = canonicalId(start);
  const to = canonicalId(end);
  if (!graph.has(from) || !graph.has(to)) return null;
  if (from === to) return [from];

  const blocked = blockedIntermediateSet(options);
  const weights = options.weights || options.routeWeights || null;
  const queue = [{ path: [from], hops: 0, distance: 0, order: 0 }];
  const best = new Map([[from, { hops: 0, distance: 0 }]]);
  let order = 1;

  while (queue.length) {
    queue.sort((a, b) => (
      a.hops - b.hops ||
      a.distance - b.distance ||
      a.order - b.order
    ));

    const current = queue.shift();
    const last = current.path[current.path.length - 1];
    if (last === to) return current.path;

    for (const next of graph.get(last) || []) {
      if (current.path.includes(next)) continue;
      if (next !== to && blocked.has(next)) continue;

      const hops = current.hops + 1;
      const distance = current.distance + edgeWeight(weights, last, next);
      const previous = best.get(next);
      if (previous && (previous.hops < hops || (previous.hops === hops && previous.distance <= distance))) {
        continue;
      }

      best.set(next, { hops, distance });
      queue.push({
        path: current.path.concat(next),
        hops,
        distance,
        order: order++
      });
    }
  }

  return null;
}

export function routesForDifficulty(graph, difficulty = DEFAULT_DIFFICULTY, options = {}) {
  const rule = options.difficultyRules?.[difficulty] || DIFICULTADES[difficulty] || DIFICULTADES[DEFAULT_DIFFICULTY];
  const excluded = excludedRouteSet(options);
  const nodes = Array.from(graph.keys()).filter((node) => !excluded.has(node));
  const routes = [];
  const fallbackRoutes = [];
  let bestFallbackScore = Infinity;

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const path = shortestPath(graph, nodes[i], nodes[j], options);
      if (!path) continue;

      const intermedios = path.length - 2;
      if (intermedios <= 0) continue;

      if (intermedios >= rule.minIntermedios && intermedios <= rule.maxIntermedios) {
        routes.push(path);
        continue;
      }

      if (rule.fallbackToClosest) {
        const score = intermedios < rule.minIntermedios
          ? rule.minIntermedios - intermedios
          : intermedios - rule.maxIntermedios;
        if (score < bestFallbackScore) {
          bestFallbackScore = score;
          fallbackRoutes.length = 0;
        }
        if (score === bestFallbackScore) fallbackRoutes.push(path);
      }
    }
  }

  return routes.length || !rule.fallbackToClosest ? routes : fallbackRoutes;
}

export function createGame(relaciones, difficulty = DEFAULT_DIFFICULTY, random = Math.random, options = {}) {
  const graph = buildGraph(relaciones);
  const routeOptions = {
    blockedIntermediateIds: options.blockedIntermediateIds || options.routeRules?.blockedIntermediateIds || [],
    excludedRouteIds: options.excludedRouteIds || options.routeRules?.excludedRouteIds || [],
    routeWeights: options.routeWeights || buildRouteWeights(relaciones, options.geojson),
    difficultyRules: options.difficultyRules || options.routeRules?.difficultyRules || null
  };
  const routes = routesForDifficulty(graph, difficulty, routeOptions);
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
    status: 'playing',
    excludedRouteIds: new Set(routeOptions.excludedRouteIds.map(canonicalId)),
    unitSingular: options.unitSingular || 'barrio',
    mapLabel: options.mapLabel || 'este mapa'
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
    return { type: 'empty', message: 'Escribí un ' + (state.unitSingular || 'barrio') + '.' };
  }

  if (state.status !== 'playing') {
    return { type: 'finished', message: 'La partida ya terminó. Pedí una nueva ruta.' };
  }

  const id = canonicalId(rawGuess);
  if (!state.graph.has(id) || state.excludedRouteIds?.has(id)) {
    return { type: 'invalid', id, message: 'Ese ' + (state.unitSingular || 'barrio') + ' no está en ' + (state.mapLabel || 'este mapa') + '.' };
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

function dynamicHint(target, used) {
  const name = displayName(target);
  const letters = name.replace(/\s+/g, '').length;

  if (!used.includes('letter')) {
    return {
      key: 'letter',
      text: 'Empieza con la letra ' + name.charAt(0) + '.'
    };
  }

  if (!used.includes('length')) {
    return {
      key: 'length',
      text: 'Tiene ' + letters + ' letras sin contar espacios.'
    };
  }

  if (!used.includes('words')) {
    return {
      key: 'words',
      text: name.includes(' ') ? 'Su nombre tiene más de una palabra.' : 'Su nombre tiene una sola palabra.'
    };
  }

  return null;
}

export function getHint(state, hints) {
  const target = getNextPendingId(state);
  if (!target) {
    return { ok: false, message: 'No quedan barrios pendientes.' };
  }

  if (state.usedHintCount >= HINTS_LIMIT) {
    return { ok: false, message: 'No quedan pistas disponibles.' };
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

  const fallback = dynamicHint(target, used);
  if (fallback) {
    used.push(fallback.key);
    state.usedHints[target] = used;
    state.usedHintCount += 1;
    state.revealedHints.push(fallback.text);
    return { ok: true, target, text: fallback.text };
  }

  return { ok: false, target, message: 'No quedan más pistas para ese ' + (state.unitSingular || 'barrio') + '.' };
}

export function markSilhouetteHint(state, target) {
  if (!target || state.usedHintCount >= HINTS_LIMIT) return false;
  const used = state.usedHints[target] || [];
  if (used.includes('silhouette')) return false;
  used.push('silhouette');
  state.usedHints[target] = used;
  state.usedHintCount += 1;
  return true;
}
