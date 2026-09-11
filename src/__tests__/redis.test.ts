/**
 * Redis connection (Phase 20). REDIS_URL unset → `redis` is null and
 * `redisHealthy()` reports true (nothing to check, not a failure).
 */
import { describe, it, expect } from 'vitest';

describe('redis', () => {
  it('is null and reports healthy when REDIS_URL is unset', async () => {
    const { redis, redisHealthy, closeRedis } = await import('../redis.js');
    expect(redis).toBeNull();
    await expect(redisHealthy()).resolves.toBe(true);
    await expect(closeRedis()).resolves.toBeUndefined();
  });
});
