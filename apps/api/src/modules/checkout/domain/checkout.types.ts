export type CheckoutMediaSnapshot = Readonly<{
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  focalPoint: Readonly<{ x: number; y: number }>;
}>;

export type ShippingMethodCodeValue = 'iran_post' | 'tipax' | 'tehran_local_courier';

export type MoneyView = Readonly<{
  amountRial: number;
  currency: 'IRR';
  display: string;
}>;

export type AddressSnapshot = Readonly<{
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  normalizedZone: string | null;
}>;

export type ShippingMethodSetting = Readonly<{
  code: ShippingMethodCodeValue;
  name: string;
  fixedPriceRial: number;
  enabled: boolean;
  displayOrder: number;
}>;

export type ShippingSettingsRecord = Readonly<{
  id: string;
  version: number;
  freeShippingThresholdRial: number | null;
  eligibilityBasis: 'order_subtotal';
  effectiveAt: Date;
  reason: string;
  methods: readonly ShippingMethodSetting[];
}>;

export type ShippingOptionValue = Readonly<{
  method: ShippingMethodCodeValue;
  name: string;
  eligible: boolean;
  ineligibilityCode: string | null;
  quotedPriceRial: number;
  fixedPriceRial: number;
  eligibilitySubtotalRial: number;
  freeShippingApplied: boolean;
  freeShippingThresholdRial: number | null;
  settingsVersion: number;
}>;

export type CheckoutLineRecord = Readonly<{
  id: string;
  cartLineId: string;
  kind: 'product' | 'outfit';
  skuId: string | null;
  outfitRevisionId: string | null;
  outfitSize: string | null;
  title: string;
  selection: string;
  skuCode: string | null;
  image: CheckoutMediaSnapshot | null;
  quantity: number;
  unitPriceRial: number;
  lineTotalRial: number;
}>;

export type ReservationRecord = Readonly<{
  id: string;
  checkoutSessionId: string;
  checkoutLineId: string;
  skuId: string;
  quantity: number;
  status: 'active' | 'consumed' | 'released' | 'expired';
  expiresAt: Date;
}>;

export type CheckoutSessionRecord = Readonly<{
  id: string;
  customerId: string;
  cartId: string;
  cartVersion: number;
  status: 'active' | 'payment_pending' | 'paid' | 'expired' | 'cancelled' | 'reconciliation';
  requestHash: string;
  itemsSubtotalRial: number;
  shippingTotalRial: number;
  payableTotalRial: number;
  address: AddressSnapshot;
  shipping: ShippingOptionValue;
  createdAt: Date;
  expiresAt: Date;
  lines: readonly CheckoutLineRecord[];
  reservations: readonly ReservationRecord[];
  orderNumber: string | null;
}>;

export type CheckoutSessionView = Readonly<{
  id: string;
  status: CheckoutSessionRecord['status'];
  createdAt: string;
  expiresAt: string;
  lines: ReadonlyArray<{
    id: string;
    kind: 'product' | 'outfit';
    title: string;
    selection: string;
    skuCode: string | null;
    image: CheckoutMediaSnapshot | null;
    quantity: number;
    unitPrice: MoneyView;
    lineTotal: MoneyView;
  }>;
  quote: Readonly<{
    itemsTotal: MoneyView;
    shippingTotal: MoneyView;
    payableTotal: MoneyView;
  }>;
  address: AddressSnapshot;
  shipping: ShippingOptionView;
  orderNumber: string | null;
}>;

export type ShippingOptionView = Readonly<{
  method: ShippingMethodCodeValue;
  name: string;
  eligible: boolean;
  ineligibilityCode: string | null;
  quotedPrice: MoneyView;
  fixedPrice: MoneyView;
  eligibilitySubtotal: MoneyView;
  freeShippingApplied: boolean;
  freeShippingThreshold: MoneyView | null;
  settingsVersion: number;
}>;

