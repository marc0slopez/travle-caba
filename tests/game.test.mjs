import assert from 'node:assert/strict';
import {
  buildGraph,
  buildRouteWeights,
  canonicalId,
  createGame,
  getHint,
  normalizeHints,
  progress,
  routesForDifficulty,
  shortestPath,
  validateGuess
} from '../web/js/game.js';

import { seededRandom } from '../web/js/pro.js';
import { loadAllData } from '../web/js/dataloader.js';

const relaciones = {
  barrio_a: ['barrio_b'],
  barrio_b: ['barrio_a', 'barrio_c'],
  barrio_c: ['barrio_b', 'barrio_d'],
  barrio_d: ['barrio_c']
};

const graph = buildGraph(relaciones);

assert.deepEqual(shortestPath(graph, 'barrio_a', 'barrio_d'), [
  'barrio_a',
  'barrio_b',
  'barrio_c',
  'barrio_d'
]);

assert.equal(canonicalId('La Boca'), 'boca');
assert.equal(canonicalId('Villa General Mitre'), 'villa_gral_mitre');

const state = {
  graph,
  targetPath: ['barrio_a', 'barrio_b', 'barrio_c', 'barrio_d'],
  start: 'barrio_a',
  end: 'barrio_d',
  guessed: new Set(),
  wrongGuesses: [],
  usedHints: {},
  revealedHints: [],
  usedHintCount: 0,
  status: 'playing'
};

assert.equal(validateGuess(state, 'barrio_c').type, 'correct');
assert.equal(validateGuess(state, 'barrio_c').type, 'duplicate');
assert.equal(validateGuess(state, 'barrio_x').type, 'invalid');
assert.equal(validateGuess(state, 'barrio_b').type, 'correct');
assert.deepEqual(progress(state), { aciertos: 2, total: 2, finished: true });
assert.equal(state.status, 'won');

const hintState = {
  ...state,
  guessed: new Set(['barrio_b']),
  usedHints: {},
  revealedHints: [],
  usedHintCount: 0,
  status: 'playing'
};
const dailyA = createGame(relaciones, 'facil', seededRandom('daily-test'));
const dailyB = createGame(relaciones, 'facil', seededRandom('daily-test'));
assert.deepEqual(dailyA.targetPath, dailyB.targetPath);

const hints = normalizeHints({ 'Barrio C': ['Pista C'] });
const hint = getHint(hintState, hints);
assert.equal(hint.ok, true);
assert.equal(hint.target, 'barrio_c');
assert.equal(hint.text, 'Pista C');
assert.equal(hintState.usedHintCount, 1);

const cabaPack = await loadAllData('caba-barrios');
assert.equal(cabaPack.pack.id, 'caba-barrios');
assert.ok(cabaPack.barrios.features.length >= 48);
assert.ok(Object.keys(cabaPack.relaciones).length >= 48);

const ambaPack = await loadAllData('amba-partidos');
assert.equal(ambaPack.pack.id, 'amba-partidos');
assert.ok(ambaPack.barrios.features.length >= 30);
assert.ok(Object.keys(ambaPack.relaciones).includes('caba'));
assert.deepEqual(ambaPack.pack.routeRules.blockedIntermediateIds, ['caba']);
assert.deepEqual(ambaPack.pack.routeRules.excludedRouteIds, ['caba']);
assert.ok(ambaPack.pack.decorativeRegions.caba.images[0].startsWith('data:image/png;base64,'));
assert.equal(ambaPack.pistas.san_fernando.length, 3);
assert.equal(ambaPack.pistas.avellaneda.length, 3);
const sanFernandoFeature = ambaPack.barrios.features.find((feature) => feature.properties.id === 'san_fernando');
assert.equal(sanFernandoFeature.geometry.type, 'Polygon');
assert.equal(sanFernandoFeature.properties.deltaIslandsRemoved, true);

const ambaGraph = buildGraph(ambaPack.relaciones);
const ambaRouteOptions = {
  blockedIntermediateIds: ambaPack.pack.routeRules.blockedIntermediateIds,
  excludedRouteIds: ambaPack.pack.routeRules.excludedRouteIds,
  routeWeights: buildRouteWeights(ambaPack.relaciones, ambaPack.barrios)
};
const sanFernandoCanuelas = shortestPath(ambaGraph, 'san_fernando', 'canuelas', ambaRouteOptions);
assert.ok(sanFernandoCanuelas);
assert.equal(sanFernandoCanuelas.includes('caba'), false);
const ezeizaTigre = shortestPath(ambaGraph, 'ezeiza', 'tigre', ambaRouteOptions);
assert.ok(ezeizaTigre);
assert.equal(ezeizaTigre.includes('caba'), false);
assert.notDeepEqual(ezeizaTigre, ['ezeiza', 'canuelas', 'marcos_paz', 'general_rodriguez', 'pilar', 'tigre']);

