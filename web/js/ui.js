const selectors = {
  partida: '#info-partida',
  llegada: '#info-llegada',
  status: '#status',
  guessForm: '#guess-form',
  guessInput: '#guess-input',
  hintBtn: '#hint-btn',
  newRouteBtn: '#new-route-btn',
  resetBtn: '#reset-btn',
  giveUpBtn: '#giveup-btn',
  silhouetteBtn: '#silhouette-btn'
};

let initialized = false;
let autocompleteItems = [];
let handlers = {
  onGuess: null,
  onHint: null,
  onSilhouette: null,
  onNewRoute: null,
  onReset: null,
  onGiveUp: null,
  onHistoryClick: null
};

export function setupUI() {
  if (initialized) return;
  initialized = true;

  const form = document.querySelector(selectors.guessForm);
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector(selectors.guessInput);
    handlers.onGuess?.(input?.value.trim() || '');
  });

  document.querySelector(selectors.hintBtn)?.addEventListener('click', () => handlers.onHint?.());
  document.querySelector(selectors.silhouetteBtn)?.addEventListener('click', () => handlers.onSilhouette?.());
  document.querySelector(selectors.newRouteBtn)?.addEventListener('click', () => handlers.onNewRoute?.());
  document.querySelector(selectors.resetBtn)?.addEventListener('click', () => handlers.onReset?.());
  document.querySelector(selectors.giveUpBtn)?.addEventListener('click', () => {
    if (confirm('¿Seguro que querés rendirte? Se revela la ruta completa.')) {
      handlers.onGiveUp?.();
    }
  });
}

export function registerHandlers(nextHandlers) {
  handlers = { ...handlers, ...nextHandlers };
}

export function updateAciertos({ aciertos = 0, total = 0 }) {
  const el = document.getElementById('progress-counter');
  if (!el) return;

  el.textContent = aciertos + ' / ' + total + ' barrio' + (total !== 1 ? 's' : '');
  el.classList.toggle('is-complete', total > 0 && aciertos === total);
}

export function setPartidaInfo(text) {
  const el = document.querySelector(selectors.partida);
  if (el) el.textContent = text;
}

export function setLlegada(text) {
  const el = document.querySelector(selectors.llegada);
  if (el) el.textContent = text;
}

export function showStatus(text, tone = 'neutral') {
  const el = document.querySelector(selectors.status);
  if (!el) return;
  el.replaceChildren();
  el.textContent = text;
  el.dataset.tone = tone;
}

export function showHint(text) {
  showStatus(text || 'Pista no disponible.', 'hint');
}

export function showHintList(hints) {
  const el = document.querySelector(selectors.status);
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
  const input = document.querySelector(selectors.guessInput);
  if (!input) return;
  input.value = '';
  input.focus();
}

export function triggerInputFeedback(type) {
  const input = document.querySelector(selectors.guessInput);
  if (!input) return;

  input.classList.remove('input-error', 'input-success');
  input.classList.add(type === 'success' ? 'input-success' : 'input-error');
  window.setTimeout(() => input.classList.remove('input-error', 'input-success'), type === 'success' ? 900 : 350);
}

export function startWinAnimation() {
  document.body.classList.add('won-game');
  window.setTimeout(() => document.body.classList.remove('won-game'), 1400);
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
  const input = document.querySelector(selectors.guessInput);
  if (!input) return;

  input.oninput = () => {
    closeAutocomplete();
    const value = input.value.trim().toLowerCase();
    if (!value) return;

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

  document.addEventListener('click', (event) => {
    if (event.target !== input) closeAutocomplete();
  });
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

export function resetGameUI() {
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
