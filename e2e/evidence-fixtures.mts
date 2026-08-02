import { resolve } from 'node:path';

export type MilestoneEvidenceFixture = Readonly<{
  milestone: 'milestone-3' | 'milestone-4';
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

export const evidenceFixedTime = '2026-08-02T09:00:00.000Z';
export const evidenceIdSeed = 'kele-e2e-evidence-runtime-v1';
