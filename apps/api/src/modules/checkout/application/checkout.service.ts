import { createHash, randomUUID } from 'node:crypto';
import { formatIrrAsToman } from '@kele/design-system/money';
import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type {
  CheckoutCart,
  CheckoutCartPort,
} from '../../cart/application/checkout-cart.contract.js';
import type { CartCheckoutLifecycle } from '../../cart/application/cart-checkout-lifecycle.contract.js';
import type {
  CheckoutCatalogPort,
  CheckoutCatalogProduct,
} from '../../catalog/application/checkout-catalog.contract.js';
import type { CheckoutCustomerPort } from '../../identity/application/checkout-customer.contract.js';
import type { CheckoutRepository } from './checkout.repository.js';
import {
  normalizeAddressZone,
  quoteShippingOptions,
  requireEligibleShippingOption,
  ShippingEligibilityError,
} from '../domain/shipping.js';
import type {
  AddressSnapshot,
  CheckoutLineRecord,
  CheckoutSessionRecord,
  CheckoutSessionView,
  ReservationRecord,
  ShippingMethodCodeValue,
  ShippingMethodSetting,
  ShippingOptionValue,
  ShippingOptionView,
  ShippingSettingsRecord,
} from '../domain/checkout.types.js';

const CHECKOUT_TTL_MS = 30 * 60_000;
const shippingNames: Record<ShippingMethodCodeValue, string> = {
  iran_post: 'پست ایران',
  tipax: 'تیپاکس',
  tehran_local_courier: 'پیک محلی تهران',
};