export type PaymentAttemptRecord = Readonly<{
  id: string;
  checkoutSessionId: string;
  customerId: string;
  provider: 'fake';
  providerReference: string;
  providerTransactionId: string | null;
  status:
    'created' | 'redirected' | 'verified' | 'failed' | 'cancelled' | 'pending' | 'reconciliation';
  amountRial: number;
  redirectUrl: string | null;
  requestHash: string;
  createdAt: Date;
  orderNumber: string | null;
  reconciliationReason: string | null;
}>;

export type PaymentAttemptView = Readonly<{
  id: string;
  checkoutSessionId: string;
  provider: 'fake';
  status: PaymentAttemptRecord['status'];
  amount: MoneyView;
  redirectUrl: string | null;
  orderNumber: string | null;
  reconciliationReason: string | null;
  createdAt: string;
}>;

export type FakePaymentCallbackPayload = Readonly<{
  providerReference: string;
  providerTransactionId: string;
  status: 'success' | 'failed' | 'cancelled' | 'pending';
  amountRial: number;
  currency: 'IRR';
  issuedAt: string;
  nonce: string;
}>;

export type VerifiedPaymentCallback = FakePaymentCallbackPayload &
  Readonly<{ provider: 'fake'; payloadHash: string }>;

export type PaymentCallbackOutcome = Readonly<{
  status: 'paid' | 'failed' | 'cancelled' | 'pending' | 'reconciliation';
  paymentAttemptId: string;
  orderNumber: string | null;
}>;

export type OrderRecord = Readonly<{
  id: string;
  orderNumber: string;
}>;

export type OrderSnapshotRecord = Readonly<{
  orderNumber: string;
  createdAt: Date;
  paidAt: Date;
  fulfillmentStatus: OrderView['fulfillmentStatus'];
  paidTotalRial: number;
  itemsSubtotalRial: number;
  shippingTotalRial: number;
  items: ReadonlyArray<{
    id: string;
    kind: 'product' | 'outfit';
    title: string;
    selection: string;
    skuCode: string | null;
    quantity: number;
    unitPriceRial: number;
    lineTotalRial: number;
  }>;
  address: AddressSnapshot;
  shipping: Readonly<{
    method: ShippingMethodCodeValue;
    name: string;
    chargedPriceRial: number;
    fixedPriceRial: number;
    freeShippingApplied: boolean;
    freeShippingThresholdRial: number | null;
    settingsVersion: number;
  }>;
  payment: Readonly<{
    provider: 'fake';
    providerTransactionId: string;
  }>;
}>;

export type OrderView = Readonly<{
  orderNumber: string;
  createdAt: string;
  paidAt: string;
  fulfillmentStatus: 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paidTotal: MoneyView;
  itemsSubtotal: MoneyView;
  shippingTotal: MoneyView;
  items: ReadonlyArray<{
    id: string;
    kind: 'product' | 'outfit';
    title: string;
    selection: string;
    skuCode: string | null;
    quantity: number;
    unitPrice: MoneyView;
    lineTotal: MoneyView;
  }>;
  address: AddressSnapshot;
  shipping: Readonly<{
    method: ShippingMethodCodeValue;
    name: string;
    chargedPrice: MoneyView;
    fixedPrice: MoneyView;
    freeShippingApplied: boolean;
    freeShippingThreshold: MoneyView | null;
    settingsVersion: number;
  }>;
  payment: Readonly<{
    provider: 'fake';
    providerTransactionId: string;
  }>;
}>;

export type CallbackReceiptRecord = Readonly<{
  payloadHash: string;
  outcome: PaymentCallbackOutcome;
}>;

export type DatabaseJobRecord = Readonly<{
  id: string;
  type: 'expire_checkout' | 'recover_payment';
  payload: Readonly<Record<string, unknown>>;
  attemptCount: number;
  maxAttempts: number;
  leaseOwner: string;
}>;
