import { ApplicationError } from '../../../shared/application-error.js';

export type FulfillmentStatus =
  'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

const allowed: Readonly<Record<FulfillmentStatus, readonly FulfillmentStatus[]>> = {
  paid: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export function assertFulfillmentTransition(from: FulfillmentStatus, to: FulfillmentStatus): void {
  if (!allowed[from].includes(to)) {
    throw new ApplicationError(
      'conflict',
      'ORDER_TRANSITION_ILLEGAL',
      `Order cannot transition from ${from} to ${to}.`,
    );
  }
}

export function requiresTracking(to: FulfillmentStatus): boolean {
  return to === 'shipped';
}
