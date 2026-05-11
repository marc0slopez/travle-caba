import { loadAllData } from './dataloader.js';
import * as UI from './ui.js';
import * as Graphs from './graphs.js';
import {
  buildDisplayNames,
  canonicalId,
  createGame,
  displayName,
  getHint,
  getNextPendingId,
  markSilhouetteHint,
  normalizeHints,
  progress,
  validateGuess
} from './game.js';
import { DEFAULT_DIFFICULTY, DIFICULTADES, HINTS_LIMIT } from './constants.js';
import {
  buildShareText,
  getBuenosAiresDateKey,
  markTutorialSeen,
  playCue,
  readSoundEnabled,
  readStats,
  recordResult,
  seededRandom,
  setSoundEnabled,
  shareText,
  shouldShowTutorial,
  statsSummary
} from './pro.js';

const mapContainer = document.getElementById('map-container');
const statusEl = document.getElementById('status');

function readGameOptions() {
  const params = new URLSearchParams(location.search);
  const rawDifficulty = (params.get('d') || localStorage.getItem('travle_dificultad') || DEFAULT_DIFFICULTY).toLowerCase();
  const difficulty = ['facil', 'medio', 'dificil'].includes(rawDifficulty) ? rawDifficulty : DEFAULT_DIFFICULTY;
  const isDaily = params.get('daily') === '1';
  return {
    difficulty,
    isDaily,
    dateKey: getBuenosAiresDateKey()
  };
}

function setStatus(message, tone = 'neutral') {
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  }
}

if (!mapContainer) {
  // Index page: main.js is intentionally inert there.
} else {
  init();
}

