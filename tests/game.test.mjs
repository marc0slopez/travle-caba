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

import { DEFAULT_DIFFICULTY, DIFICULTADES, PACKS, resolvePackId } from '../web/js/constants.js';
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
assert.equal(DEFAULT_DIFFICULTY, 'diaria');
assert.equal(DIFICULTADES.diaria.maxIntermedios, 6);
assert.equal(resolvePackId('amba-partidos'), 'gba-partidos');
assert.equal(resolvePackId('gba-norte-partidos'), 'gba-partidos');
assert.deepEqual(Object.keys(PACKS).sort(), ['caba-barrios', 'gba-partidos']);

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
assert.equal(cabaPack.pack.routeRules.dailyOnly, true);
assert.equal(cabaPack.pack.routeRules.disableNewRoute, true);
assert.equal(cabaPack.pack.routeRules.disableRetry, true);
assert.ok(cabaPack.barrios.features.length >= 48);
assert.ok(Object.keys(cabaPack.relaciones).length >= 48);

const cabaGraph = buildGraph(cabaPack.relaciones);
const cabaRouteOptions = {
  difficultyRules: cabaPack.pack.routeRules.difficultyRules,
  routeWeights: buildRouteWeights(cabaPack.relaciones, cabaPack.barrios)
};
const cabaRoutes = routesForDifficulty(cabaGraph, 'diaria', cabaRouteOptions);
assert.ok(cabaRoutes.length > 0);
assert.ok(cabaRoutes.every((route) => route.length - 2 >= 3 && route.length - 2 <= 6));
const cabaDailyA = createGame(cabaPack.relaciones, 'diaria', seededRandom('caba:daily'), {
  routeRules: cabaPack.pack.routeRules,
  geojson: cabaPack.barrios,
  unitSingular: cabaPack.pack.unitSingular,
  mapLabel: cabaPack.pack.label
});
const cabaDailyB = createGame(cabaPack.relaciones, 'diaria', seededRandom('caba:daily'), {
  routeRules: cabaPack.pack.routeRules,
  geojson: cabaPack.barrios,
  unitSingular: cabaPack.pack.unitSingular,
  mapLabel: cabaPack.pack.label
});
assert.deepEqual(cabaDailyA.targetPath, cabaDailyB.targetPath);

const gbaPack = await loadAllData('gba-partidos');
assert.equal(gbaPack.pack.id, 'gba-partidos');
assert.equal(gbaPack.pack.shortLabel, 'GBA');
assert.equal(gbaPack.pack.routeRules.dailyOnly, true);
assert.equal(gbaPack.pack.routeRules.disableNewRoute, true);
assert.equal(gbaPack.pack.routeRules.disableRetry, true);
assert.equal(gbaPack.barrios.features.length, 24);
assert.equal(Object.keys(gbaPack.relaciones).includes('caba'), false);
assert.equal(gbaPack.barrios.features.some((feature) => feature.properties.id === 'caba'), false);

const expectedGbaIds = [
  'almirante_brown',
  'avellaneda',
  'berazategui',
  'esteban_echeverria',
  'ezeiza',
  'florencio_varela',
  'hurlingham',
  'ituzaingo',
  'jose_c_paz',
  'la_matanza',
  'lanus',
  'lomas_de_zamora',
  'malvinas_argentinas',
  'merlo',
  'moreno',
  'moron',
  'quilmes',
  'san_fernando',
  'san_isidro',
  'san_martin',
  'san_miguel',
  'tigre',
  'tres_de_febrero',
  'vicente_lopez'
];
assert.deepEqual(gbaPack.barrios.features.map((feature) => feature.properties.id).sort(), expectedGbaIds);
for (const neighbors of Object.values(gbaPack.relaciones)) {
  assert.equal(neighbors.includes('caba'), false);
  assert.ok(neighbors.every((neighbor) => expectedGbaIds.includes(neighbor)));
}

const gbaGraph = buildGraph(gbaPack.relaciones);
const gbaRouteOptions = {
  difficultyRules: gbaPack.pack.routeRules.difficultyRules,
  routeWeights: buildRouteWeights(gbaPack.relaciones, gbaPack.barrios)
};
const gbaRoutes = routesForDifficulty(gbaGraph, 'diaria', gbaRouteOptions);
assert.ok(gbaRoutes.length > 0);
assert.ok(gbaRoutes.every((route) => route.length - 2 >= 3 && route.length - 2 <= 6));
const gbaGameA = createGame(gbaPack.relaciones, 'diaria', seededRandom('gba:daily'), {
  routeRules: gbaPack.pack.routeRules,
  geojson: gbaPack.barrios,
  unitSingular: gbaPack.pack.unitSingular,
  mapLabel: gbaPack.pack.label
});
const gbaGameB = createGame(gbaPack.relaciones, 'diaria', seededRandom('gba:daily'), {
  routeRules: gbaPack.pack.routeRules,
  geojson: gbaPack.barrios,
  unitSingular: gbaPack.pack.unitSingular,
  mapLabel: gbaPack.pack.label
});
assert.deepEqual(gbaGameA.targetPath, gbaGameB.targetPath);
assert.equal(gbaGameA.targetPath.includes('caba'), false);
assert.equal(validateGuess(gbaGameA, 'CABA').type, 'invalid');

console.log('game.test.mjs: ok');
