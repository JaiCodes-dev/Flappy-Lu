import { STORAGE_KEYS } from './constants.js';

const MAX_LEADERBOARD_ENTRIES = 10;
const LEADERBOARD_VERSION = 4;
const LEADERBOARD_API = '/api/leaderboard';
const BUNDLED_LEADERBOARD = '/data/leaderboard.json';

export function getBestScore() {
  const stored = Number.parseInt(localStorage.getItem(STORAGE_KEYS.bestScore) ?? '0', 10);
  return Number.isFinite(stored) ? stored : 0;
}

export function getBestScorer() {
  const [bestScorer] = getLeaderboard();
  return bestScorer ?? null;
}

export function saveBestScore(score) {
  const best = Math.max(getBestScore(), score);
  localStorage.setItem(STORAGE_KEYS.bestScore, String(best));
  return best;
}

export function getPlayerName() {
  const storedName = localStorage.getItem(STORAGE_KEYS.playerName);
  return storedName ? sanitizePlayerName(storedName, '') : '';
}

export function savePlayerName(name) {
  const playerName = sanitizePlayerName(name, '');
  if (playerName) {
    localStorage.setItem(STORAGE_KEYS.playerName, playerName);
  }
  return playerName;
}

export async function changePlayerName(name) {
  const oldName = getPlayerName();
  const newName = savePlayerName(name);
  if (!newName) return '';

  try {
    const response = await fetch(LEADERBOARD_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'rename',
        oldName,
        newName,
        version: LEADERBOARD_VERSION
      })
    });
    if (!response.ok) throw new Error('Leaderboard rename failed');

    const data = await response.json();
    const leaderboard = normalizeLeaderboard(data.leaderboard);
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(leaderboard));
    localStorage.setItem(STORAGE_KEYS.bestScore, String(data.bestScore ?? leaderboard[0]?.score ?? getBestScore()));
  } catch {
    const leaderboard = normalizeLeaderboard(
      getLeaderboard().map(entry => (entry.name === oldName ? { ...entry, name: newName } : entry))
    );
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(leaderboard));
  }

  return newName;
}

export function getPlayerBestScore(name = getPlayerName()) {
  const playerName = sanitizePlayerName(name);
  const entry = getLeaderboard().find(leaderboardEntry => leaderboardEntry.name === playerName);
  return entry?.score ?? 0;
}

export function shouldSavePlayerScore(score, name = getPlayerName()) {
  const parsedScore = Number.parseInt(score, 10) || 0;
  if (parsedScore <= 0) return false;
  if (!name) return true;
  return parsedScore > getPlayerBestScore(name);
}

export function getLeaderboard() {
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.leaderboard) ?? '[]');
    return normalizeLeaderboard(entries);
  } catch {
    return [];
  }
}

export function isLeaderboardScore(score) {
  const parsedScore = Number.parseInt(score, 10) || 0;
  if (parsedScore <= 0) return false;

  const leaderboard = getLeaderboard();
  return leaderboard.length < MAX_LEADERBOARD_ENTRIES || parsedScore > leaderboard[leaderboard.length - 1].score;
}

export async function getSharedLeaderboard() {
  try {
    const response = await fetch(LEADERBOARD_API);
    if (!response.ok) throw new Error('Leaderboard request failed');

    const data = await response.json();
    const sharedLeaderboard = normalizeLeaderboard([...await getBundledLeaderboard(), ...data.leaderboard]);

    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(sharedLeaderboard));
    localStorage.setItem(STORAGE_KEYS.bestScore, String(data.bestScore ?? sharedLeaderboard[0]?.score ?? getBestScore()));
    return sharedLeaderboard;
  } catch {
    const leaderboard = normalizeLeaderboard([...await getBundledLeaderboard(), ...getLeaderboard()]);
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(leaderboard));
    localStorage.setItem(STORAGE_KEYS.bestScore, String(leaderboard[0]?.score ?? getBestScore()));
    return leaderboard;
  }
}

export function saveLeaderboardScore(name, score) {
  const entry = {
    name: sanitizePlayerName(name),
    score: Math.max(0, Number.parseInt(score, 10) || 0),
    date: new Date().toISOString()
  };

  if (entry.score <= 0) return getLeaderboard();

  const leaderboard = normalizeLeaderboard([...getLeaderboard(), entry]);

  localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(leaderboard));
  localStorage.setItem(STORAGE_KEYS.bestScore, String(Math.max(getBestScore(), entry.score)));
  return leaderboard;
}

export async function saveSharedLeaderboardScore(name, score) {
  try {
    const response = await fetch(LEADERBOARD_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: sanitizePlayerName(name), score, version: LEADERBOARD_VERSION })
    });
    if (!response.ok) throw new Error('Leaderboard save failed');

    const data = await response.json();
    const leaderboard = normalizeLeaderboard(data.leaderboard);
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(leaderboard));
    localStorage.setItem(STORAGE_KEYS.bestScore, String(data.bestScore ?? leaderboard[0]?.score ?? getBestScore()));
    return leaderboard;
  } catch {
    saveLeaderboardScore(name, score);
    const leaderboard = normalizeLeaderboard([...await getBundledLeaderboard(), ...getLeaderboard()]);
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(leaderboard));
    return leaderboard;
  }
}

async function getBundledLeaderboard() {
  try {
    const response = await fetch(BUNDLED_LEADERBOARD);
    if (!response.ok) return [];
    return normalizeLeaderboard(await response.json());
  } catch {
    return [];
  }
}

function normalizeLeaderboard(entries) {
  if (!Array.isArray(entries)) return [];

  const bestByName = new Map();

  entries
    .map(entry => ({
      name: sanitizePlayerName(entry.name),
      score: Number.parseInt(entry.score, 10) || 0,
      date: entry.date || ''
    }))
    .filter(entry => entry.score > 0)
    .forEach(entry => {
      const existing = bestByName.get(entry.name);
      if (!existing || isBetterEntry(entry, existing)) {
        bestByName.set(entry.name, entry);
      }
    });

  return [...bestByName.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LEADERBOARD_ENTRIES);
}

function isBetterEntry(entry, existing) {
  if (entry.score !== existing.score) return entry.score > existing.score;
  return Date.parse(entry.date || 0) > Date.parse(existing.date || 0);
}

function sanitizePlayerName(name, fallback = 'PLAYER') {
  const cleaned = String(name ?? '')
    .replace(/[^\w .-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 12);

  return cleaned || fallback;
}
