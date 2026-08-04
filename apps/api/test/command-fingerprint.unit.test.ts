import { describe, expect, it } from 'vitest';
import {
  commandFingerprint,
  internalFactIdempotencyKey,
} from '../src/shared/command-fingerprint.js';

const baseInput = {
  commandType: 'operations.inventory.action',
  target: { type: 'SKU', id: 'sku-001' },
  version: null,
  payload: {
    action: 'production',
    quantity: 2,
    reason: 'inventory correction',
  },
} as const;

describe('canonical command fingerprints', () => {
  it('is stable across recursively reordered object keys while preserving the target identity', () => {
    const first = commandFingerprint(baseInput);
    const reordered = commandFingerprint({
      payload: {
        reason: 'inventory correction',
        quantity: 2,
        action: 'production',
      },
      version: null,
      target: { id: 'sku-001', type: 'SKU' },
      commandType: 'operations.inventory.action',
    });

    expect(first).toEqual(reordered);
    expect(first).toMatchObject({
      commandType: 'operations.inventory.action',
      targetId: 'sku-001',
      requestHash: 'bd7167620cebb0d19cd49296360762aa08deb3100032b76a7008b6f2905463ba',
    });
  });

  it.each([
    ['command type', { ...baseInput, commandType: 'operations.inventory.other' }],
    ['target type', { ...baseInput, target: { ...baseInput.target, type: 'Product' } }],
    ['target id', { ...baseInput, target: { ...baseInput.target, id: 'sku-002' } }],
    ['version', { ...baseInput, version: 3 }],
    ['payload', { ...baseInput, payload: { ...baseInput.payload, quantity: 3 } }],
  ])('changes when the %s changes', (_field, changed) => {
    expect(commandFingerprint(changed).requestHash).not.toBe(
      commandFingerprint(baseInput).requestHash,
    );
  });

  it('preserves array order', () => {
    const first = commandFingerprint({ ...baseInput, payload: { values: ['a', 'b'] } });
    const reversed = commandFingerprint({ ...baseInput, payload: { values: ['b', 'a'] } });

    expect(first.requestHash).not.toBe(reversed.requestHash);
  });

  it.each([
    ['undefined', { value: undefined }],
    ['bigint', { value: 1n }],
    ['symbol', { value: Symbol('unsupported') }],
    ['function', { value: () => undefined }],
    ['NaN', { value: Number.NaN }],
    ['Infinity', { value: Number.POSITIVE_INFINITY }],
    ['sparse array', { value: Array(1) }],
    ['non-plain object', { value: new Date('2026-01-01T00:00:00.000Z') }],
  ])('rejects unsupported %s values', (_label, payload) => {
    expect(() => commandFingerprint({ ...baseInput, payload })).toThrow(TypeError);
  });

  it('rejects circular values', () => {
    const payload: { self?: unknown } = {};
    payload.self = payload;

    expect(() => commandFingerprint({ ...baseInput, payload })).toThrow(TypeError);
  });

  it('places internal fact keys outside the validated raw-key namespace', () => {
    const first = internalFactIdempotencyKey(['tracking-timeline', 'hash', 'raw-key']);

    expect(first).toHaveLength(133);
    expect(first).toBe(internalFactIdempotencyKey(['tracking-timeline', 'hash', 'raw-key']));
    expect(first).not.toBe(internalFactIdempotencyKey(['tracking-revision', 'hash', 'raw-key']));
    expect(() => internalFactIdempotencyKey([])).toThrow(TypeError);
  });
});
