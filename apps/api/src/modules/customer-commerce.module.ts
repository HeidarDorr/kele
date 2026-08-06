import { Module } from '@nestjs/common';
import type { SmsGateway } from './foundation/application/sms-gateway.port.js';
import { SMS_GATEWAY } from './foundation/application/provider.tokens.js';
import { FoundationModule } from './foundation/foundation.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import {
  CART_CATALOG_READER,
  type CartCatalogReader,
} from './catalog/application/cart-catalog.contract.js';
import { PrismaTransactionContext } from '../infrastructure/prisma/prisma-transaction.context.js';
import { UNIT_OF_WORK, type UnitOfWork } from '../shared/unit-of-work.js';
import { environment } from '../platform/config/environment.js';
import { CART_REPOSITORY, type CartRepository } from './cart/application/cart.repository.js';
import { PrismaCartRepository } from './cart/infrastructure/prisma-cart.repository.js';
import { CartService } from './cart/application/cart.service.js';
import {
  CART_CHECKOUT_LIFECYCLE,
  type CartCheckoutLifecycle,
} from './cart/application/cart-checkout-lifecycle.contract.js';
import {
  OUTFIT_CART_READER,
  type OutfitCartReader,
} from './cart/application/outfit-cart.contract.js';
import { OutfitModule } from './outfit/outfit.module.js';
import { OutfitService } from './outfit/application/outfit.service.js';
import { CartAccessResolver } from './cart/presentation/cart-access.js';
import { CartController } from './cart/presentation/cart.controller.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from './identity/application/identity.repository.js';
import { PrismaIdentityRepository } from './identity/infrastructure/prisma-identity.repository.js';
import { IdentityService } from './identity/application/identity.service.js';
import { CustomerService } from './identity/application/customer.service.js';
import { CookieSecurity } from './identity/infrastructure/cookie-security.js';
import {
  CustomerCsrfGuard,
  CustomerSessionGuard,
} from './identity/presentation/customer-session.guard.js';
import {
  CustomerController,
  IdentityController,
} from './identity/presentation/identity.controller.js';
import {
  CHECKOUT_CART_PORT,
  type CheckoutCartPort,
} from './cart/application/checkout-cart.contract.js';
import { PrismaCheckoutCartAdapter } from './cart/infrastructure/prisma-checkout-cart.adapter.js';
import {
  CHECKOUT_CUSTOMER_PORT,
  type CheckoutCustomerPort,
} from './identity/application/checkout-customer.contract.js';
import { PrismaCheckoutCustomerAdapter } from './identity/infrastructure/prisma-checkout-customer.adapter.js';
import {
  CHECKOUT_CATALOG_PORT,
  type CheckoutCatalogPort,
} from './catalog/application/checkout-catalog.contract.js';
import {
  CHECKOUT_REPOSITORY,
  type CheckoutRepository,
} from './checkout/application/checkout.repository.js';
import { PrismaCheckoutRepository } from './checkout/infrastructure/prisma-checkout.repository.js';
import { CheckoutService } from './checkout/application/checkout.service.js';
import { PaymentService } from './checkout/application/payment.service.js';
import { CheckoutJobService } from './checkout/application/checkout-job.service.js';
import { CheckoutJobScheduler } from './checkout/infrastructure/checkout-job.scheduler.js';
import type { PaymentGateway } from './foundation/application/payment-gateway.port.js';
import type { FakePaymentSimulator } from './foundation/application/fake-payment-simulator.port.js';
import {
  FAKE_PAYMENT_SIMULATOR,
  PAYMENT_GATEWAY,
} from './foundation/application/provider.tokens.js';
import {
  AdminShippingController,
  CheckoutController,
  ShippingController,
} from './checkout/presentation/checkout.controller.js';
import { AdminSessionGuard } from './catalog/presentation/admin-session.guard.js';
import {
  runtimeClock,
  runtimeIdFactory,
  runtimeOrderedIdFactory,
} from '../shared/deterministic-runtime.js';
import {
  CHECKOUT_OUTFIT_PORT,
  type CheckoutOutfitPort,
} from './checkout/application/checkout-outfit.contract.js';
import {
  AdminOperationsController,
  CustomerOperationsController,
} from './operations/presentation/operations.controller.js';
import {
  OPERATIONS_REPOSITORY,
  type OperationsRepository,
} from './operations/application/operations.repository.js';
import { PrismaOperationsRepository } from './operations/infrastructure/prisma-operations.repository.js';
import { OperationsService } from './operations/application/operations.service.js';
import type { RefundGateway } from './foundation/application/refund-gateway.port.js';
import { REFUND_GATEWAY } from './foundation/application/provider.tokens.js';
import {
  OPERATIONAL_TELEMETRY,
  type OperationalTelemetry,
} from '../shared/operational-telemetry.js';