function commandHash(value: Readonly<Record<string, string>>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function checkedMoney(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer IRR value.`);
  }
  return value;
}

function addMoney(left: number, right: number, label: string): number {
  return checkedMoney(left + right, label);
}

function money(amountRial: number) {
  return { amountRial, currency: 'IRR' as const, display: formatIrrAsToman(amountRial) };
}

export function shippingOptionView(option: ShippingOptionValue): ShippingOptionView {
  return {
    method: option.method,
    name: option.name,
    eligible: option.eligible,
    ineligibilityCode: option.ineligibilityCode,
    quotedPrice: money(option.quotedPriceRial),
    fixedPrice: money(option.fixedPriceRial),
    eligibilitySubtotal: money(option.eligibilitySubtotalRial),
    freeShippingApplied: option.freeShippingApplied,
    freeShippingThreshold:
      option.freeShippingThresholdRial === null ? null : money(option.freeShippingThresholdRial),
    settingsVersion: option.settingsVersion,
  };
}

export function checkoutSessionView(session: CheckoutSessionRecord): CheckoutSessionView {
  return {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    lines: session.lines.map((line) => ({
      id: line.id,
      kind: line.kind,
      title: line.title,
      selection: line.selection,
      skuCode: line.skuCode,
      image: line.image,
      quantity: line.quantity,
      unitPrice: money(line.unitPriceRial),
      lineTotal: money(line.lineTotalRial),
    })),
    quote: {
      itemsTotal: money(session.itemsSubtotalRial),
      shippingTotal: money(session.shippingTotalRial),
      payableTotal: money(session.payableTotalRial),
    },
    address: session.address,
    shipping: shippingOptionView(session.shipping),
    orderNumber: session.orderNumber,
  };
}

export class CheckoutService implements CartCheckoutLifecycle {
  constructor(
    private readonly repository: CheckoutRepository,
    private readonly carts: CheckoutCartPort,
    private readonly customers: CheckoutCustomerPort,
    private readonly catalog: CheckoutCatalogPort,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async listShippingOptions(
    customerId: string,
    cartId: string,
    addressId: string,
  ): Promise<ShippingOptionView[]> {
    const now = this.clock();
    const [cart, rawAddress, settings] = await Promise.all([
      this.carts.getOwnedCart(customerId, cartId),
      this.customers.getOwnedAddress(customerId, addressId),
      this.requireShippingSettings(now),
    ]);
    const address: AddressSnapshot = {
      ...rawAddress,
      normalizedZone: normalizeAddressZone(rawAddress),
    };
    const { itemsSubtotalRial } = await this.quoteProductCart(cart, false);
    return quoteShippingOptions(settings, address, itemsSubtotalRial).map(shippingOptionView);
  }

  createCheckout(input: {
    customerId: string;
    cartId: string;
    addressId: string;
    deliveryMethod: ShippingMethodCodeValue;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<CheckoutSessionView> {
    const requestHash = commandHash({
      addressId: input.addressId,
      cartId: input.cartId,
      customerId: input.customerId,
      deliveryMethod: input.deliveryMethod,
    });
    return this.unitOfWork.run(async () => {
      const replay = await this.repository.findCheckoutReplay(
        input.customerId,
        input.idempotencyKey,
      );
      if (replay !== null) {
        if (replay.requestHash !== requestHash) this.idempotencyConflict();
        return checkoutSessionView(replay);
      }

      const now = this.clock();
      const cart = await this.carts.lockOwnedCart(input.customerId, input.cartId);
      const existing = await this.repository.findOpenCheckoutForCart(cart.id);
      if (existing !== null) {
        if (existing.expiresAt <= now) {
          await this.releaseLockedCheckout(existing, now, input.correlationId, 'expired');
        } else {
          throw new ApplicationError(
            'conflict',
            'CART_CHECKOUT_ALREADY_ACTIVE',
            'Cart already has an active CheckoutSession.',
          );
        }
      }
      const rawAddress = await this.customers.getOwnedAddress(input.customerId, input.addressId);
      const address: AddressSnapshot = {
        ...rawAddress,
        normalizedZone: normalizeAddressZone(rawAddress),
      };
      const settings = await this.requireShippingSettings(now);
      const quote = await this.quoteProductCart(cart, true);
      let shipping: ShippingOptionValue;
      try {
        shipping = requireEligibleShippingOption(
          quoteShippingOptions(settings, address, quote.itemsSubtotalRial),
          input.deliveryMethod,
        );
      } catch (error: unknown) {
        if (!(error instanceof ShippingEligibilityError)) throw error;
        throw new ApplicationError(
          'validation',
          error.code,
          'Shipping method is not eligible for this address and cart.',
        );
      }
      const payableTotalRial = addMoney(
        quote.itemsSubtotalRial,
        shipping.quotedPriceRial,
        'Checkout payable total',
      );
      if (payableTotalRial <= 0) {
        throw new ApplicationError(
          'validation',
          'CHECKOUT_TOTAL_INVALID',
          'Checkout payable total must be positive.',
        );
      }
      const sessionId = randomUUID();
      const expiresAt = new Date(now.getTime() + CHECKOUT_TTL_MS);
      const lines: CheckoutLineRecord[] = quote.lines.map((line) => ({
        id: randomUUID(),
        cartLineId: line.cartLineId,
        kind: 'product',
        skuId: line.product.skuId,
        outfitRevisionId: null,
        outfitSize: null,
        title: line.product.title,
        selection: line.product.selection,
        skuCode: line.product.skuCode,
        image: line.product.image,
        quantity: line.quantity,
        unitPriceRial: line.product.unitPriceRial,
        lineTotalRial: checkedMoney(
          line.product.unitPriceRial * line.quantity,
          'Checkout line total',
        ),
      }));
      const reservations: ReservationRecord[] = lines.map((line) => ({
        id: randomUUID(),
        checkoutSessionId: sessionId,
        checkoutLineId: line.id,
        skuId: line.skuId as string,
        quantity: line.quantity,
        status: 'active',
        expiresAt,
      }));
      const created = await this.repository.createCheckout(
        {
          id: sessionId,
          customerId: input.customerId,
          cartId: cart.id,
          cartVersion: cart.version,
          idempotencyKey: input.idempotencyKey,
          requestHash,
          itemsSubtotalRial: quote.itemsSubtotalRial,
          shippingTotalRial: shipping.quotedPriceRial,
          payableTotalRial,
          address,
          shipping: {
            method: shipping.method,
            name: shipping.name,
            fixedPriceRial: shipping.fixedPriceRial,
            freeShippingThresholdRial: shipping.freeShippingThresholdRial,
            freeShippingApplied: shipping.freeShippingApplied,
            settingsVersion: shipping.settingsVersion,
          },
          createdAt: now,
          expiresAt,
          lines,
          reservations,
        },
        input.correlationId,
      );
      await this.catalog.reserve(
        reservations.map((reservation) => ({
          reservationId: reservation.id,
          checkoutSessionId: reservation.checkoutSessionId,
          skuId: reservation.skuId,
          quantity: reservation.quantity,
        })),
        { actorId: input.customerId, correlationId: input.correlationId },
      );
      return checkoutSessionView(created);
    });
  }

  async getCheckout(customerId: string, checkoutSessionId: string): Promise<CheckoutSessionView> {
    return checkoutSessionView(
      await this.repository.getOwnedCheckout(customerId, checkoutSessionId),
    );
  }

  async expireCheckout(checkoutSessionId: string, correlationId: string): Promise<void> {
    await this.unitOfWork.run(async () => {
      const checkout = await this.repository.lockCheckout(checkoutSessionId);
      if (checkout === null || checkout.reservations.every((item) => item.status !== 'active')) {
        return;
      }
      const now = this.clock();
      if (checkout.expiresAt > now) return;
      await this.releaseLockedCheckout(checkout, now, correlationId, 'expired');
    });
  }

  async cancelOpenCheckoutForCart(cartId: string, correlationId: string): Promise<void> {
    await this.unitOfWork.run(async () => {
      const checkout = await this.repository.findOpenCheckoutForCart(cartId);
      if (checkout === null) return;
      const locked = await this.repository.lockCheckout(checkout.id);
      if (
        locked === null ||
        !['active', 'payment_pending'].includes(locked.status) ||
        locked.reservations.every((reservation) => reservation.status !== 'active')
      ) {
        return;
      }
      await this.releaseLockedCheckout(locked, this.clock(), correlationId, 'cancelled');
    });
  }

  async publishShippingSettings(input: {
    freeShippingThresholdRial: number | null;
    methods: readonly Readonly<{
      code: ShippingMethodCodeValue;
      enabled: boolean;
      fixedPriceRial: number;
    }>[];
    actorId: string;
    correlationId: string;
    reason: string;
    expectedVersion: number;
  }): Promise<ShippingSettingsRecord> {
    const codes = input.methods.map((method) => method.code);
    const expected = ['iran_post', 'tehran_local_courier', 'tipax'];
    if ([...new Set(codes)].toSorted().join(',') !== expected.join(',')) {
      throw new ApplicationError(
        'validation',
        'SHIPPING_METHOD_SET_INVALID',
        'Shipping settings must define each version 1 method exactly once.',
      );
    }
    if (
      input.freeShippingThresholdRial !== null &&
      (!Number.isSafeInteger(input.freeShippingThresholdRial) ||
        input.freeShippingThresholdRial < 0)
    ) {
      throw new ApplicationError(
        'validation',
        'SHIPPING_THRESHOLD_INVALID',
        'Free-shipping threshold must be a non-negative integer IRR value.',
      );
    }
    const settings: ShippingMethodSetting[] = input.methods.map((method, index) => {
      if (!Number.isSafeInteger(method.fixedPriceRial) || method.fixedPriceRial < 0) {
        throw new ApplicationError(
          'validation',
          'SHIPPING_PRICE_INVALID',
          'Shipping fixed price must be a non-negative integer IRR value.',
        );
      }
      return {
        ...method,
        name: shippingNames[method.code],
        displayOrder: index,
      };
    });
    return this.unitOfWork.run(async () => {
      const current = await this.repository.getEffectiveShippingSettings(this.clock());
      if ((current?.version ?? 0) !== input.expectedVersion) {
        throw new ApplicationError(
          'conflict',
          'SHIPPING_SETTINGS_VERSION_CONFLICT',
          'Shipping settings changed concurrently. Reload and retry.',
        );
      }
      return this.repository.createShippingSettings({
        freeShippingThresholdRial: input.freeShippingThresholdRial,
        methods: settings,
        actorId: input.actorId,
        correlationId: input.correlationId,
        reason: input.reason,
        effectiveAt: this.clock(),
      });
    });
  }

  getShippingSettings(): Promise<ShippingSettingsRecord | null> {
    return this.repository.getEffectiveShippingSettings(this.clock());
  }

  private async quoteProductCart(cart: CheckoutCart, lock: boolean) {
    if (cart.lines.length === 0) {
      throw new ApplicationError('validation', 'CART_EMPTY', 'Cart is empty.');
    }
    if (cart.lines.some((line) => line.kind === 'outfit' || line.status === 'requires_review')) {
      throw new ApplicationError(
        'validation',
        'CART_REQUIRES_REVIEW',
        'Cart contains an Outfit Revision that cannot enter Product checkout.',
      );
    }
    const skuIds = cart.lines.map((line) => {
      if (line.skuId === null) {
        throw new ApplicationError(
          'validation',
          'CART_LINE_INVALID',
          'Product cart line is missing its SKU.',
        );
      }
      return line.skuId;
    });
    const products = lock
      ? await this.catalog.lockProducts(skuIds)
      : await this.catalog.getProducts(skuIds);
    let itemsSubtotalRial = 0;
    const lines: Array<{
      cartLineId: string;
      quantity: number;
      product: CheckoutCatalogProduct;
    }> = [];
    for (const line of cart.lines) {
      const product = products.get(line.skuId as string);
      if (
        product === undefined ||
        !product.purchasable ||
        product.availableQuantity < line.quantity
      ) {
        throw new ApplicationError(
          'conflict',
          'CART_LINE_UNAVAILABLE',
          'A Cart line is no longer purchasable in the requested quantity.',
        );
      }
      const lineTotal = checkedMoney(product.unitPriceRial * line.quantity, 'Cart line total');
      itemsSubtotalRial = addMoney(itemsSubtotalRial, lineTotal, 'Order Subtotal');
      lines.push({ cartLineId: line.id, quantity: line.quantity, product });
    }
    return { itemsSubtotalRial, lines };
  }

  private async requireShippingSettings(now: Date): Promise<ShippingSettingsRecord> {
    const settings = await this.repository.getEffectiveShippingSettings(now);
    if (settings === null) {
      throw new ApplicationError(
        'dependency',
        'SHIPPING_SETTINGS_UNAVAILABLE',
        'No effective shipping settings are configured.',
      );
    }
    return settings;
  }

  private async releaseLockedCheckout(
    checkout: CheckoutSessionRecord,
    now: Date,
    correlationId: string,
    reason: 'expired' | 'cancelled',
  ): Promise<void> {
    const active = checkout.reservations.filter((reservation) => reservation.status === 'active');
    if (active.length === 0) return;
    await this.catalog.release(
      active.map((reservation) => ({
        reservationId: reservation.id,
        checkoutSessionId: reservation.checkoutSessionId,
        skuId: reservation.skuId,
        quantity: reservation.quantity,
      })),
      { actorId: 'system', correlationId },
      reason,
    );
    if (reason === 'expired') {
      await this.repository.markCheckoutExpired(checkout.id, now, correlationId);
    } else {
      await this.repository.markCheckoutCancelled(checkout.id, now, correlationId);
    }
  }

  private idempotencyConflict(): never {
    throw new ApplicationError(
      'conflict',
      'IDEMPOTENCY_KEY_REUSED',
      'Idempotency key was already used with a different command.',
    );
  }
}