for (let i = 0; i < 40; i += 1) {
  const ambaGame = createGame(ambaPack.relaciones, 'facil', seededRandom('amba-caba-hidden-' + i), {
    routeRules: ambaPack.pack.routeRules,
    geojson: ambaPack.barrios,
    unitSingular: ambaPack.pack.unitSingular,
    mapLabel: ambaPack.pack.label
  });
  assert.equal(ambaGame.targetPath.includes('caba'), false);
  assert.equal(validateGuess(ambaGame, 'CABA').type, 'invalid');
}

const expectedGbaZoneIds = {
  'gba-norte-partidos': [
    'escobar',
    'jose_c_paz',
    'malvinas_argentinas',
    'pilar',
    'san_fernando',
    'san_isidro',
    'san_martin',
    'san_miguel',
    'tigre',
    'vicente_lopez'
  ],
  'gba-oeste-partidos': [
    'general_rodriguez',
    'hurlingham',
    'ituzaingo',
    'la_matanza',
    'marcos_paz',
    'merlo',
    'moreno',
    'moron',
    'tres_de_febrero'
  ],
  'gba-sur-partidos': [
    'almirante_brown',
    'avellaneda',
    'berazategui',
    'esteban_echeverria',
    'ezeiza',
    'florencio_varela',
    'lanus',
    'lomas_de_zamora',
    'presidente_peron',
    'quilmes'
  ]
};

for (const [packId, expectedIds] of Object.entries(expectedGbaZoneIds)) {
  const zonePack = await loadAllData(packId);
  assert.equal(zonePack.pack.id, packId);
  assert.equal(zonePack.barrios.features.length, expectedIds.length);
  assert.deepEqual(zonePack.barrios.features.map((feature) => feature.properties.id).sort(), expectedIds);
  assert.equal(Object.keys(zonePack.relaciones).includes('caba'), false);
  assert.equal(zonePack.pack.defaultDifficulty, 'diaria');
  assert.equal(zonePack.pack.routeRules.dailyOnly, true);
  assert.equal(zonePack.pack.routeRules.disableNewRoute, true);
  assert.equal(zonePack.pack.routeRules.disableRetry, true);
  assert.deepEqual(zonePack.pack.routeRules.availableDifficulties, ['diaria']);
  for (const neighbors of Object.values(zonePack.relaciones)) {
    assert.equal(neighbors.includes('caba'), false);
  }

  const zoneGraph = buildGraph(zonePack.relaciones);
  const zoneRouteOptions = {
    difficultyRules: zonePack.pack.routeRules.difficultyRules,
    routeWeights: buildRouteWeights(zonePack.relaciones, zonePack.barrios)
  };
  const dailyRoutes = routesForDifficulty(zoneGraph, 'diaria', zoneRouteOptions);
  assert.ok(dailyRoutes.length > 0, packId + ' has daily routes');
  for (const route of dailyRoutes) {
    const intermedios = route.length - 2;
    assert.ok(intermedios >= 1 && intermedios <= 5, packId + ' daily route stays playable');
  }

  const zoneGameA = createGame(zonePack.relaciones, 'diaria', seededRandom(packId + ':daily'), {
    routeRules: zonePack.pack.routeRules,
    geojson: zonePack.barrios,
    unitSingular: zonePack.pack.unitSingular,
    mapLabel: zonePack.pack.label
  });
  const zoneGameB = createGame(zonePack.relaciones, 'diaria', seededRandom(packId + ':daily'), {
    routeRules: zonePack.pack.routeRules,
    geojson: zonePack.barrios,
    unitSingular: zonePack.pack.unitSingular,
    mapLabel: zonePack.pack.label
  });
  assert.deepEqual(zoneGameA.targetPath, zoneGameB.targetPath);
  assert.equal(zoneGameA.targetPath.includes('caba'), false);
}

console.log('game.test.mjs: ok');
