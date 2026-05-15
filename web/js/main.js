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
import { DEFAULT_DIFFICULTY, DEFAULT_PACK, DIFICULTADES, HINTS_LIMIT, PACKS, resolvePackId } from './constants.js';
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
  statsSummary
} from './pro.js';

const mapContainer = document.getElementById('map-container');
const statusEl = document.getElementById('status');

function readGameOptions() {
  const params = new URLSearchParams(location.search);
  const packId = resolvePackId(params.get('p') || localStorage.getItem('yendle_pack') || localStorage.getItem('travle_pack') || DEFAULT_PACK);
  const pack = PACKS[packId] || PACKS[DEFAULT_PACK];
  const dailyOnly = !!pack.routeRules?.dailyOnly;
  const rawDifficultySource = dailyOnly
    ? pack.defaultDifficulty
    : (params.get('d') || localStorage.getItem('yendle_dificultad') || localStorage.getItem('travle_dificultad') || pack.defaultDifficulty || DEFAULT_DIFFICULTY);
  const rawDifficulty = String(rawDifficultySource || DEFAULT_DIFFICULTY).toLowerCase();
  const allowedDifficulties = pack.routeRules?.availableDifficulties || ['facil', 'medio', 'dificil'];
  const fallbackDifficulty = allowedDifficulties.includes(pack.defaultDifficulty) ? pack.defaultDifficulty : allowedDifficulties[0] || DEFAULT_DIFFICULTY;
  const difficulty = allowedDifficulties.includes(rawDifficulty) ? rawDifficulty : fallbackDifficulty;
  const isDaily = dailyOnly || params.get('daily') === '1';
  localStorage.setItem('yendle_pack', packId);
  return {
    packId,
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
  const options = readGameOptions();
  const initialPack = PACKS[options.packId] || PACKS[DEFAULT_PACK];
  document.title = (initialPack.gameTitle || 'YENDLE') + ' | Juego';
  UI.setPackLabels(initialPack);
  UI.updateAciertos({ aciertos: 0, total: 0 });

  try {
    setStatus('Cargando datos...');

    const data = await loadAllData(options.packId);
    const hints = normalizeHints(data.pistas);
    const names = buildDisplayNames(data.barrios);
    let state;
    let roundAttempts = 0;
    let roundStartedAt = Date.now();
    let lastShareText = '';
    let lastResult = null;

    const pack = data.pack;
    const routeRules = pack.routeRules || {};
    document.title = (pack.gameTitle || 'YENDLE') + ' | Juego';
    const difficultyLabel = DIFICULTADES[options.difficulty]?.label || 'Turista';
    const label = (id) => names[canonicalId(id)] || displayName(id);
    const autocompleteItems = () => Array.from(state.graph.keys())
      .filter((id) => id !== state.start && id !== state.end && !state.excludedRouteIds?.has(id))
      .map((id) => ({ id, label: label(id) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));

    function randomForCurrentMode() {
      if (!options.isDaily) return Math.random;
      return seededRandom('yendle:' + options.packId + ':' + options.dateKey + ':' + options.difficulty);
    }

    function createRound() {
      state = createGame(data.relaciones, options.difficulty, randomForCurrentMode(), {
        unitSingular: pack.unitSingular,
        mapLabel: pack.label,
        routeRules: pack.routeRules,
        geojson: data.barrios
      });
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
      UI.setDailyModeActions(options.isDaily, {
        disableNewRoute: !!routeRules.disableNewRoute
      });
    }

    function syncStats() {
      UI.renderStats(statsSummary(readStats()));
    }

    function drawInitialRoute() {
      Graphs.clearHighlights();
      Graphs.highlightRoute([state.start, state.end]);
    }

    function startRandomRoute() {
      if (routeRules.dailyOnly || routeRules.disableNewRoute) {
        UI.showToast('Esta versión tiene una única ruta diaria. Mañana hay una nueva.', true);
        return;
      }
      options.isDaily = false;
      history.replaceState(null, '', 'yendle.html?p=' + encodeURIComponent(options.packId) + '&d=' + encodeURIComponent(options.difficulty));
      UI.showToast('Saliste de la ruta diaria. Ahora jugás una ruta aleatoria.');
      resetGame();
    }

    function resetCurrentRoute() {
      if (routeRules.disableRetry) {
        UI.showToast('La ruta diaria no se puede reintentar. Mañana hay una nueva.', true);
        return;
      }

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
        status: 'playing',
        excludedRouteIds: new Set(state.excludedRouteIds || []),
        unitSingular: pack.unitSingular,
        mapLabel: pack.label
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
          ? 'daily:' + options.packId + ':' + options.dateKey + ':' + options.difficulty
          : 'round:' + roundStartedAt,
        status,
        isDaily: options.isDaily,
        dateKey: options.dateKey,
        packId: options.packId,
        packLabel: pack.label,
        gameLabel: pack.gameTitle,
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
            message: routeRules.dailyOnly
              ? 'Compartí tu resultado. Mañana hay una nueva ruta diaria.'
              : options.isDaily
                ? 'Compartí, reintentá la diaria o pasá a una ruta libre.'
                : 'Compartí, reintentá esta ruta o pedí una nueva.',
            tone: 'success',
            canRetry: !routeRules.disableRetry,
            canNewRoute: !routeRules.disableNewRoute
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
          UI.showToast('No quedan ' + (pack.unitPlural || 'barrios') + ' pendientes.', true);
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
          message: routeRules.dailyOnly
            ? 'Mañana vas a tener una nueva ruta diaria para volver a intentar.'
            : options.isDaily
              ? 'Compartí el intento, reintentá la diaria o pasá a una ruta libre.'
              : 'Compartí el intento, reintentá esta ruta o pedí una nueva.',
          tone: 'error',
          canRetry: !routeRules.disableRetry,
          canNewRoute: !routeRules.disableNewRoute
        });
        playCue('giveup');
      },
      onNewRoute: () => {
        if (routeRules.disableNewRoute) {
          UI.showToast('Esta versión tiene una única ruta diaria. Mañana hay una nueva.', true);
          return;
        }
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

    UI.setPackLabels(pack);
    createRound();
    Graphs.renderMap(mapContainer, null, data.barrios, drawInitialRoute, {
      decorativeRegions: pack.decorativeRegions || {}
    });
    syncHeader();
    syncStats();
    UI.updateSoundToggle(readSoundEnabled());
    UI.setupAutocomplete(autocompleteItems(), handleGuess);
    UI.clearInput();
    setStatus('');
  } catch (error) {
    console.error(error);
    setStatus('Error inicializando el juego: ' + error.message, 'error');
  }
}
