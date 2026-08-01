import { PrismaClient } from '@prisma/client';
import { assertE2EDatabaseResetEnvironment } from '@kele/config/e2e-database';
import { createOtpVerifier } from '../../src/modules/identity/application/identity-crypto.js';

function guardedClient(): PrismaClient {
  assertE2EDatabaseResetEnvironment(process.env);
  return new PrismaClient();
}

export async function setE2EOtpCode(challengeId: string, code: string): Promise<void> {
  const prisma = guardedClient();
  try {
    const salt = '0123456789abcdef0123456789abcdef';
    await prisma.otpChallenge.update({
      where: { id: challengeId },
      data: {
        codeSalt: salt,
        codeVerifier: createOtpVerifier(
          code,
          salt,
          process.env.OTP_VERIFIER_PEPPER ?? 'development-otp-verifier-pepper-000001',
        ),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function ageE2EOtpChallenges(mobile: string): Promise<void> {
  const prisma = guardedClient();
  try {
    await prisma.otpChallenge.updateMany({
      where: { mobile },
      data: { createdAt: new Date(Date.now() - 2 * 60_000) },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function setE2EInventory(skuId: string, physicalQuantity: number): Promise<void> {
  const prisma = guardedClient();
  try {
    await prisma.inventory.update({
      where: { skuId },
      data: { physicalQuantity, reservedQuantity: 0, version: { increment: 1 } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function addE2EOutfitReviewLine(cartId: string): Promise<void> {
  const prisma = guardedClient();
  try {
    await prisma.cartLine.create({
      data: {
        cartId,
        kind: 'OUTFIT',
        outfitRevisionId: '30000000-0000-4000-8000-000000000018',
        outfitSize: 'M',
        titleSnapshot: 'استایل تاریخی آزمون',
        selectionSnapshot: 'M',
        quantity: 1,
        status: 'REQUIRES_REVIEW',
        unitPriceRial: 65_000_000,
      },
    });
    await prisma.cart.update({ where: { id: cartId }, data: { version: { increment: 1 } } });
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupE2ECustomer(mobile: string, cartIds: string[]): Promise<void> {
  const prisma = guardedClient();
  try {
    const customer = await prisma.customer.findUnique({ where: { mobile } });
    const customerCarts =
      customer === null ? [] : await prisma.cart.findMany({ where: { customerId: customer.id } });
    const ids = [...new Set([...cartIds, ...customerCarts.map((cart) => cart.id)])];
    await prisma.cartMergeReceipt.deleteMany({
      where: { OR: [{ guestCartId: { in: ids } }, { customerCartId: { in: ids } }] },
    });
    await prisma.cartNotice.deleteMany({ where: { cartId: { in: ids } } });
    await prisma.cartLine.deleteMany({ where: { cartId: { in: ids } } });
    await prisma.cart.deleteMany({ where: { id: { in: ids } } });
    if (customer !== null) {
      await prisma.address.deleteMany({ where: { customerId: customer.id } });
      await prisma.customerSession.deleteMany({ where: { customerId: customer.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
    }
    await prisma.otpChallenge.deleteMany({ where: { mobile } });
  } finally {
    await prisma.$disconnect();
  }
}