async function init() {
  try {
    setStatus('Cargando datos...');

    const options = readGameOptions();
    const data = await loadAllData();
    const hints = normalizeHints(data.pistas);
    const names = buildDisplayNames(data.barrios);
    let state;
    let roundAttempts = 0;
    let roundStartedAt = Date.now();
    let lastShareText = '';
    let lastResult = null;

    const difficultyLabel = DIFICULTADES[options.difficulty]?.label || 'Turista';
    const label = (id) => names[canonicalId(id)] || displayName(id);
    const autocompleteItems = () => Array.from(state.graph.keys())
      .filter((id) => id !== state.start && id !== state.end)
      .map((id) => ({ id, label: label(id) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));

    function randomForCurrentMode() {
      if (!options.isDaily) return Math.random;
      return seededRandom('travle-caba:' + options.dateKey + ':' + options.difficulty);
    }

    function createRound() {
      state = createGame(data.relaciones, options.difficulty, randomForCurrentMode());
      roundAttempts = 0;
      roundStartedAt = Date.now();
      lastShareText = '';
      lastResult = null;
    }

    function syncHeader() {
      UI.setPartidaInfo(label(state.start));
      UI.setLlegada(label(state.end));
      UI.updateAciertos(progress(state));
      UI.setModeBadge(
        options.isDaily ? 'Ruta diaria · ' + options.dateKey : 'Ruta aleatoria · ' + difficultyLabel,
        options.isDaily ? 'daily' : 'random'
      );
      UI.setDailyModeActions(options.isDaily);
    }

    function syncStats() {
      UI.renderStats(statsSummary(readStats()));
    }

    function drawInitialRoute() {
      Graphs.clearHighlights();
      Graphs.highlightRoute([state.start, state.end]);
    }

    function startRandomRoute() {
      options.isDaily = false;
      history.replaceState(null, '', 'travle.html?d=' + encodeURIComponent(options.difficulty));
      UI.showToast('Saliste de la ruta diaria. Ahora jugás una ruta aleatoria.');
      resetGame();
    }

    function resetCurrentRoute() {
      const route = state.targetPath.slice();
      const graph = state.graph;
      state = {
        graph,
        difficulty: options.difficulty,
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
      roundAttempts = 0;
      roundStartedAt = Date.now();
      lastShareText = '';
      lastResult = null;
      UI.resetGameUI();
      syncHeader();
      syncStats();
      drawInitialRoute();
      UI.setupAutocomplete(autocompleteItems(), handleGuess);
    }

    function resetGame() {
      createRound();
      UI.resetGameUI();
      syncHeader();
      syncStats();
      drawInitialRoute();
      UI.setupAutocomplete(autocompleteItems(), handleGuess);
    }

    function revealRoute() {
      Graphs.clearHighlights();
      Graphs.highlightRoute(state.targetPath);
      for (const id of state.targetPath.slice(1, -1)) {
        Graphs.highlightNode(id, true);
      }
    }

    function buildResult(status) {
      return {
        completionId: options.isDaily
          ? 'daily:' + options.dateKey + ':' + options.difficulty
          : 'round:' + roundStartedAt,
        status,
        isDaily: options.isDaily,
        dateKey: options.dateKey,
        difficulty: options.difficulty,
        difficultyLabel,
        attempts: roundAttempts,
        hintsUsed: state.usedHintCount,
        routeLabel: label(state.start) + ' → ' + label(state.end),
        pathLabel: state.targetPath.map(label).join(' → ')
      };
    }

    function completeRound(status) {
      lastResult = buildResult(status);
      const stats = recordResult(lastResult);
      lastShareText = buildShareText(lastResult, stats);
      syncStats();
      return lastResult;
    }

    async function handleGuess(rawGuess) {
      const result = validateGuess(state, rawGuess);

      if (result.type === 'empty') {
        UI.showToast(result.message, true);
        UI.triggerInputFeedback('error');
        playCue('error');
        return;
      }

      if (result.type === 'invalid') {
        roundAttempts += 1;
        UI.showToast(result.message, true);
        UI.addGuessResult(rawGuess, 'incorrect', result.id);
        UI.triggerInputFeedback('error');
        UI.clearInput();
        playCue('error');
        return;
      }

      if (result.type === 'revealed' || result.type === 'duplicate' || result.type === 'finished') {
        UI.showToast(result.message, result.type !== 'duplicate');
        UI.clearInput();
        return;
      }

      if (result.type === 'correct') {
        roundAttempts += 1;
        UI.showStatus('Correcto: ' + label(result.id), 'success');
        Graphs.highlightNode(result.id, true);
        UI.addGuessResult(label(result.id), 'correct', result.id);
        UI.triggerInputFeedback('success');
        UI.updateAciertos(progress(state));
        UI.clearInput();
        playCue(result.finished ? 'win' : 'success');

        if (result.finished) {
          completeRound('won');
          UI.showStatus('Ruta completada. Felicitaciones.', 'success');
          revealRoute();
          UI.startWinAnimation();
          UI.showEndGame({
            title: options.isDaily ? 'Ruta diaria completada' : 'Ruta completada',
            message: options.isDaily
              ? 'Compartí, reintentá la diaria o pasá a una ruta libre.'
              : 'Compartí, reintentá esta ruta o pedí una nueva.',
            tone: 'success'
          });
        }
        return;
      }

      if (result.type === 'wrong') {
        roundAttempts += 1;
        UI.showStatus('Incorrecto: ' + label(result.id), 'error');
        Graphs.highlightNode(result.id, false);
        UI.addGuessResult(label(result.id), 'incorrect', result.id);
        UI.triggerInputFeedback('error');
        UI.clearInput();
        playCue('error');
      }
    }

    UI.setupUI();
    UI.registerHandlers({
      onGuess: handleGuess,
      onSilhouette: () => {
        if (state.usedHintCount >= HINTS_LIMIT) {
          UI.showToast('No quedan pistas disponibles.', true);
          playCue('error');
          return;
        }

        const target = getNextPendingId(state);
        if (!target) {
          UI.showToast('No quedan barrios pendientes.', true);
          return;
        }

        if (!markSilhouetteHint(state, target)) {
          UI.showToast('La silueta de este tramo ya fue usada.', true);
          return;
        }

        Graphs.showSilhouette(target);
        UI.showToast('Silueta revelada para el próximo barrio pendiente.');
        playCue('hint');
      },
      onHint: () => {
        const hint = getHint(state, hints);
        if (!hint.ok) {
          UI.showToast(hint.message, true);
          playCue('error');
          return;
        }

        UI.showHint(hint.text, state.usedHintCount, HINTS_LIMIT);
        playCue('hint');
      },
      onReset: () => UI.showHintList(state.revealedHints),
      onGiveUp: () => {
        state.status = 'gave_up';
        completeRound('gave_up');
        revealRoute();
        UI.startDefeatAnimation();
        UI.showStatus('Esta era la ruta correcta.', 'error');
        UI.showEndGame({
          title: 'Ruta revelada',
          message: options.isDaily
            ? 'Compartí el intento, reintentá la diaria o pasá a una ruta libre.'
            : 'Compartí el intento, reintentá esta ruta o pedí una nueva.',
          tone: 'error'
        });
        playCue('giveup');
      },
      onNewRoute: () => {
        if (options.isDaily) {
          startRandomRoute();
          return;
        }
        resetGame();
      },
      onRetryRoute: resetCurrentRoute,
      onShare: async () => {
        if (!lastShareText && lastResult) lastShareText = buildShareText(lastResult, readStats());
        if (!lastShareText) {
          UI.showToast('Terminá la partida para compartir el resultado.', true);
          return;
        }
        try {
          const message = await shareText(lastShareText);
          UI.showToast(message);
        } catch {
          UI.showToast('No se pudo compartir el resultado.', true);
        }
      },
      onTutorialClose: markTutorialSeen,
      onSoundToggle: () => {
        const enabled = !readSoundEnabled();
        setSoundEnabled(enabled);
        UI.updateSoundToggle(enabled);
        if (enabled) playCue('success');
      },
      onHistoryClick: (id, status) => {
        Graphs.toggleHighlight(id, status === 'correct');
      }
    });

    createRound();
    Graphs.renderMap(mapContainer, null, data.barrios, drawInitialRoute);
    syncHeader();
    syncStats();
    UI.updateSoundToggle(readSoundEnabled());
    UI.setupAutocomplete(autocompleteItems(), handleGuess);
    UI.clearInput();
    if (shouldShowTutorial()) UI.showTutorial();
    setStatus('');
  } catch (error) {
    console.error(error);
    setStatus('Error inicializando el juego: ' + error.message, 'error');
  }
}
