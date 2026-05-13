const selectors = {
  partida: '#info-partida',
  llegada: '#info-llegada',
  status: '#status',
  guessForm: '#guess-form',
  guessInput: '#guess-input',
  guessBtn: '#guess-btn',
  hintBtn: '#hint-btn',
  resetBtn: '#reset-btn',
  giveUpBtn: '#giveup-btn',
  silhouetteBtn: '#silhouette-btn',
  modeBadge: '#mode-badge',
  brandRegion: '#brand-region',
  shareResultBtn: '#share-result-btn',
  retryRouteBtn: '#retry-route-btn',
  soundToggleBtn: '#sound-toggle-btn',
  endgamePanel: '#endgame-panel',
  endgameTitle: '#endgame-title',
  endgameMessage: '#endgame-message',
  endgameNewRouteBtn: '#endgame-new-route-btn',
  tutorialModal: '#tutorial-modal',
  tutorialOpenBtn: '#instructions-btn',
  tutorialCloseBtn: '#tutorial-close-btn',
  tutorialCloseXBtn: '#tutorial-close-x-btn',
  statsModal: '#stats-modal',
  statsOpenBtn: '#stats-btn',
  statsCloseBtn: '#stats-close-btn'
};

let initialized = false;
let autocompleteItems = [];
let documentClickBound = false;
let unitLabels = { singular: 'barrio', plural: 'barrios' };

let handlers = {
  onGuess: null,
  onHint: null,
  onSilhouette: null,
  onNewRoute: null,
  onReset: null,
  onGiveUp: null,
  onHistoryClick: null,
  onShare: null,
  onRetryRoute: null,
  onTutorialClose: null,
  onSoundToggle: null
};

function get(selector) {
  return document.querySelector(selector);
}

function setRoundControlsDisabled(disabled) {
  [
    selectors.guessInput,
    selectors.guessBtn,
    selectors.hintBtn,
    selectors.silhouetteBtn,
    selectors.resetBtn,
    selectors.giveUpBtn
  ].forEach((selector) => {
    const element = get(selector);
    if (element) element.disabled = disabled;
  });
}

export function setupUI() {
  if (initialized) return;
  initialized = true;

  const form = get(selectors.guessForm);
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = get(selectors.guessInput);
    handlers.onGuess?.(input?.value.trim() || '');
  });

  get(selectors.hintBtn)?.addEventListener('click', () => handlers.onHint?.());
  get(selectors.silhouetteBtn)?.addEventListener('click', () => handlers.onSilhouette?.());
  get(selectors.endgameNewRouteBtn)?.addEventListener('click', () => handlers.onNewRoute?.());
  get(selectors.shareResultBtn)?.addEventListener('click', () => handlers.onShare?.());
  get(selectors.retryRouteBtn)?.addEventListener('click', () => handlers.onRetryRoute?.());
  get(selectors.soundToggleBtn)?.addEventListener('click', () => handlers.onSoundToggle?.());
  const closeStats = () => hideStats();
  get(selectors.statsOpenBtn)?.addEventListener('click', showStats);
  get(selectors.statsCloseBtn)?.addEventListener('click', closeStats);
  get(selectors.statsModal)?.addEventListener('click', (event) => {
    if (event.target === get(selectors.statsModal)) closeStats();
  });
  const closeTutorial = () => {
    hideTutorial();
    handlers.onTutorialClose?.();
  };
  get(selectors.tutorialOpenBtn)?.addEventListener('click', showTutorial);
  get(selectors.tutorialCloseBtn)?.addEventListener('click', closeTutorial);
  get(selectors.tutorialCloseXBtn)?.addEventListener('click', closeTutorial);
  get(selectors.tutorialModal)?.addEventListener('click', (event) => {
    if (event.target === get(selectors.tutorialModal)) closeTutorial();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const tutorialModal = get(selectors.tutorialModal);
    const statsModal = get(selectors.statsModal);
    if (tutorialModal && !tutorialModal.hidden) closeTutorial();
    if (statsModal && !statsModal.hidden) closeStats();
  });
  get(selectors.resetBtn)?.addEventListener('click', () => handlers.onReset?.());
  get(selectors.giveUpBtn)?.addEventListener('click', () => {
    if (confirm('¿Seguro que querés rendirte? Se revela la ruta completa.')) {
      handlers.onGiveUp?.();
    }
  });
}

