import { randomInt, randomUUID } from 'node:crypto';
import {
  CartLineKind,
  CartLineStatus,
  MediaFormat,
  MediaGroup,
  PrismaClient,
  PublicationStatus,
} from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  SmsDeliveryStatus,
  SmsDispatch,
  SmsGateway,
} from '../src/modules/foundation/application/sms-gateway.port.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { PrismaTransactionContext } from '../src/infrastructure/prisma/prisma-transaction.context.js';
import { PrismaIdentityRepository } from '../src/modules/identity/infrastructure/prisma-identity.repository.js';
import { PrismaCartRepository } from '../src/modules/cart/infrastructure/prisma-cart.repository.js';
import { PrismaCartCatalogReader } from '../src/modules/catalog/infrastructure/prisma-cart-catalog.reader.js';
import { MilestoneThreeOutfitCartReader } from '../src/modules/cart/application/outfit-cart.contract.js';
import { CartService } from '../src/modules/cart/application/cart.service.js';
import { IdentityService } from '../src/modules/identity/application/identity.service.js';
import { CustomerService } from '../src/modules/identity/application/customer.service.js';
import { ApplicationError } from '../src/shared/application-error.js';
import type {
  OperationalEvent,
  OperationalTelemetry,
} from '../src/shared/operational-telemetry.js';

class RecordingSmsGateway implements SmsGateway {
  readonly provider = 'recording';
  readonly messages = new Map<string, string>();

  sendOtp(
    input: Readonly<{ mobile: string; code: string; correlationId: string }>,
  ): Promise<SmsDispatch> {
    this.messages.set(input.correlationId, input.code);
    return Promise.resolve({
      provider: 'recording',
      providerMessageId: `recording-${input.correlationId}`,
      accepted: true,
    });
  }

  getDeliveryStatus(providerMessageId: string): Promise<SmsDeliveryStatus> {
    return Promise.resolve({
      provider: this.provider,
      providerMessageId,
      status: 'delivered',
    });
  }

  code(challengeId: string): string {
    const code = this.messages.get(challengeId)?.match(/[0-9]{6}/)?.[0];
    if (code === undefined) throw new Error('Recorded SMS did not contain an OTP code.');
    return code;
  }
}

class FailingSmsGateway implements SmsGateway {
  readonly provider = 'outage';

  sendOtp(): Promise<SmsDispatch> {
    return Promise.reject(new Error('simulated provider outage'));
  }

  getDeliveryStatus(): Promise<SmsDeliveryStatus> {
    return Promise.reject(new Error('simulated provider outage'));
  }
}

class RecordingTelemetry implements OperationalTelemetry {
  readonly events: OperationalEvent[] = [];

  record(event: OperationalEvent): void {
    this.events.push(event);
  }
}

const prisma = new PrismaClient();
const transactions = new PrismaTransactionContext(prisma as unknown as PrismaService);
const identityRepository = new PrismaIdentityRepository(transactions);
const cartRepository = new PrismaCartRepository(transactions);
const catalogReader = new PrismaCartCatalogReader(transactions);
const cartService = new CartService(
  cartRepository,
  catalogReader,
  new MilestoneThreeOutfitCartReader(),
  transactions,
);
const sms = new RecordingSmsGateway();
const identityService = new IdentityService(
  identityRepository,
  cartService,
  sms,
  transactions,
  'integration-signing-secret-with-thirty-two-characters',
  'integration-otp-pepper-with-thirty-two-characters',
);
const customerService = new CustomerService(identityRepository, transactions);
const runId = randomUUID();
const mobileBase = randomInt(1_000_000, 8_999_990);
const mobiles = Array.from(
  { length: 9 },
  (_, index) => `+98912${String(mobileBase + index).padStart(7, '0')}`,
);
const cartIds = new Set<string>();
const customerIds = new Set<string>();

let productId = '';
let variantId = '';
let skuId = '';
let secondSkuId = '';
let mediaId = '';
let unavailableOutfitId = '';
let unavailableOutfitRevisionId = '';

async function startChallenge(
  mobile: string,
  device: string = randomUUID(),
  ip: string = `198.51.100.${String(randomInt(1, 250))}`,
) {
  return identityService.createOtpChallenge(mobile, ip, device);
}

