import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';

const MAX_LEADERBOARD_ENTRIES = 10;
const LEADERBOARD_VERSION = 4;
const DATA_DIR = path.resolve('data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

export default defineConfig({
  server: {
    host: '0.0.0.0'
  },
  plugins: [
    {
      name: 'shared-leaderboard-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/leaderboard')) {
            next();
            return;
          }

          try {
            if (req.method === 'GET') {
              const leaderboard = await readLeaderboard();
              sendJson(res, 200, {
                leaderboard,
                bestScore: leaderboard[0]?.score ?? 0
              });
              return;
            }

            if (req.method === 'POST') {
              const body = await readJsonBody(req);
              if (body?.version !== LEADERBOARD_VERSION) {
                const leaderboard = await readLeaderboard();
                sendJson(res, 200, {
                  leaderboard,
                  bestScore: leaderboard[0]?.score ?? 0
                });
                return;
              }

              if (body?.action === 'rename') {
                const leaderboard = await renamePlayer(body?.oldName, body?.newName);
                sendJson(res, 200, {
                  leaderboard,
                  bestScore: leaderboard[0]?.score ?? 0
                });
                return;
              }

              const leaderboard = await saveScore(body?.name, body?.score);
              sendJson(res, 200, {
                leaderboard,
                bestScore: leaderboard[0]?.score ?? 0
              });
              return;
            }

            sendJson(res, 405, { error: 'Method not allowed' });
          } catch (error) {
            console.error(error);
            sendJson(res, 500, { error: 'Leaderboard unavailable' });
          }
        });
      }
    }
  ]
});

async function readLeaderboard() {
  try {
    const raw = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return normalizeLeaderboard(entries);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveScore(name, score) {
  const parsedScore = Math.max(0, Number.parseInt(score, 10) || 0);
  if (parsedScore <= 0) return readLeaderboard();

  const leaderboard = normalizeLeaderboard([
    ...(await readLeaderboard()),
    {
      name: sanitizePlayerName(name),
      score: parsedScore,
      date: new Date().toISOString()
    }
  ]);

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
  return leaderboard;
}

async function renamePlayer(oldName, newName) {
  const previousName = sanitizePlayerName(oldName, '');
  const nextName = sanitizePlayerName(newName, '');
  if (!nextName) return readLeaderboard();

  const entries = (await readLeaderboard()).map(entry => (
    entry.name === previousName ? { ...entry, name: nextName, date: new Date().toISOString() } : entry
  ));
  const leaderboard = normalizeLeaderboard(entries);

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
  return leaderboard;
}

function normalizeLeaderboard(entries) {
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 2048) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