export function registerHandlers(nextHandlers) {
  handlers = { ...handlers, ...nextHandlers };
}

export function setPackLabels(pack) {
  unitLabels = {
    singular: pack?.unitSingular || 'barrio',
    plural: pack?.unitPlural || 'barrios'
  };

  const brand = get(selectors.brandRegion);
  if (brand) brand.textContent = 'x ' + (pack?.shortLabel || 'CABA');

  const input = get(selectors.guessInput);
  if (input) input.placeholder = (unitLabels.singular.charAt(0).toUpperCase() + unitLabels.singular.slice(1)) + '...';
}

export function updateAciertos({ aciertos = 0, total = 0 }) {
  const el = document.getElementById('progress-counter');
  if (!el) return;

  el.textContent = aciertos + ' / ' + total + ' ' + (total === 1 ? unitLabels.singular : unitLabels.plural);
  el.classList.toggle('is-complete', total > 0 && aciertos === total);
}

export function setPartidaInfo(text) {
  const el = get(selectors.partida);
  if (el) el.textContent = text;
}

export function setLlegada(text) {
  const el = get(selectors.llegada);
  if (el) el.textContent = text;
}

export function setModeBadge(text, tone = 'random') {
  const el = get(selectors.modeBadge);
  if (!el) return;
  el.textContent = text;
  el.dataset.tone = tone;
}

export function setDailyModeActions(isDaily) {
  const label = isDaily ? 'Ruta libre' : 'Nueva Ruta';
  const title = isDaily
    ? 'Salir de la ruta diaria y jugar una ruta aleatoria'
    : 'Sortear una nueva ruta de esta dificultad';

  [selectors.endgameNewRouteBtn].forEach((selector) => {
    const button = get(selector);
    if (!button) return;
    button.textContent = label;
    button.title = title;
    button.dataset.modeAction = isDaily ? 'free' : 'new';
  });
}

export function showStatus(text, tone = 'neutral') {
  const el = get(selectors.status);
  if (!el) return;
  el.replaceChildren();
  el.textContent = text;
  el.dataset.tone = tone;
}

export function showHint(text, used = null, limit = null) {
  const suffix = Number.isFinite(used) && Number.isFinite(limit)
    ? ' (' + used + '/' + limit + ')'
    : '';
  showStatus((text || 'Pista no disponible.') + suffix, 'hint');
}

