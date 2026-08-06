import { createHmac } from 'node:crypto';

export type RateLimitDecision = Readonly<{
  allowed: boolean;
  retryAfterSeconds: number;
}>;

type WindowEntry = { count: number; resetsAt: number };

export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, WindowEntry>();

  constructor(
    private readonly privacySecret: string,
    private readonly maxKeys: number,
    private readonly now: () => number = Date.now,
  ) {}

  consume(scope: string, riskKey: string, limit: number, windowMs: number): RateLimitDecision {
    const now = this.now();
    const key = createHmac('sha256', this.privacySecret)
      .update(`${scope}:${riskKey}`)
      .digest('hex');
    const existing = this.windows.get(key);
    if (existing !== undefined && existing.resetsAt > now) {
      if (existing.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetsAt - now) / 1_000)),
        };
      }
      existing.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    }

    this.removeExpired(now);
    if (this.windows.size >= this.maxKeys) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1_000)) };
    }
    this.windows.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  sizeForTest(): number {
    return this.windows.size;
  }

  private removeExpired(now: number): void {
    for (const [key, entry] of this.windows) {
      if (entry.resetsAt <= now) this.windows.delete(key);
    }
  }
}
