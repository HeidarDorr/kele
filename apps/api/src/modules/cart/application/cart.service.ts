import { formatIrrAsToman } from '@kele/design-system/money';
import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type {
  CartCatalogProduct,
  CartCatalogReader,
} from '../../catalog/application/cart-catalog.contract.js';
import { planDeterministicMerge } from '../domain/cart-merge.js';
import type { CartLineInput, CartLineRecord, CartRecord, CartView } from '../domain/cart.types.js';
import type { CartRepository } from './cart.repository.js';
import type { OutfitCartReader, OutfitCartSelection } from './outfit-cart.contract.js';

export class CartService {
  constructor(
    private readonly repository: CartRepository,
    private readonly catalog: CartCatalogReader,
    private readonly outfits: OutfitCartReader,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async createAnonymousCart(): Promise<CartView> {
    return this.toView(await this.repository.createAnonymousCart());
  }

  async getCustomerCart(customerId: string): Promise<CartView> {
    return this.toView(await this.repository.getOrCreateCustomerCart(customerId));
  }

  async getCart(cartId: string): Promise<CartView> {
    return this.toView(await this.repository.getActiveCart(cartId));
  }

  addLine(cartId: string, expectedVersion: number, input: CartLineInput): Promise<CartView> {
    return this.unitOfWork.run(async () => {
      if (input.kind === 'product') {
        const product = await this.requireProduct(input.skuId);
        return this.toView(
          await this.repository.addProduct(cartId, expectedVersion, product, input.quantity),
        );
      }
      const outfit = await this.requireOutfit(input.outfitRevisionId, input.size);
      return this.toView(
        await this.repository.addOutfit(cartId, expectedVersion, outfit, input.quantity),
      );
    });
  }

  updateLine(
    cartId: string,
    lineId: string,
    expectedVersion: number,
    quantity: number,
  ): Promise<CartView> {
    return this.unitOfWork.run(async () => {
      const cart = await this.repository.getActiveCart(cartId);
      const line = cart.lines.find((candidate) => candidate.id === lineId);
      if (line === undefined) {
        throw new ApplicationError('not_found', 'CART_LINE_NOT_FOUND', 'Cart line was not found.');
      }
      const current = await this.currentLineState(line, quantity);
      return this.toView(
        await this.repository.updateLine(
          cartId,
          lineId,
          expectedVersion,
          quantity,
          current.status,
          current.unitPriceRial,
        ),
      );
    });
  }

  removeLine(cartId: string, lineId: string, expectedVersion: number): Promise<void> {
    return this.unitOfWork.run(() => this.repository.removeLine(cartId, lineId, expectedVersion));
  }

  clear(cartId: string, expectedVersion: number): Promise<void> {
    return this.unitOfWork.run(() => this.repository.clear(cartId, expectedVersion));
  }

  mergeGuestCart(
    customerId: string,
    guestCartId: string | null,
  ): Promise<{ cart: CartView; mergePerformed: boolean }> {
    return this.unitOfWork.run(async () => {
      const customerCart = await this.repository.getOrCreateCustomerCart(customerId);
      if (guestCartId === null || guestCartId === customerCart.id) {
        return { cart: await this.toView(customerCart), mergePerformed: false };
      }
      const replay = await this.repository.getMergedCustomerCart(guestCartId, customerCart.id);
      if (replay !== null) {
        return { cart: await this.toView(replay), mergePerformed: false };
      }
      const guestCart = await this.repository.getActiveCart(guestCartId);
      if (guestCart.customerId !== null) {
        throw new ApplicationError(
          'not_found',
          'GUEST_CART_NOT_FOUND',
          'Guest cart was not found.',
        );
      }

      const productStates = new Map<string, { purchasable: boolean; available: number }>();
      const outfitStates = new Map<string, boolean>();
      for (const line of guestCart.lines) {
        if (line.kind === 'product' && line.skuId !== null) {
          const product = await this.catalog.getProductForCart(line.skuId);
          productStates.set(line.skuId, {
            purchasable: product?.purchasable === true,
            available: product?.availableQuantity ?? 0,
          });
        } else if (line.outfitRevisionId !== null && line.outfitSize !== null) {
          const outfit = await this.outfits.getOutfitForCart(
            line.outfitRevisionId,
            line.outfitSize,
          );
          outfitStates.set(
            `${line.outfitRevisionId}:${line.outfitSize}`,
            outfit?.purchasable === true,
          );
        }
      }
      const instructions = planDeterministicMerge(customerCart.lines, guestCart.lines, {
        productAvailability: productStates,
        outfitPurchasability: outfitStates,
      });
      const result = await this.repository.applyMerge(customerCart.id, guestCart.id, instructions);
      return { cart: await this.toView(result.cart), mergePerformed: result.mergePerformed };
    });
  }

  private async toView(cart: CartRecord): Promise<CartView> {
    const lines = await Promise.all(
      cart.lines.map(async (line) => {
        const current = await this.currentLineState(line, line.quantity);
        return {
          id: line.id,
          kind: line.kind,
          title: current.title,
          selection: current.selection,
          skuCode: current.skuCode,
          image: current.image,
          quantity: line.quantity,
          status: current.status,
          checkoutBlocking: current.status !== 'available',
          unitPrice: {
            amountRial: current.unitPriceRial,
            currency: 'IRR' as const,
            display: formatIrrAsToman(current.unitPriceRial),
          },
        };
      }),
    );
    const amountRial = lines.reduce((sum, line) => {
      const next = sum + line.unitPrice.amountRial * line.quantity;
      if (!Number.isSafeInteger(next)) throw new Error('Cart total exceeds safe integer range.');
      return next;
    }, 0);
    return {
      id: cart.id,
      version: cart.version,
      lines,
      informationalTotal: {
        amountRial,
        currency: 'IRR',
        display: formatIrrAsToman(amountRial),
      },
      checkoutBlocked: lines.some((line) => line.checkoutBlocking),
      mergeNotices: cart.notices,
    };
  }

  private async currentLineState(line: CartLineRecord, quantity: number) {
    if (line.kind === 'product' && line.skuId !== null) {
      const product = await this.catalog.getProductForCart(line.skuId);
      const available = product?.purchasable === true && product.availableQuantity >= quantity;
      return {
        title: product?.title ?? line.titleSnapshot,
        selection: product?.selection ?? line.selectionSnapshot,
        skuCode: product?.skuCode ?? line.skuCodeSnapshot,
        image: product?.image ?? line.imageSnapshot,
        unitPriceRial: product?.unitPriceRial ?? line.unitPriceRial,
        status: available ? ('available' as const) : ('unavailable' as const),
      };
    }
    if (line.outfitRevisionId === null || line.outfitSize === null) {
      throw new Error('Outfit cart line is missing its immutable selection.');
    }
    const outfit = await this.outfits.getOutfitForCart(line.outfitRevisionId, line.outfitSize);
    return {
      title: outfit?.title ?? line.titleSnapshot,
      selection: outfit?.size ?? line.selectionSnapshot,
      skuCode: null,
      image: line.imageSnapshot,
      unitPriceRial: outfit?.unitPriceRial ?? line.unitPriceRial,
      status:
        outfit?.purchasable === true && outfit.availableQuantity >= quantity
          ? ('available' as const)
          : ('requires_review' as const),
    };
  }

  private async requireProduct(skuId: string): Promise<CartCatalogProduct> {
    const product = await this.catalog.getProductForCart(skuId);
    if (product === null) {
      throw new ApplicationError('not_found', 'SKU_NOT_FOUND', 'SKU was not found.');
    }
    return product;
  }

  private async requireOutfit(revisionId: string, size: string): Promise<OutfitCartSelection> {
    const outfit = await this.outfits.getOutfitForCart(revisionId, size);
    if (outfit === null) {
      throw new ApplicationError(
        'conflict',
        'OUTFIT_REVISION_UNAVAILABLE',
        'Outfit revision is not available for a new cart line.',
      );
    }
    return outfit;
  }
}
