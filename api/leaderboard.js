const MAX_LEADERBOARD_ENTRIES = 10;
const LEADERBOARD_VERSION = 4;
const LEADERBOARD_KEY = 'flappy-lu:leaderboard:v4';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    if (!getRedisConfig()) {
      sendJson(res, 503, { error: 'Leaderboard database is not configured' });
      return;
    }

    if (req.method === 'GET') {
      const leaderboard = await readLeaderboard();
      sendLeaderboard(res, leaderboard);
      return;
    }

    const body = req.body ?? {};
    if (body.version !== LEADERBOARD_VERSION) {
      sendLeaderboard(res, await readLeaderboard());
      return;
    }

    const leaderboard = body.action === 'rename'
      ? await renamePlayer(body.oldName, body.newName)
      : await saveScore(body.name, body.score);

    sendLeaderboard(res, leaderboard);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Leaderboard unavailable' });
  }
}

async function readLeaderboard() {
  const data = await redisCommand('get', LEADERBOARD_KEY);
  if (!data) return [];

  try {
    return normalizeLeaderboard(JSON.parse(data));
  } catch {
    return [];
  }
}

async function writeLeaderboard(leaderboard) {
  await redisCommand('set', LEADERBOARD_KEY, JSON.stringify(leaderboard));
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

  await writeLeaderboard(leaderboard);
  return leaderboard;
}

async function renamePlayer(oldName, newName) {
  const previousName = sanitizePlayerName(oldName, '');
  const nextName = sanitizePlayerName(newName, '');
  if (!nextName) return readLeaderboard();

  const leaderboard = normalizeLeaderboard((await readLeaderboard()).map(entry => (
    entry.name === previousName ? { ...entry, name: nextName, date: new Date().toISOString() } : entry
  )));

  await writeLeaderboard(leaderboard);
  return leaderboard;
}

async function redisCommand(command, key, body) {
  const config = getRedisConfig();
  const response = await fetch(`${config.url}/${command}/${encodeURIComponent(key)}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Redis ${command.toUpperCase()} failed`);
  }

  const data = await response.json();
  return data.result;
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;
  return {
    url: url.replace(/\/$/, ''),
    token
  };
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

function sendLeaderboard(res, leaderboard) {
  sendJson(res, 200, {
    leaderboard,
    bestScore: leaderboard[0]?.score ?? 0
  });
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