export function showHintList(hints) {
  const el = get(selectors.status);
  if (!el) return;

  el.replaceChildren();
  el.dataset.tone = 'hint';

  if (!hints.length) {
    el.textContent = 'Todavía no pediste pistas de texto.';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'hint-list';
  for (const hint of hints) {
    const item = document.createElement('li');
    item.textContent = hint;
    list.appendChild(item);
  }
  el.appendChild(list);
}

export function clearInput() {
  const input = get(selectors.guessInput);
  if (!input) return;
  input.value = '';
  if (!input.disabled) input.focus();
}

export function triggerInputFeedback(type) {
  const input = get(selectors.guessInput);
  if (!input || input.disabled) return;

  input.classList.remove('input-error', 'input-success');
  input.classList.add(type === 'success' ? 'input-success' : 'input-error');
  window.setTimeout(() => input.classList.remove('input-error', 'input-success'), type === 'success' ? 900 : 350);
}

export function showEndGame({ title, message, tone = 'success', canShare = true }) {
  const panel = get(selectors.endgamePanel);
  const titleEl = get(selectors.endgameTitle);
  const messageEl = get(selectors.endgameMessage);
  const shareBtn = get(selectors.shareResultBtn);

  document.body.classList.add('game-finished');
  document.body.classList.toggle('game-won', tone === 'success');
  document.body.classList.toggle('game-ended-error', tone !== 'success');
  setRoundControlsDisabled(true);

  if (panel) {
    panel.hidden = false;
    panel.dataset.tone = tone;
  }
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (shareBtn) shareBtn.hidden = !canShare;
}

export function clearEndGame() {
  const panel = get(selectors.endgamePanel);
  document.body.classList.remove('game-finished', 'game-won', 'game-ended-error', 'won-game', 'gave-up');
  setRoundControlsDisabled(false);
  if (panel) panel.hidden = true;
}

export function startWinAnimation() {
  document.body.classList.add('won-game');
  if (window.confetti) {
    window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  }
}

export function startDefeatAnimation() {
  document.body.classList.add('gave-up');
}

export function clearDefeatAnimation() {
  document.body.classList.remove('gave-up');
}

export function setupAutocomplete(items, onSelectCallback) {
  autocompleteItems = items;
  const input = get(selectors.guessInput);
  if (!input) return;

  input.oninput = () => {
    closeAutocomplete();
    const value = input.value.trim().toLowerCase();
    if (!value || input.disabled) return;

    const rect = input.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'autocomplete-list';
    menu.className = 'autocomplete-items';
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';
    menu.style.width = rect.width + 'px';

    const matches = autocompleteItems
      .filter((item) => item.label.toLowerCase().includes(value))
      .slice(0, 7);

    for (const match of matches) {
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = match.label;
      option.addEventListener('click', () => {
        input.value = match.label;
        closeAutocomplete();
        onSelectCallback?.(match.id);
      });
      menu.appendChild(option);
    }

    if (matches.length) document.body.appendChild(menu);
  };

  input.onkeydown = (event) => {
    if (event.key === 'Escape') closeAutocomplete();
  };

  if (!documentClickBound) {
    document.addEventListener('click', (event) => {
      if (event.target !== input) closeAutocomplete();
    });
    documentClickBound = true;
  }
}

function closeAutocomplete() {
  document.getElementById('autocomplete-list')?.remove();
}

export function clearGuesses() {
  const container = document.getElementById('guesses-history');
  if (container) container.replaceChildren();
}

export function addGuessResult(guess, status, id = guess) {
  const container = document.getElementById('guesses-history');
  if (!container) return;

  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'history-item';
  item.dataset.status = status;

  const count = container.children.length + 1;
  const label = document.createElement('span');
  label.textContent = count + '. ' + guess;

  const marker = document.createElement('span');
  marker.className = 'status-square ' + status;

  item.append(label, marker);
  item.addEventListener('click', () => handlers.onHistoryClick?.(id, status));
  container.appendChild(item);
  container.scrollTop = container.scrollHeight;
}

export function renderStats(summary) {
  const played = document.getElementById('stat-played');
  const wins = document.getElementById('stat-wins');
  const streak = document.getElementById('stat-streak');
  const average = document.getElementById('stat-average');
  const ranking = document.getElementById('local-ranking');

  if (played) played.textContent = String(summary.played);
  if (wins) wins.textContent = summary.wins + ' (' + summary.winRate + '%)';
  if (streak) streak.textContent = summary.streak + ' / ' + summary.bestStreak;
  if (average) average.textContent = String(summary.averageAttempts);

  if (!ranking) return;
  ranking.replaceChildren();
  const items = summary.ranking || [];
  if (!items.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Sin rutas ganadas todavía.';
    ranking.appendChild(empty);
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = item.attempts + ' intento' + (item.attempts === 1 ? '' : 's');
    const meta = document.createElement('span');
    meta.textContent = item.route + ' · ' + item.difficulty + (item.daily ? ' · diaria' : '');
    li.append(title, meta);
    ranking.appendChild(li);
  }
}

export function showTutorial() {
  const modal = get(selectors.tutorialModal);
  if (modal) modal.hidden = false;
}

export function hideTutorial() {
  const modal = get(selectors.tutorialModal);
  if (modal) modal.hidden = true;
}

export function showStats() {
  const modal = get(selectors.statsModal);
  if (modal) modal.hidden = false;
}

export function hideStats() {
  const modal = get(selectors.statsModal);
  if (modal) modal.hidden = true;
}

export function updateSoundToggle(enabled) {
  const button = get(selectors.soundToggleBtn);
  if (!button) return;
  button.textContent = enabled ? 'Sonido on' : 'Sonido off';
  button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

export function resetGameUI() {
  clearEndGame();
  clearGuesses();
  clearInput();
  clearDefeatAnimation();
  showStatus('');
  setPartidaInfo('...');
  setLlegada('...');
}

export function showToast(message, isError = false) {
  showStatus(message, isError ? 'error' : 'neutral');
}