async function authenticate(
  mobile: string,
  input?: { guestCartId?: string; previousSessionToken?: string },
) {
  const challenge = await startChallenge(mobile);
  const result = await identityService.verifyOtp({
    challengeId: challenge.challengeId,
    code: sms.code(challenge.challengeId),
    previousSessionToken: input?.previousSessionToken ?? null,
    guestCartId: input?.guestCartId ?? null,
  });
  customerIds.add(result.customer.id);
  cartIds.add(result.cart.id);
  return { challenge, result };
}

beforeAll(async () => {
  const media = await prisma.mediaAsset.create({
    data: {
      url: `/media/catalog/m3-${runId}.webp`,
      width: 1024,
      height: 1536,
      altText: 'تصویر محصول آزمون سبد',
      format: MediaFormat.WEBP,
      group: MediaGroup.PRODUCT_IMAGES,
    },
  });
  mediaId = media.id;
  const product = await prisma.product.create({
    data: {
      name: `محصول آزمون سبد ${runId.slice(0, 8)}`,
      slug: `m3-cart-${runId}`,
      description: 'محصول قطعی برای آزمون سبد و احراز هویت',
      status: PublicationStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });
  productId = product.id;
  const variant = await prisma.colorVariant.create({
    data: {
      productId,
      name: 'قهوه‌ای',
      normalizedColorCode: `brown-${runId.slice(0, 30)}`,
      status: PublicationStatus.PUBLISHED,
    },
  });
  variantId = variant.id;
  await prisma.mediaAssignment.create({
    data: { colorVariantId: variantId, mediaAssetId: mediaId, featured: true },
  });
  const sku = await prisma.sku.create({
    data: {
      colorVariantId: variantId,
      code: `M3-${runId.slice(0, 12)}`,
      normalizedSize: 'm',
      displaySize: 'M',
      status: PublicationStatus.PUBLISHED,
      inventory: { create: { physicalQuantity: 5 } },
    },
  });
  skuId = sku.id;
  const price = await prisma.priceRecord.create({
    data: {
      skuId,
      amountRial: 12_000_000,
      actorId: 'm3-integration',
      reason: 'قیمت آزمون',
    },
  });
  await prisma.currentSkuPrice.create({
    data: { skuId, priceRecordId: price.id, amountRial: 12_000_000 },
  });
  const secondSku = await prisma.sku.create({
    data: {
      colorVariantId: variantId,
      code: `M3-SECOND-${runId.slice(0, 12)}`,
      normalizedSize: 'l',
      displaySize: 'L',
      status: PublicationStatus.PUBLISHED,
      inventory: { create: { physicalQuantity: 5 } },
    },
  });
  secondSkuId = secondSku.id;
  const secondPrice = await prisma.priceRecord.create({
    data: {
      skuId: secondSkuId,
      amountRial: 8_000_000,
      actorId: 'm3-integration',
      reason: 'قیمت SKU دوم برای آزمون افزودن اتمیک',
    },
  });
  await prisma.currentSkuPrice.create({
    data: { skuId: secondSkuId, priceRecordId: secondPrice.id, amountRial: 8_000_000 },
  });
  const unavailableOutfit = await prisma.outfit.create({
    data: { slug: `m3-unavailable-outfit-${runId}` },
  });
  unavailableOutfitId = unavailableOutfit.id;
  const unavailableRevision = await prisma.outfitRevision.create({
    data: {
      outfitId: unavailableOutfit.id,
      revisionNumber: 1,
      name: 'ست تاریخی آزمون سبد',
      description: 'نسخه‌ای واقعی که reader مرزی M3 آن را قابل خرید نمی‌داند.',
    },
  });
  unavailableOutfitRevisionId = unavailableRevision.id;
});

afterAll(async () => {
  try {
    const customers = await prisma.customer.findMany({ where: { mobile: { in: mobiles } } });
    customers.forEach((customer) => customerIds.add(customer.id));
    const customerCarts = await prisma.cart.findMany({
      where: { customerId: { in: [...customerIds] } },
    });
    customerCarts.forEach((cart) => cartIds.add(cart.id));
    await prisma.cartMergeReceipt.deleteMany({
      where: {
        OR: [{ guestCartId: { in: [...cartIds] } }, { customerCartId: { in: [...cartIds] } }],
      },
    });
    await prisma.cartNotice.deleteMany({ where: { cartId: { in: [...cartIds] } } });
    await prisma.cartLine.deleteMany({ where: { cartId: { in: [...cartIds] } } });
    await prisma.cart.deleteMany({ where: { id: { in: [...cartIds] } } });
    await prisma.address.deleteMany({ where: { customerId: { in: [...customerIds] } } });
    await prisma.customerSession.deleteMany({ where: { customerId: { in: [...customerIds] } } });
    await prisma.otpChallenge.deleteMany({ where: { mobile: { in: mobiles } } });
    await prisma.customer.deleteMany({ where: { id: { in: [...customerIds] } } });
    if (unavailableOutfitRevisionId !== '') {
      await prisma.outfitRevision.deleteMany({ where: { id: unavailableOutfitRevisionId } });
    }
    if (unavailableOutfitId !== '') {
      await prisma.outfit.deleteMany({ where: { id: unavailableOutfitId } });
    }
    const skuIds = [skuId, secondSkuId].filter((id) => id !== '');
    if (skuIds.length > 0) {
      await prisma.currentSkuPrice.deleteMany({ where: { skuId: { in: skuIds } } });
      await prisma.priceRecord.deleteMany({ where: { skuId: { in: skuIds } } });
      await prisma.inventory.deleteMany({ where: { skuId: { in: skuIds } } });
      await prisma.sku.deleteMany({ where: { id: { in: skuIds } } });
    }
    if (variantId !== '') {
      await prisma.mediaAssignment.deleteMany({ where: { colorVariantId: variantId } });
      await prisma.colorVariant.deleteMany({ where: { id: variantId } });
    }
    if (productId !== '') await prisma.product.deleteMany({ where: { id: productId } });
    if (mediaId !== '') await prisma.mediaAsset.deleteMany({ where: { id: mediaId } });
  } finally {
    await prisma.$disconnect();
  }
});

describe('Milestone 3 identity, ownership and cart on PostgreSQL', () => {
  it('[M9-AC-005][M9-AC-024][SMS-002] fails an SMS outage safely and consumes the challenge', async () => {
    const telemetry = new RecordingTelemetry();
    const outageIdentity = new IdentityService(
      identityRepository,
      cartService,
      new FailingSmsGateway(),
      transactions,
      'integration-signing-secret-with-thirty-two-characters',
      'integration-otp-pepper-with-thirty-two-characters',
      () => '222222',
      () => new Date('2026-08-06T18:00:00.000Z'),
      telemetry,
    );

    await expect(
      outageIdentity.createOtpChallenge(
        mobiles[8] as string,
        '198.51.100.88',
        'provider-outage-device',
      ),
    ).rejects.toMatchObject({ code: 'SMS_DISPATCH_FAILED' });

    const challenge = await prisma.otpChallenge.findFirstOrThrow({
      where: { mobile: mobiles[8] as string },
    });
    expect(challenge.consumedAt).toEqual(new Date('2026-08-06T18:00:00.000Z'));
    expect(telemetry.events).toEqual([{ name: 'otp_dispatch', outcome: 'failed' }]);
  });

  it('[CUS-010][SMS-001][SMS-002] bounds OTP attempts, rejects expiry/replay, and rate-limits resend', async () => {
    const brute = await startChallenge(mobiles[0] as string, 'brute-device', '198.51.100.10');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        identityService.verifyOtp({
          challengeId: brute.challengeId,
          code: '000000',
          previousSessionToken: null,
          guestCartId: null,
        }),
      ).rejects.toMatchObject({ code: 'OTP_VERIFICATION_FAILED' });
    }
    expect(
      await prisma.otpChallenge.findUniqueOrThrow({ where: { id: brute.challengeId } }),
    ).toMatchObject({ failedAttempts: 5, consumedAt: null });

    await expect(
      startChallenge(mobiles[0] as string, 'brute-device', '198.51.100.10'),
    ).rejects.toMatchObject({ code: 'OTP_RATE_LIMITED', retryAfterSeconds: expect.any(Number) });
    await prisma.otpChallenge.updateMany({
      where: { mobile: mobiles[0] as string },
      data: { createdAt: new Date(Date.now() - 2 * 60_000) },
    });
    for (let request = 0; request < 4; request += 1) {
      const accepted = await startChallenge(
        mobiles[0] as string,
        `rolling-device-${String(request)}`,
        `198.51.100.${String(20 + request)}`,
      );
      await prisma.otpChallenge.update({
        where: { id: accepted.challengeId },
        data: { createdAt: new Date(Date.now() - 2 * 60_000) },
      });
    }
    await expect(
      startChallenge(mobiles[0] as string, 'daily-device', '198.51.100.30'),
    ).rejects.toMatchObject({ code: 'OTP_RATE_LIMITED' });

    const expiring = await startChallenge(mobiles[1] as string, 'expiry-device', '198.51.100.11');
    const past = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.otpChallenge.update({
      where: { id: expiring.challengeId },
      data: { createdAt: past, expiresAt: new Date(Date.now() - 60_000) },
    });
    await expect(
      identityService.verifyOtp({
        challengeId: expiring.challengeId,
        code: sms.code(expiring.challengeId),
        previousSessionToken: null,
        guestCartId: null,
      }),
    ).rejects.toMatchObject({ code: 'OTP_VERIFICATION_FAILED' });

    const replay = await authenticate(mobiles[2] as string);
    await expect(
      identityService.verifyOtp({
        challengeId: replay.challenge.challengeId,
        code: sms.code(replay.challenge.challengeId),
        previousSessionToken: null,
        guestCartId: null,
      }),
    ).rejects.toMatchObject({ code: 'OTP_VERIFICATION_FAILED' });
    const stored = await prisma.otpChallenge.findUniqueOrThrow({
      where: { id: replay.challenge.challengeId },
    });
    expect(stored.codeVerifier).not.toContain(sms.code(replay.challenge.challengeId));
  });

  it('[CUS-010] rotates a fixed session, honors logout revocation, and never revives the old token', async () => {
    const first = await authenticate(mobiles[3] as string);
    await prisma.otpChallenge.updateMany({
      where: { mobile: mobiles[3] as string },
      data: { createdAt: new Date(Date.now() - 2 * 60_000) },
    });
    const secondChallenge = await startChallenge(
      mobiles[3] as string,
      'rotate-device',
      '198.51.100.12',
    );
    const second = await identityService.verifyOtp({
      challengeId: secondChallenge.challengeId,
      code: sms.code(secondChallenge.challengeId),
      previousSessionToken: first.result.sessionToken,
      guestCartId: null,
    });
    expect(await identityService.resolveSession(first.result.sessionToken)).toBeNull();
    expect(await identityService.resolveSession(second.sessionToken)).toMatchObject({
      customer: { id: first.result.customer.id },
    });
    await identityService.logout(second.sessionToken);
    expect(await identityService.resolveSession(second.sessionToken)).toBeNull();
  });

  it('[CUS-003][CUS-004][CUS-005][CUS-008] enforces horizontal address ownership and one atomic default', async () => {
    const owner = await identityRepository.upsertCustomer(mobiles[4] as string);
    const attacker = await identityRepository.upsertCustomer(mobiles[5] as string);
    customerIds.add(owner.id);
    customerIds.add(attacker.id);
    const first = await customerService.createAddress(owner.id, {
      recipientName: 'گیرنده اول',
      recipientMobile: mobiles[4] as string,
      province: 'تهران',
      city: 'تهران',
      addressLine: 'خیابان آزمون، پلاک یک',
      postalCode: '1234567890',
      isDefault: true,
    });
    const second = await customerService.createAddress(owner.id, {
      recipientName: 'گیرنده دوم',
      recipientMobile: mobiles[4] as string,
      province: 'البرز',
      city: 'کرج',
      addressLine: 'بلوار آزمون، پلاک دو',
      postalCode: '0987654321',
      isDefault: true,
    });
    expect(await customerService.listAddresses(owner.id)).toEqual([
      expect.objectContaining({ id: second.id, isDefault: true }),
      expect.objectContaining({ id: first.id, isDefault: false }),
    ]);
    await expect(
      customerService.updateAddress(attacker.id, second.id, {
        recipientName: 'مهاجم',
        recipientMobile: mobiles[5] as string,
        province: 'تهران',
        city: 'تهران',
        addressLine: 'نشانی غیرمجاز برای آزمون',
        postalCode: '1111111111',
        isDefault: false,
      }),
    ).rejects.toMatchObject({ code: 'ADDRESS_NOT_FOUND' });
    expect((await customerService.listAddresses(owner.id))[0]).toMatchObject({ id: second.id });
  });

  it('[CRT-002][CRT-003][CRT-004][CRT-007][INV-003] revalidates current price/inventory without reserving stock', async () => {
    const cart = await cartService.createAnonymousCart();
    cartIds.add(cart.id);
    const added = await cartService.addLine(cart.id, cart.version, {
      kind: 'product',
      skuId,
      quantity: 2,
    });
    expect(added.lines[0]).toMatchObject({ status: 'available', quantity: 2 });
    expect(await prisma.inventory.findUniqueOrThrow({ where: { skuId } })).toMatchObject({
      reservedQuantity: 0,
    });
    const nextPrice = await prisma.priceRecord.create({
      data: {
        skuId,
        amountRial: 13_500_000,
        actorId: 'm3-integration',
        reason: 'تغییر قیمت پس از افزودن',
      },
    });
    await prisma.currentSkuPrice.update({
      where: { skuId },
      data: { priceRecordId: nextPrice.id, amountRial: 13_500_000 },
    });
    await prisma.inventory.update({ where: { skuId }, data: { physicalQuantity: 0 } });
    const revalidated = await cartService.getCart(cart.id);
    expect(revalidated.lines[0]).toMatchObject({
      status: 'unavailable',
      checkoutBlocking: true,
      unitPrice: { amountRial: 13_500_000 },
    });
    expect(revalidated.checkoutBlocked).toBe(true);
    await prisma.inventory.update({ where: { skuId }, data: { physicalQuantity: 5 } });
  });

  it('[OTF-019][OTF-020][CRT-003] atomically adds an omitted-Outfit remainder as independent Product lines', async () => {
    const cart = await cartService.createAnonymousCart();
    cartIds.add(cart.id);

    await expect(
      cartService.addProductSelection(cart.id, cart.version, [
        { skuId, quantity: 1 },
        { skuId: randomUUID(), quantity: 1 },
      ]),
    ).rejects.toMatchObject({ code: 'SKU_NOT_FOUND' });
    expect(await cartService.getCart(cart.id)).toMatchObject({
      version: cart.version,
      lines: [],
    });

    const added = await cartService.addProductSelection(cart.id, cart.version, [
      { skuId, quantity: 1 },
      { skuId: secondSkuId, quantity: 2 },
    ]);

    expect(added.version).toBe(cart.version + 1);
    expect(added.lines).toHaveLength(2);
    expect(added.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'product', skuCode: expect.stringContaining('M3-') }),
        expect.objectContaining({ kind: 'product', quantity: 2, selection: expect.any(String) }),
      ]),
    );
    expect(added.lines.every((line) => line.outfitRevisionId === null)).toBe(true);
    expect(added.informationalTotal.amountRial).toBe(29_500_000);
  });

  it('[CRT-003][CRT-010] serializes concurrent cart updates and rejects one stale writer', async () => {
    const cart = await cartService.createAnonymousCart();
    cartIds.add(cart.id);
    const added = await cartService.addLine(cart.id, cart.version, {
      kind: 'product',
      skuId,
      quantity: 1,
    });
    const lineId = added.lines[0]?.id;
    if (lineId === undefined) throw new Error('Cart line was not created.');
    const outcomes = await Promise.allSettled([
      cartService.updateLine(cart.id, lineId, added.version, 2),
      cartService.updateLine(cart.id, lineId, added.version, 3),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejection = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejection).toBeDefined();
    if (rejection?.status === 'rejected') {
      expect(rejection.reason).toBeInstanceOf(ApplicationError);
      expect(rejection.reason).toMatchObject({ code: 'CART_VERSION_CONFLICT' });
    }
  });

  it('[CRT-013][CRT-014][CRT-015][CRT-016][CRT-017] merges once, caps quantity, persists notice and is idempotent', async () => {
    const customer = await identityRepository.upsertCustomer(mobiles[6] as string);
    customerIds.add(customer.id);
    const customerCart = await cartService.getCustomerCart(customer.id);
    cartIds.add(customerCart.id);
    await cartService.addLine(customerCart.id, customerCart.version, {
      kind: 'product',
      skuId,
      quantity: 3,
    });
    const guest = await cartService.createAnonymousCart();
    cartIds.add(guest.id);
    await cartService.addLine(guest.id, guest.version, { kind: 'product', skuId, quantity: 4 });
    const merged = await cartService.mergeGuestCart(customer.id, guest.id);
    expect(merged).toMatchObject({
      mergePerformed: true,
      cart: {
        lines: [expect.objectContaining({ quantity: 5, status: 'available' })],
        mergeNotices: [
          expect.objectContaining({
            code: 'quantity_reduced_to_inventory',
            requestedQuantity: 7,
            appliedQuantity: 5,
          }),
        ],
      },
    });
    const replay = await cartService.mergeGuestCart(customer.id, guest.id);
    expect(replay.mergePerformed).toBe(false);
    expect(replay.cart.lines[0]).toMatchObject({ quantity: 5 });
    expect(await prisma.cart.findUniqueOrThrow({ where: { id: guest.id } })).toMatchObject({
      status: 'MERGED',
    });
    const otherCustomer = await identityRepository.upsertCustomer(mobiles[1] as string);
    customerIds.add(otherCustomer.id);
    const foreignReplay = await cartService.mergeGuestCart(otherCustomer.id, guest.id);
    cartIds.add(foreignReplay.cart.id);
    expect(foreignReplay.mergePerformed).toBe(false);
    expect(foreignReplay.cart.lines).toHaveLength(0);
    expect(foreignReplay.cart.id).not.toBe(merged.cart.id);
  });

  it('[CRT-018] keeps an unavailable Outfit Revision unchanged and checkout-blocking after merge', async () => {
    const customer = await identityRepository.upsertCustomer(mobiles[7] as string);
    customerIds.add(customer.id);
    const guest = await cartService.createAnonymousCart();
    cartIds.add(guest.id);
    await prisma.cartLine.create({
      data: {
        cartId: guest.id,
        kind: CartLineKind.OUTFIT,
        outfitRevisionId: unavailableOutfitRevisionId,
        outfitSize: 'M',
        titleSnapshot: 'ست تاریخی',
        selectionSnapshot: 'M',
        quantity: 1,
        status: CartLineStatus.AVAILABLE,
        unitPriceRial: 22_000_000,
      },
    });
    const merged = await cartService.mergeGuestCart(customer.id, guest.id);
    cartIds.add(merged.cart.id);
    expect(merged.cart.lines[0]).toMatchObject({
      kind: 'outfit',
      status: 'requires_review',
      checkoutBlocking: true,
    });
    expect(merged.cart.mergeNotices[0]).toMatchObject({
      code: 'outfit_revision_requires_review',
    });
    const mergedLineId = merged.cart.lines[0]?.id;
    if (mergedLineId === undefined) throw new Error('Merged Outfit line was not found.');
    expect(await prisma.cartLine.findFirstOrThrow({ where: { id: mergedLineId } })).toMatchObject({
      outfitRevisionId: unavailableOutfitRevisionId,
    });
  });

  it('[CRT-013][CUS-010] completes OTP authentication and Guest Cart merge in the same command', async () => {
    await prisma.otpChallenge.updateMany({
      where: { mobile: mobiles[2] as string },
      data: { createdAt: new Date(Date.now() - 2 * 60_000) },
    });
    const guest = await cartService.createAnonymousCart();
    cartIds.add(guest.id);
    await cartService.addLine(guest.id, guest.version, { kind: 'product', skuId, quantity: 1 });
    const challenge = await startChallenge(
      mobiles[2] as string,
      'merge-login-device',
      '198.51.100.44',
    );
    const result = await identityService.verifyOtp({
      challengeId: challenge.challengeId,
      code: sms.code(challenge.challengeId),
      previousSessionToken: null,
      guestCartId: guest.id,
    });
    cartIds.add(result.cart.id);
    customerIds.add(result.customer.id);
    expect(result.mergePerformed).toBe(true);
    expect(result.cart.lines).toEqual([expect.objectContaining({ quantity: 1 })]);
    expect(await prisma.cartMergeReceipt.count({ where: { guestCartId: guest.id } })).toBe(1);
  });
});
