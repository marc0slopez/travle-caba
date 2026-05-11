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
import { DEFAULT_DIFFICULTY, HINTS_LIMIT } from './constants.js';

const mapContainer = document.getElementById('map-container');
const statusEl = document.getElementById('status');

function readDifficulty() {
  const params = new URLSearchParams(location.search);
  const raw = (params.get('d') || localStorage.getItem('travle_dificultad') || DEFAULT_DIFFICULTY).toLowerCase();
  return ['facil', 'medio', 'dificil'].includes(raw) ? raw : DEFAULT_DIFFICULTY;
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

    const difficulty = readDifficulty();
    const data = await loadAllData();
    const hints = normalizeHints(data.pistas);
    const names = buildDisplayNames(data.barrios);
    let state = createGame(data.relaciones, difficulty);

    const label = (id) => names[canonicalId(id)] || displayName(id);
    const autocompleteItems = () => Array.from(state.graph.keys())
      .filter((id) => id !== state.start && id !== state.end)
      .map((id) => ({ id, label: label(id) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));

    function syncHeader() {
      UI.setPartidaInfo(label(state.start));
      UI.setLlegada(label(state.end));
      UI.updateAciertos(progress(state));
    }

    function drawInitialRoute() {
      Graphs.clearHighlights();
      Graphs.highlightRoute([state.start, state.end]);
    }

    function resetGame() {
      state = createGame(data.relaciones, difficulty);
      UI.resetGameUI();
      syncHeader();
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

    async function handleGuess(rawGuess) {
      const result = validateGuess(state, rawGuess);

      if (result.type === 'empty') {
        UI.showToast(result.message, true);
        UI.triggerInputFeedback('error');
        return;
      }

      if (result.type === 'invalid') {
        UI.showToast(result.message, true);
        UI.addGuessResult(rawGuess, 'incorrect', result.id);
        UI.triggerInputFeedback('error');
        UI.clearInput();
        return;
      }

      if (result.type === 'revealed' || result.type === 'duplicate' || result.type === 'finished') {
        UI.showToast(result.message, result.type !== 'duplicate');
        UI.clearInput();
        return;
      }

      if (result.type === 'correct') {
        UI.showStatus('Correcto: ' + label(result.id), 'success');
        Graphs.highlightNode(result.id, true);
        UI.addGuessResult(label(result.id), 'correct', result.id);
        UI.triggerInputFeedback('success');
        UI.updateAciertos(progress(state));
        UI.clearInput();

        if (result.finished) {
          UI.showStatus('Ruta completada. Felicitaciones.', 'success');
          revealRoute();
          UI.startWinAnimation();
          UI.showEndGame({
            title: 'Ruta completada',
            message: 'Elegí una nueva ruta o cambiá la dificultad para seguir jugando.',
            tone: 'success'
          });
        }
        return;
      }

      if (result.type === 'wrong') {
        UI.showStatus('Incorrecto: ' + label(result.id), 'error');
        Graphs.highlightNode(result.id, false);
        UI.addGuessResult(label(result.id), 'incorrect', result.id);
        UI.triggerInputFeedback('error');
        UI.clearInput();
      }
    }

    UI.setupUI();
    UI.registerHandlers({
      onGuess: handleGuess,
      onSilhouette: () => {
        if (state.usedHintCount >= HINTS_LIMIT) {
          UI.showToast('No quedan pistas disponibles.', true);
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
      },
      onHint: () => {
        if (state.usedHintCount >= HINTS_LIMIT) {
          UI.showToast('No quedan pistas disponibles.', true);
          return;
        }

        const hint = getHint(state, hints);
        if (!hint.ok) {
          UI.showToast(hint.message, true);
          return;
        }

        UI.showHint(hint.text);
      },
      onReset: () => UI.showHintList(state.revealedHints),
      onGiveUp: () => {
        state.status = 'gave_up';
        revealRoute();
        UI.startDefeatAnimation();
        UI.showStatus('Esta era la ruta correcta.', 'error');
        UI.showEndGame({
          title: 'Ruta revelada',
          message: 'Elegí una nueva ruta o cambiá la dificultad para seguir jugando.',
          tone: 'error'
        });
      },
      onNewRoute: resetGame,
      onHistoryClick: (id, status) => {
        Graphs.toggleHighlight(id, status === 'correct');
      }
    });

    Graphs.renderMap(mapContainer, null, data.barrios, drawInitialRoute);
    syncHeader();
    UI.setupAutocomplete(autocompleteItems(), handleGuess);
    UI.clearInput();
    setStatus('');
  } catch (error) {
    console.error(error);
    setStatus('Error inicializando el juego: ' + error.message, 'error');
  }
}
