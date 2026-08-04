import { describe, expect, it } from 'vitest';
import { assertFulfillmentTransition } from '../src/modules/operations/domain/order-state-machine.js';

const statuses = ['paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned'] as const;
const allowed = new Set([
  'paid:preparing',
  'paid:cancelled',
  'preparing:shipped',
  'preparing:cancelled',
  'shipped:delivered',
  'delivered:returned',
]);

describe('Milestone 6 Order fulfillment state machine', () => {
  for (const from of statuses) {
    for (const to of statuses) {
      const key = `${from}:${to}`;
      if (allowed.has(key)) {
        it(`[ORD-009][ORD-010] allows ${from} -> ${to}`, () => {
          expect(() => {
            assertFulfillmentTransition(from, to);
          }).not.toThrow();
        });
      } else {
        it(`[ORD-005][ORD-009] forbids ${from} -> ${to}`, () => {
          expect(() => {
            assertFulfillmentTransition(from, to);
          }).toThrow(expect.objectContaining({ code: 'ORDER_TRANSITION_ILLEGAL' }));
        });
      }
    }
  }
});
