import { beforeAll, describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ProductValue } from '../src/modules/catalog/domain/catalog.types.js';
import {
  applyInventoryDelta,
  InventoryInvariantError,
} from '../src/modules/catalog/domain/inventory.js';
import { normalizePersianSearch } from '../src/modules/catalog/domain/persian-search.js';
import { validateProductPublication } from '../src/modules/catalog/domain/publication.validator.js';

const superSession = 'test-super-admin-session-token-00000000001';
const inventorySession = 'test-inventory-admin-session-token-0000001';
const instagramSession = 'test-instagram-admin-session-token-0000001';
let AdminSessionGuard: (typeof import('../src/modules/catalog/presentation/admin-session.guard.js'))['AdminSessionGuard'];

beforeAll(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://kele:kele@localhost:5432/kele?schema=public',
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_REGION: 'us-east-1',
    STORAGE_BUCKET: 'kele-test',
    STORAGE_ACCESS_KEY: 'test',
    STORAGE_SECRET_KEY: 'test',
    PAYMENT_PROVIDER: 'fake',
    SMS_PROVIDER: 'fake',
    API_BASE_URL: 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
    ADMIN_SUPER_SESSION_TOKEN: superSession,
    ADMIN_INVENTORY_SESSION_TOKEN: inventorySession,
    ADMIN_INSTAGRAM_SESSION_TOKEN: instagramSession,
  });
  ({ AdminSessionGuard } =
    await import('../src/modules/catalog/presentation/admin-session.guard.js'));
});

function validProduct(): ProductValue {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'کت لینن',
    slug: 'linen-jacket',
    description: 'کت لینن پسرانه',
    details: [],
    status: 'draft',
    seo: { title: null, description: null },
    version: 1,
    updatedAt: new Date(0).toISOString(),
    categories: [
      {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'کت',
        slug: 'jackets',
        description: null,
        displayOrder: 1,
        status: 'published',
        version: 1,
      },
    ],
    variants: [
      {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'بژ',
        normalizedColorCode: 'beige',
        hex: '#d4c2a8',
        status: 'draft',
        displayOrder: 0,
        featuredMediaId: '00000000-0000-4000-8000-000000000004',
        gallery: [
          {
            id: '00000000-0000-4000-8000-000000000004',
            url: '/media/catalog/linen-suit-front.webp',
            width: 1024,
            height: 1536,
            alt: 'نمای روبه‌روی کت لینن بژ',
            focalPoint: { x: 0.5, y: 0.45 },
          },
        ],
        skus: [
          {
            id: '00000000-0000-4000-8000-000000000005',
            code: 'KELE-LINEN-5Y',
            normalizedSize: '5y',
            displaySize: '۵ سال',
            status: 'draft',
            price: {
              amountRial: 39_800_000,
              currency: 'IRR',
              display: '۳٬۹۸۰٬۰۰۰ تومان',
            },
            inventory: {
              skuId: '00000000-0000-4000-8000-000000000005',
              physicalQuantity: 0,
              reservedQuantity: 0,
              availableQuantity: 0,
              version: 1,
            },
          },
        ],
      },
    ],
  };
}

describe('قواعد دامنهٔ کاتالوگ', () => {
  it('محصول معتبر را حتی با موجودی صفر قابل انتشار می‌داند', () => {
    expect(validateProductPublication(validProduct())).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('شکست‌های انتشار را به PUB-006، PUB-007 و PUB-008 نگاشت می‌کند', () => {
    const product = validProduct();
    const variant = product.variants[0];
    const sku = variant?.skus[0];
    if (variant === undefined || sku === undefined) {
      throw new Error('Expected the valid fixture to contain one variant and SKU.');
    }
    product.categories = [];
    variant.gallery = [];
    variant.featuredMediaId = null;
    sku.price = null;
    sku.inventory = null;

    const ruleIds = validateProductPublication(product).errors.map((failure) => failure.ruleId);
    expect(ruleIds).toEqual(expect.arrayContaining(['PUB-006', 'PUB-007', 'PUB-008']));
  });

  it('کاهش موجودی به زیر صفر یا رزروشده را رد می‌کند', () => {
    expect(() =>
      applyInventoryDelta(
        {
          skuId: '00000000-0000-4000-8000-000000000005',
          physicalQuantity: 3,
          reservedQuantity: 2,
          availableQuantity: 1,
          version: 1,
        },
        { action: 'sale', quantity: 2, reason: 'فروش حضوری' },
      ),
    ).toThrow(InventoryInvariantError);
  });

  it('نویسه‌های عربی و نیم‌فاصله را برای جست‌وجوی فارسی یکسان می‌کند', () => {
    expect(normalizePersianSearch('  كُت‌ لِينِن!  ')).toBe('کت لینن');
  });
});

function guardContext(cookie: string | undefined): ExecutionContext {
  const request: { headers: { cookie?: string }; catalogActor?: unknown } = {
    headers: {},
  };
  if (cookie !== undefined) request.headers.cookie = cookie;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => guardContext,
    getClass: () => guardContext,
  } as unknown as ExecutionContext;
}

describe('مجوزهای مدیریت کاتالوگ', () => {
  it('درخواست بدون نشست را رد می‌کند', () => {
    const reflector = {
      getAllAndOverride: () => ['super_admin'],
    } as unknown as Reflector;
    expect(() => new AdminSessionGuard(reflector).canActivate(guardContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('مدیر موجودی را از عملیات مختص مدیر کل منع می‌کند', () => {
    const reflector = {
      getAllAndOverride: () => ['super_admin'],
    } as unknown as Reflector;
    expect(() =>
      new AdminSessionGuard(reflector).canActivate(
        guardContext(`kele_session=${inventorySession}`),
      ),
    ).toThrow(ForbiddenException);
  });

  it('نشست مدیر کل را برای عملیات انتشار می‌پذیرد', () => {
    const reflector = {
      getAllAndOverride: () => ['super_admin'],
    } as unknown as Reflector;
    expect(
      new AdminSessionGuard(reflector).canActivate(guardContext(`kele_session=${superSession}`)),
    ).toBe(true);
  });
});
