const STORE_KEY = '__JCHUB_RATE_LIMITS__';

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }
  return globalThis[STORE_KEY];
}

export function getClientIp(req) {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const realIp = String(req.headers?.['x-real-ip'] || '').trim();
  const socketIp = String(req.socket?.remoteAddress || '').trim();
  return forwardedFor || realIp || socketIp || 'unknown';
}

export function checkRateLimit(req, { keyPrefix, limit = 8, windowMs = 15 * 60 * 1000 }) {
  const now = Date.now();
  const store = getStore();
  const key = `${keyPrefix}:${getClientIp(req)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return { limited: false, remaining: Math.max(0, limit - 1), retryAfter: 0 };
  }

  current.count += 1;
  store.set(key, current);

  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return {
    limited: current.count > limit,
    remaining: Math.max(0, limit - current.count),
    retryAfter
  };
}

export function isLikelyBotSubmission(body, { minAgeMs = 1500 } = {}) {
  const honeypot = String(body?.website || body?.company || body?.url || '').trim();
  if (honeypot) return true;

  const startedAt = Number(body?.formStartedAt || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return false;

  const elapsed = Date.now() - startedAt;
  return elapsed >= 0 && elapsed < minAgeMs;
}
