const STATS_KEY = 'yendle_stats_v1';
const OLD_STATS_KEY = 'travle_caba_stats_v1';
const TUTORIAL_KEY = 'yendle_tutorial_seen_v1';
const OLD_TUTORIAL_KEY = 'travle_caba_tutorial_seen_v1';
const SOUND_KEY = 'yendle_sound_enabled_v1';
const OLD_SOUND_KEY = 'travle_caba_sound_enabled_v1';
const MAX_RANKING = 5;

function defaultStats() {
  return {
    played: 0,
    wins: 0,
    streak: 0,
    bestStreak: 0,
    totalWinAttempts: 0,
    totalHints: 0,
    dailyPlayed: 0,
    dailyWins: 0,
    dailyStreak: 0,
    dailyBestStreak: 0,
    dailyLastDate: null,
    recorded: {},
    ranking: []
  };
}

export function getBuenosAiresDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + '-' + values.month + '-' + values.day;
}

export function previousDateKey(dateKey) {
  const date = new Date(dateKey + 'T12:00:00-03:00');
  date.setDate(date.getDate() - 1);
  return getBuenosAiresDateKey(date);
}

export function hashString(input) {
  let hash = 2166136261;
  const text = String(input);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seedInput) {
  let seed = hashString(seedInput) || 1;
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function readStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATS_KEY) || localStorage.getItem(OLD_STATS_KEY) || 'null');
    return { ...defaultStats(), ...(parsed || {}) };
  } catch {
    return defaultStats();
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordResult(result) {
  const stats = readStats();
  const completionId = result.completionId;
  if (completionId && stats.recorded[completionId]) return stats;

  if (completionId) stats.recorded[completionId] = true;

  const won = result.status === 'won';
  stats.played += 1;
  stats.totalHints += result.hintsUsed || 0;

  if (won) {
    stats.wins += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    stats.totalWinAttempts += result.attempts || 0;
    stats.ranking.push({
      date: result.dateKey,
      difficulty: result.difficultyLabel,
      attempts: result.attempts || 0,
      hints: result.hintsUsed || 0,
      route: result.routeLabel,
      pack: result.packLabel || '',
      daily: Boolean(result.isDaily)
    });
    stats.ranking.sort((a, b) => {
      if (a.attempts !== b.attempts) return a.attempts - b.attempts;
      if (a.hints !== b.hints) return a.hints - b.hints;
      return String(b.date).localeCompare(String(a.date));
    });
    stats.ranking = stats.ranking.slice(0, MAX_RANKING);
  } else {
    stats.streak = 0;
  }

  if (result.isDaily) {
    stats.dailyPlayed += 1;
    if (won) {
      stats.dailyWins += 1;
      stats.dailyStreak = stats.dailyLastDate === previousDateKey(result.dateKey)
        ? stats.dailyStreak + 1
        : 1;
      stats.dailyBestStreak = Math.max(stats.dailyBestStreak, stats.dailyStreak);
    } else {
      stats.dailyStreak = 0;
    }
    stats.dailyLastDate = result.dateKey;
  }

  saveStats(stats);
  return stats;
}

export function statsSummary(stats = readStats()) {
  return {
    played: stats.played,
    wins: stats.wins,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    winRate: stats.played ? Math.round((stats.wins / stats.played) * 100) : 0,
    averageAttempts: stats.wins ? (stats.totalWinAttempts / stats.wins).toFixed(1) : '-',
    averageHints: stats.played ? (stats.totalHints / stats.played).toFixed(1) : '-',
    dailyStreak: stats.dailyStreak,
    dailyBestStreak: stats.dailyBestStreak,
    ranking: stats.ranking || []
  };
}

export function buildShareText(result, stats = readStats()) {
  const summary = statsSummary(stats);
  const lines = [
    result.isDaily ? (result.gameLabel || 'YENDLE') + ' diario ' + result.dateKey : (result.gameLabel || 'YENDLE'),
    result.routeLabel,
    result.status === 'won'
      ? 'Completado en ' + result.attempts + ' intento' + (result.attempts === 1 ? '' : 's')
      : 'Ruta revelada',
    'Pistas usadas: ' + result.hintsUsed,
    'Racha: ' + summary.streak + ' | Ganadas: ' + summary.wins + '/' + summary.played,
    location.origin + location.pathname.replace(/\/web\/(?:travle|yendle)\.html$/, '/')
  ];
  return lines.join('\n');
}

export async function shareText(text) {
  if (navigator.share) {
    await navigator.share({ text });
    return 'Resultado compartido.';
  }
  await navigator.clipboard.writeText(text);
  return 'Resultado copiado al portapapeles.';
}

export function shouldShowTutorial() {
  return localStorage.getItem(TUTORIAL_KEY) !== '1' && localStorage.getItem(OLD_TUTORIAL_KEY) !== '1';
}

export function markTutorialSeen() {
  localStorage.setItem(TUTORIAL_KEY, '1');
}

export function readSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) === '1' || localStorage.getItem(OLD_SOUND_KEY) === '1';
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
}

let audioContext = null;

export function playCue(type) {
  if (!readSoundEnabled()) return;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  audioContext ||= new Context();
  audioContext.resume?.();

  const notes = {
    success: [523.25, 659.25],
    error: [196],
    hint: [392, 523.25],
    win: [523.25, 659.25, 783.99],
    giveup: [220, 174.61]
  }[type] || [440];

  notes.forEach((frequency, index) => {
    const start = audioContext.currentTime + index * 0.08;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}
