import { resolve } from 'node:path';

export type MilestoneEvidenceFixture = Readonly<{
  milestone: 'milestone-3' | 'milestone-4' | 'milestone-6';
  evidenceDirectory: string;
  skuId: string;
  screenshotFilenames: readonly string[];
}>;

export const milestoneThreeFixture = {
  milestone: 'milestone-3',
  evidenceDirectory: resolve('output/playwright/milestone-3'),
  skuId: '20000000-0000-4000-8000-000000000041',
  screenshotFilenames: [
    'account-profile-address-desktop.png',
    'cart-authenticated-desktop.png',
    'cart-authenticated-mobile.png',
    'cart-authenticated-tablet.png',
    'cart-empty-mobile.png',
    'cart-error-tablet.png',
    'cart-loading-laptop.png',
    'cart-merge-notice-laptop.png',
    'cart-outfit-requires-review.png',
    'cart-unavailable-desktop.png',
  ],
  journeyMobile: '+989121234567',
  stateMobile: '+989121234568',
} as const satisfies MilestoneEvidenceFixture &
  Readonly<{ journeyMobile: string; stateMobile: string }>;

export const milestoneFourFixture = {
  milestone: 'milestone-4',
  evidenceDirectory: resolve('output/playwright/milestone-4'),
  skuId: '20000000-0000-4000-8000-000000000041',
  screenshotFilenames: [
    'checkout-desktop.png',
    'checkout-mobile.png',
    'checkout-tablet.png',
    'fake-gateway-laptop.png',
    'paid-order-desktop.png',
    'payment-cancelled.png',
    'payment-expired.png',
    'payment-failed.png',
    'payment-paid.png',
    'payment-pending.png',
    'payment-reconciliation.png',
  ],
  initialPhysicalQuantity: 4,
  paidMobile: '+989121234569',
  reconciliationMobile: '+989121234570',
  expiredMobile: '+989121234571',
} as const satisfies MilestoneEvidenceFixture &
  Readonly<{
    initialPhysicalQuantity: number;
    paidMobile: string;
    reconciliationMobile: string;
    expiredMobile: string;
  }>;

export const milestoneSixFixture = {
  milestone: 'milestone-6',
  evidenceDirectory: resolve('output/playwright/milestone-6'),
  skuId: '20000000-0000-4000-8000-000000000041',
  screenshotFilenames: [
    'staff-order-delivered-desktop.png',
    'staff-audit-desktop.png',
    'customer-return-submitted-desktop.png',
    'customer-return-completed-mobile.png',
  ],
  mobile: '+989121234572',
  orderNumber: 'M6-E2E-00000001',
  ids: {
    customer: '60000000-0000-4000-8000-000000000601',
    checkoutSession: '60000000-0000-4000-8000-000000000602',
    paymentAttempt: '60000000-0000-4000-8000-000000000603',
    order: '60000000-0000-4000-8000-000000000604',
    orderItem: '60000000-0000-4000-8000-000000000605',
    createdTimelineEvent: '00000000-0000-4000-8000-000000000000',
    saleInventoryMovement: '60000000-0000-4000-8000-000000000607',
    createdCorrelation: '60000000-0000-4000-8000-000000000608',
    saleCorrelation: '60000000-0000-4000-8000-000000000609',
  },
  idempotencyKeys: {
    checkout: 'm6-e2e-checkout-00000001',
    payment: 'm6-e2e-payment-00000001',
    createdTimeline: 'm6-e2e-created-00000001',
    saleInventory: 'm6-e2e-sale-00000001',
    forbiddenInstagram: 'm6-e2e-instagram-forbidden-0001',
    instagramReturn: 'm6-e2e-instagram-return-0000001',
    instagramSale: 'm6-e2e-instagram-sale-000000001',
  },
  providerReference: 'm6-e2e-provider-00000001',
  providerTransactionId: 'm6-e2e-transaction-00000001',
  createdReason: 'پرداخت تأییدشدهٔ آزمون پذیرش',
  saleReason: 'فروش تأییدشدهٔ آزمون پذیرش',
  transitionReasons: {
    preparing: 'تأیید گذار به در حال آماده‌سازی',
    shipped: 'تأیید گذار به ارسال‌شده',
    delivered: 'تأیید گذار به تحویل‌شده',
  },
  recipient: {
    name: 'مشتری عملیات کِلِه',
    province: 'تهران',
    city: 'تهران',
    addressLine: 'خیابان ولیعصر، پلاک ۲۴',
    postalCode: '1234567890',
  },
  shipping: {
    methodCode: 'IRAN_POST',
    methodName: 'پست ایران',
    fixedPriceRial: 800_000,
  },
  tracking: {
    carrier: 'پست ایران',
    number: 'KELE-M6-TRACK-001',
    url: 'https://example.test/track/KELE-M6-TRACK-001',
  },
  returnReason: 'اندازه برای کودک مناسب نیست',
  approvalReason: 'اظهارها و مهلت تحویل بررسی شد',
} as const satisfies MilestoneEvidenceFixture &
  Readonly<{
    mobile: string;
    orderNumber: string;
    ids: Readonly<Record<string, string>>;
    idempotencyKeys: Readonly<Record<string, string>>;
    providerReference: string;
    providerTransactionId: string;
    createdReason: string;
    saleReason: string;
    transitionReasons: Readonly<{ preparing: string; shipped: string; delivered: string }>;
    recipient: Readonly<{
      name: string;
      province: string;
      city: string;
      addressLine: string;
      postalCode: string;
    }>;
    shipping: Readonly<{
      methodCode: string;
      methodName: string;
      fixedPriceRial: number;
    }>;
    tracking: Readonly<{ carrier: string; number: string; url: string }>;
    returnReason: string;
    approvalReason: string;
  }>;

export const evidenceFixedTime = '2026-08-02T09:00:00.000Z';
export const evidenceIdSeed = 'kele-e2e-evidence-runtime-v1';
