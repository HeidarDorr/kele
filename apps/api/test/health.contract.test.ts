import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/platform/health/health.controller.js';

describe('health transport contract', () => {
  it('returns the OpenAPI HealthStatus shape when the dependency is ready', () => {
    const controller = new HealthController({ isReady: () => Promise.resolve(true) });
    const response = controller.live();
    expect(response).toMatchObject({ status: 'ok' });
    expect(response).toHaveProperty('correlationId');
  });

  it('returns 503 rather than a false ready response when a required dependency is unavailable', async () => {
    const controller = new HealthController({ isReady: () => Promise.resolve(false) });
    await expect(controller.ready()).rejects.toMatchObject({ status: 503 });
  });
});
