import { ToolMiddleware } from '../types';

interface RateLimitStore {
  increment(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private counts = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.counts.get(key);

    if (!entry || entry.resetAt < now) {
      this.counts.set(key, { count: 1, resetAt: now + 60000 }); // 1 minute default
      return 1;
    }

    entry.count++;
    return entry.count;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.counts.get(key);
    if (entry) {
      entry.resetAt = Date.now() + seconds * 1000;
    }
  }

  // Cleanup expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.counts.entries()) {
      if (entry.resetAt < now) {
        this.counts.delete(key);
      }
    }
  }
}

export interface RateLimitOptions {
  store?: RateLimitStore;
  keyGenerator?: (tool: any, context: any) => string;
  onLimitExceeded?: (tool: any, context: any) => Promise<void>;
}

export function createRateLimitMiddleware(options: RateLimitOptions = {}): ToolMiddleware {
  const {
    store = new InMemoryRateLimitStore(),
    keyGenerator = (tool, context) => `${tool.name}:${context.userId}`,
    onLimitExceeded
  } = options;

  // Cleanup in-memory store periodically
  if (store instanceof InMemoryRateLimitStore) {
    setInterval(() => store.cleanup(), 60000); // Every minute
  }

  return async (tool, _args, context, next) => {
    // Check if tool has rate limiting configured
    if (!tool.rateLimit) {
      return next();
    }

    const key = keyGenerator(tool, context);
    const count = await store.increment(key);

    // Set expiration on first request
    if (count === 1) {
      await store.expire(key, tool.rateLimit.window);
    }

    // Check if limit exceeded
    if (count > tool.rateLimit.requests) {
      if (onLimitExceeded) {
        await onLimitExceeded(tool, context);
      }

      return {
        success: false,
        error: `Rate limit exceeded. Max ${tool.rateLimit.requests} requests per ${tool.rateLimit.window} seconds.`,
        metadata: {
          retryAfter: tool.rateLimit.window
        }
      };
    }

    return next();
  };
}