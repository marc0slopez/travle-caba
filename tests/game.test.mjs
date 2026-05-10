import assert from 'node:assert/strict';
import {
  buildGraph,
  canonicalId,
  getHint,
  normalizeHints,
  progress,
  shortestPath,
  validateGuess
} from '../web/js/game.js';

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
const hints = normalizeHints({ 'Barrio C': ['Pista C'] });
const hint = getHint(hintState, hints);
assert.equal(hint.ok, true);
assert.equal(hint.target, 'barrio_c');
assert.equal(hint.text, 'Pista C');
assert.equal(hintState.usedHintCount, 1);

console.log('game.test.mjs: ok');
