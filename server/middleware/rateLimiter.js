/**
 * Minimal in-memory rate limiter (fixed window, per client IP).
 *
 * Good enough to blunt password guessing on a single server instance. If the
 * API is ever scaled across several instances, replace this with a shared
 * store such as Redis.
 */
function rateLimiter({ windowMs, max, message }) {
  const hits = new Map();

  // Drop expired entries so the map cannot grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        success: false,
        message: message || "Too many requests. Please try again later.",
      });
    }

    return next();
  };
}

module.exports = { rateLimiter };
