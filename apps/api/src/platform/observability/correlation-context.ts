import { AsyncLocalStorage } from 'node:async_hooks';

const correlationStorage = new AsyncLocalStorage<string>();

export function runWithCorrelationId<T>(correlationId: string, callback: () => T): T {
  return correlationStorage.run(correlationId, callback);
}

export function correlationId(): string | undefined {
  return correlationStorage.getStore();
}
