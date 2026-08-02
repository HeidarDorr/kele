import { formatIrrAsToman } from '@kele/design-system/money';
import type { CheckoutRepository } from './checkout.repository.js';
import type { MoneyView, OrderSnapshotRecord, OrderView } from '../domain/checkout.types.js';

function money(amountRial: number): MoneyView {
  return { amountRial, currency: 'IRR', display: formatIrrAsToman(amountRial) };
}

function orderView(order: OrderSnapshotRecord): OrderView {
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt.toISOString(),
    fulfillmentStatus: order.fulfillmentStatus,
    paidTotal: money(order.paidTotalRial),
    itemsSubtotal: money(order.itemsSubtotalRial),
    shippingTotal: money(order.shippingTotalRial),
    items: order.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      selection: item.selection,
      skuCode: item.skuCode,
      quantity: item.quantity,
      unitPrice: money(item.unitPriceRial),
      lineTotal: money(item.lineTotalRial),
    })),
    address: order.address,
    shipping: {
      method: order.shipping.method,
      name: order.shipping.name,
      chargedPrice: money(order.shipping.chargedPriceRial),
      fixedPrice: money(order.shipping.fixedPriceRial),
      freeShippingApplied: order.shipping.freeShippingApplied,
      freeShippingThreshold:
        order.shipping.freeShippingThresholdRial === null
          ? null
          : money(order.shipping.freeShippingThresholdRial),
      settingsVersion: order.shipping.settingsVersion,
    },
    payment: order.payment,
  };
}

export class OrderService {
  constructor(private readonly repository: CheckoutRepository) {}

  async listOrders(customerId: string) {
    const orders = await this.repository.listOwnedOrders(customerId);
    return {
      items: orders.map((order) => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        fulfillmentStatus: order.fulfillmentStatus,
        paidTotal: money(order.paidTotalRial),
      })),
      page: { nextCursor: null, hasMore: false },
    };
  }

  async getOrder(customerId: string, orderNumber: string): Promise<OrderView> {
    return orderView(await this.repository.getOwnedOrder(customerId, orderNumber));
  }
}
