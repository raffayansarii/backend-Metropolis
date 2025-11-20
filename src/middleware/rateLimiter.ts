import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  burstCount: number;
  burstResetTime: number;
}

const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  burstMax: 5,
  burstWindowMs: 10 * 1000, // 10 seconds
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const clientId = req.ip || 'unknown';
  const now = Date.now();

  let entry = rateLimitStore.get(clientId);

  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + RATE_LIMIT.windowMs,
      burstCount: 0,
      burstResetTime: now + RATE_LIMIT.burstWindowMs,
    };
    rateLimitStore.set(clientId, entry);
  }

  // Reset counters if windows expired
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + RATE_LIMIT.windowMs;
  }

  if (now > entry.burstResetTime) {
    entry.burstCount = 0;
    entry.burstResetTime = now + RATE_LIMIT.burstWindowMs;
  }

  // Check burst limit first
  if (entry.burstCount >= RATE_LIMIT.burstMax) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests in a short time. Please try again later.',
      retryAfter: Math.ceil((entry.burstResetTime - now) / 1000),
    });
    return;
  }

  // Check overall rate limit
  if (entry.count >= RATE_LIMIT.maxRequests) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Maximum requests per minute exceeded. Please try again later.',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
    return;
  }

  entry.count++;
  entry.burstCount++;
  next();
};

// Export cleanup function to be called from main app
export const cleanupRateLimitStore = (): void => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime && now > entry.burstResetTime) {
      rateLimitStore.delete(key);
    }
  }
};