@Module({
  imports: [FoundationModule, CatalogModule, OutfitModule],
  controllers: [
    IdentityController,
    CustomerController,
    CartController,
    ShippingController,
    CheckoutController,
    AdminShippingController,
    CustomerOperationsController,
    AdminOperationsController,
  ],
  providers: [
    AdminSessionGuard,
    CustomerSessionGuard,
    CustomerCsrfGuard,
    CartAccessResolver,
    { provide: OUTFIT_CART_READER, useExisting: OutfitService },
    { provide: CHECKOUT_OUTFIT_PORT, useExisting: OutfitService },
    {
      provide: CART_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): CartRepository =>
        new PrismaCartRepository(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: CHECKOUT_CART_PORT,
      useFactory: (transactions: PrismaTransactionContext): CheckoutCartPort =>
        new PrismaCheckoutCartAdapter(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: CHECKOUT_CUSTOMER_PORT,
      useFactory: (transactions: PrismaTransactionContext): CheckoutCustomerPort =>
        new PrismaCheckoutCustomerAdapter(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: CHECKOUT_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): CheckoutRepository =>
        new PrismaCheckoutRepository(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: CartService,
      useFactory: (
        repository: CartRepository,
        catalog: CartCatalogReader,
        outfits: OutfitCartReader,
        unitOfWork: UnitOfWork,
        checkoutLifecycle: CartCheckoutLifecycle,
      ): CartService =>
        new CartService(repository, catalog, outfits, unitOfWork, checkoutLifecycle),
      inject: [
        CART_REPOSITORY,
        CART_CATALOG_READER,
        OUTFIT_CART_READER,
        UNIT_OF_WORK,
        CART_CHECKOUT_LIFECYCLE,
      ],
    },
    {
      provide: IDENTITY_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): IdentityRepository =>
        new PrismaIdentityRepository(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: IdentityService,
      useFactory: (
        repository: IdentityRepository,
        carts: CartService,
        sms: SmsGateway,
        unitOfWork: UnitOfWork,
        telemetry: OperationalTelemetry,
      ): IdentityService =>
        new IdentityService(
          repository,
          carts,
          sms,
          unitOfWork,
          environment.IDENTITY_SIGNING_SECRET,
          environment.OTP_VERIFIER_PEPPER,
          () => environment.FAKE_SMS_OTP_CODE,
          runtimeClock(environment.E2E_FIXED_TIME),
          telemetry,
        ),
      inject: [IDENTITY_REPOSITORY, CartService, SMS_GATEWAY, UNIT_OF_WORK, OPERATIONAL_TELEMETRY],
    },
    {
      provide: CustomerService,
      useFactory: (repository: IdentityRepository, unitOfWork: UnitOfWork): CustomerService =>
        new CustomerService(repository, unitOfWork),
      inject: [IDENTITY_REPOSITORY, UNIT_OF_WORK],
    },
    {
      provide: CookieSecurity,
      useFactory: (): CookieSecurity =>
        new CookieSecurity(
          environment.IDENTITY_SIGNING_SECRET,
          environment.NODE_ENV === 'production',
        ),
    },
    {
      provide: CheckoutService,
      useFactory: (
        repository: CheckoutRepository,
        carts: CheckoutCartPort,
        customers: CheckoutCustomerPort,
        catalog: CheckoutCatalogPort,
        outfits: CheckoutOutfitPort,
        unitOfWork: UnitOfWork,
      ): CheckoutService =>
        new CheckoutService(
          repository,
          carts,
          customers,
          catalog,
          outfits,
          unitOfWork,
          runtimeClock(environment.E2E_FIXED_TIME),
          runtimeIdFactory(environment.E2E_DETERMINISTIC_ID_SEED, 'checkout'),
        ),
      inject: [
        CHECKOUT_REPOSITORY,
        CHECKOUT_CART_PORT,
        CHECKOUT_CUSTOMER_PORT,
        CHECKOUT_CATALOG_PORT,
        CHECKOUT_OUTFIT_PORT,
        UNIT_OF_WORK,
      ],
    },
    {
      provide: PaymentService,
      useFactory: (
        repository: CheckoutRepository,
        gateway: PaymentGateway,
        simulator: FakePaymentSimulator,
        catalog: CheckoutCatalogPort,
        carts: CheckoutCartPort,
        unitOfWork: UnitOfWork,
        telemetry: OperationalTelemetry,
      ): PaymentService =>
        new PaymentService(
          repository,
          gateway,
          simulator,
          catalog,
          carts,
          unitOfWork,
          environment.STOREFRONT_ORIGIN,
          runtimeClock(environment.E2E_FIXED_TIME),
          runtimeIdFactory(environment.E2E_DETERMINISTIC_ID_SEED, 'payment'),
          telemetry,
        ),
      inject: [
        CHECKOUT_REPOSITORY,
        PAYMENT_GATEWAY,
        FAKE_PAYMENT_SIMULATOR,
        CHECKOUT_CATALOG_PORT,
        CHECKOUT_CART_PORT,
        UNIT_OF_WORK,
        OPERATIONAL_TELEMETRY,
      ],
    },
    { provide: CART_CHECKOUT_LIFECYCLE, useExisting: CheckoutService },
    {
      provide: CheckoutJobService,
      useFactory: (
        repository: CheckoutRepository,
        checkouts: CheckoutService,
        unitOfWork: UnitOfWork,
        telemetry: OperationalTelemetry,
      ): CheckoutJobService =>
        new CheckoutJobService(
          repository,
          checkouts,
          unitOfWork,
          runtimeClock(environment.E2E_FIXED_TIME),
          telemetry,
        ),
      inject: [CHECKOUT_REPOSITORY, CheckoutService, UNIT_OF_WORK, OPERATIONAL_TELEMETRY],
    },
    {
      provide: OPERATIONS_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): OperationsRepository =>
        new PrismaOperationsRepository(
          transactions,
          runtimeOrderedIdFactory(environment.E2E_DETERMINISTIC_ID_SEED, 'operations'),
        ),
      inject: [PrismaTransactionContext],
    },
    {
      provide: OperationsService,
      useFactory: (
        repository: OperationsRepository,
        refunds: RefundGateway,
        unitOfWork: UnitOfWork,
        telemetry: OperationalTelemetry,
      ): OperationsService =>
        new OperationsService(
          repository,
          refunds,
          unitOfWork,
          runtimeClock(environment.E2E_FIXED_TIME),
          telemetry,
        ),
      inject: [OPERATIONS_REPOSITORY, REFUND_GATEWAY, UNIT_OF_WORK, OPERATIONAL_TELEMETRY],
    },
    CheckoutJobScheduler,
  ],
})
export class CustomerCommerceModule {}
