import type { InventoryActionInput, InventoryValue } from './catalog.types.js';

export class InventoryInvariantError extends Error {}

const increasesPhysical = new Set<InventoryActionInput['action']>([
  'production',
  'customer_return',
]);

export function applyInventoryDelta(
  current: InventoryValue,
  input: InventoryActionInput,
): InventoryValue {
  if (!Number.isInteger(input.quantity) || input.quantity === 0) {
    throw new InventoryInvariantError('Inventory quantity must be a non-zero integer.');
  }
  if (input.reason.trim().length < 3) {
    throw new InventoryInvariantError('Inventory reason is required.');
  }

  const magnitude = Math.abs(input.quantity);
  const delta = increasesPhysical.has(input.action) ? magnitude : -magnitude;
  const physicalQuantity = current.physicalQuantity + delta;

  if (physicalQuantity < 0 || physicalQuantity < current.reservedQuantity) {
    throw new InventoryInvariantError('Inventory cannot become negative or below reserved stock.');
  }

  return {
    ...current,
    physicalQuantity,
    availableQuantity: physicalQuantity - current.reservedQuantity,
    version: current.version + 1,
  };
}
