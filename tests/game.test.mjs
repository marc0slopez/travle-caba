import assert from 'node:assert/strict';
import {
  buildGraph,
  buildRouteWeights,
  canonicalId,
  createGame,
  getHint,
  normalizeHints,
  progress,
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
assert.ok(ambaPack.pistas.san_fernando[0].includes('río'));
assert.ok(ambaPack.pistas.avellaneda[0].includes('estadios'));
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

console.log('game.test.mjs: ok');

