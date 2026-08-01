'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { commerceApi, commerceErrorMessage, type Cart } from '../lib/commerce-api';
import { CartDrawer } from './cart-drawer';

type CartContextValue = Readonly<{
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  busyLineId: string | null;
  drawerOpen: boolean;
  announcement: string;
  openDrawer(): void;
  closeDrawer(): void;
  refresh(): Promise<void>;
  addProduct(skuId: string, quantity?: number): Promise<boolean>;
  updateLine(lineId: string, quantity: number): Promise<void>;
  removeLine(lineId: string): Promise<void>;
  clear(): Promise<void>;
}>;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCart(await commerceApi.cart());
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const authenticated = () => {
      void refresh();
    };
    window.addEventListener('kele:authenticated', authenticated);
    return () => {
      window.removeEventListener('kele:authenticated', authenticated);
    };
  }, [refresh]);

  const runMutation = useCallback(
    async (lineId: string, mutation: (current: Cart) => Promise<Cart | undefined>) => {
      if (cart === null) return false;
      setBusyLineId(lineId);
      setError(null);
      try {
        const result = await mutation(cart);
        if (result === undefined) await refresh();
        else setCart(result);
        return true;
      } catch (requestError: unknown) {
        setError(commerceErrorMessage(requestError));
        await refresh();
        return false;
      } finally {
        setBusyLineId(null);
      }
    },
    [cart, refresh],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      error,
      busyLineId,
      drawerOpen,
      announcement,
      openDrawer: () => {
        setDrawerOpen(true);
      },
      closeDrawer: () => {
        setDrawerOpen(false);
      },
      refresh,
      addProduct: async (skuId, quantity = 1) => {
        if (cart === null) {
          await refresh();
          return false;
        }
        const succeeded = await runMutation(skuId, (current) =>
          commerceApi.addProduct(skuId, quantity, current.version),
        );
        if (succeeded) {
          setAnnouncement('محصول به سبد اضافه شد.');
          setDrawerOpen(true);
        }
        return succeeded;
      },
      updateLine: async (lineId, quantity) => {
        await runMutation(lineId, (current) =>
          commerceApi.updateLine(lineId, quantity, current.version),
        );
      },
      removeLine: async (lineId) => {
        if (
          await runMutation(lineId, (current) => commerceApi.removeLine(lineId, current.version))
        ) {
          setAnnouncement('انتخاب از سبد حذف شد.');
        }
      },
      clear: async () => {
        if (await runMutation('cart', (current) => commerceApi.clearCart(current.version))) {
          setAnnouncement('سبد خالی شد.');
        }
      },
    }),
    [announcement, busyLineId, cart, drawerOpen, error, loading, refresh, runMutation],
  );

  return (
    <CartContext value={value}>
      {children}
      <CartDrawer />
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </CartContext>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) throw new Error('useCart must be rendered inside CartProvider.');
  return context;
}
