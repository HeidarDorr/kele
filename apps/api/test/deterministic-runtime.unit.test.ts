import { describe, expect, it } from 'vitest';
import {
  runtimeClock,
  runtimeIdFactory,
  runtimeOrderedIdFactory,
} from '../src/shared/deterministic-runtime.js';

describe('deterministic E2E runtime primitives', () => {
  it('returns fresh Date objects at one fixed instant', () => {
    const clock = runtimeClock('2026-08-02T09:00:00.000Z');
    const first = clock();
    first.setUTCFullYear(2030);
    expect(clock().toISOString()).toBe('2026-08-02T09:00:00.000Z');
  });

  it('repeats the same scoped UUID sequence without cross-scope collisions', () => {
    const first = runtimeIdFactory('stable-evidence-seed', 'checkout');
    const replay = runtimeIdFactory('stable-evidence-seed', 'checkout');
    const payment = runtimeIdFactory('stable-evidence-seed', 'payment');
    const sequence = [first(), first(), first()];
    expect([replay(), replay(), replay()]).toEqual(sequence);
    expect(payment()).not.toBe(sequence[0]);
    for (const value of sequence) expect(value).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('repeats an insertion-ordered UUID sequence for same-instant evidence facts', () => {
    const first = runtimeOrderedIdFactory('stable-evidence-seed', 'operations');
    const replay = runtimeOrderedIdFactory('stable-evidence-seed', 'operations');
    const sequence = [first(), first(), first()];

    expect([replay(), replay(), replay()]).toEqual(sequence);
    expect([...sequence].sort()).toEqual(sequence);
    for (const value of sequence) {
      expect(value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });
});
