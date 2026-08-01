import type { components } from '@kele/api-contract';

export type Cart = components['schemas']['Cart'];
export type CartLine = Cart['lines'][number];
export type Customer = components['schemas']['Customer'];
export type Address = components['schemas']['Address'];
export type AddressInput = components['schemas']['AddressInput'];
export type AuthenticationResult = components['schemas']['AuthenticationResult'];

export class CommerceApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function cookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

async function request<T>(path: string, init: RequestInit & { version?: number } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  const csrf = cookie('kele_csrf');
  if (csrf !== null && init.method !== undefined && init.method !== 'GET') {
    headers.set('x-csrf-token', csrf);
  }
  if (init.version !== undefined) headers.set('if-match', `"${String(init.version)}"`);
  const response = await fetch(`/api/commerce${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      code?: string;
      detail?: string;
    } | null;
    throw new CommerceApiError(
      response.status,
      problem?.code ?? 'NETWORK_REQUEST_FAILED',
      problem?.detail ?? `Commerce request failed with ${String(response.status)}.`,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const commerceApi = {
  cart: () => request<Cart>('/cart'),
  addProduct: (skuId: string, quantity: number, version: number) =>
    request<Cart>('/cart/lines', {
      method: 'POST',
      version,
      body: JSON.stringify({ kind: 'product', skuId, quantity }),
    }),
  updateLine: (lineId: string, quantity: number, version: number) =>
    request<Cart>(`/cart/lines/${encodeURIComponent(lineId)}`, {
      method: 'PATCH',
      version,
      body: JSON.stringify({ quantity }),
    }),
  removeLine: (lineId: string, version: number) =>
    request<undefined>(`/cart/lines/${encodeURIComponent(lineId)}`, {
      method: 'DELETE',
      version,
    }),
  clearCart: (version: number) => request<undefined>('/cart', { method: 'DELETE', version }),
  createChallenge: (mobile: string) =>
    request<{ challengeId: string; retryAfterSeconds: number; expiresAt: string }>(
      '/auth/otp/challenges',
      { method: 'POST', body: JSON.stringify({ mobile }) },
    ),
  verifyChallenge: (challengeId: string, code: string) =>
    request<AuthenticationResult>('/auth/otp/verifications', {
      method: 'POST',
      body: JSON.stringify({ challengeId, code }),
    }),
  logout: () => request<undefined>('/auth/session', { method: 'DELETE' }),
  customer: () => request<Customer>('/me'),
  updateCustomer: (input: { firstName?: string; lastName?: string }) =>
    request<Customer>('/me', { method: 'PATCH', body: JSON.stringify(input) }),
  addresses: () => request<Address[]>('/me/addresses'),
  createAddress: (input: AddressInput) =>
    request<Address>('/me/addresses', { method: 'POST', body: JSON.stringify(input) }),
  updateAddress: (id: string, input: AddressInput) =>
    request<Address>(`/me/addresses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteAddress: (id: string) =>
    request<undefined>(`/me/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export function commerceErrorMessage(error: unknown): string {
  if (!(error instanceof CommerceApiError))
    return 'ارتباط با فروشگاه برقرار نشد. دوباره تلاش کنید.';
  const messages: Record<string, string> = {
    CART_VERSION_CONFLICT: 'سبد در جای دیگری تغییر کرده است. نسخه تازه بارگذاری شد.',
    CART_QUANTITY_LIMIT: 'تعداد این انتخاب نمی‌تواند بیشتر از ۲۰ باشد.',
    CSRF_VALIDATION_FAILED: 'نشست ایمن شما تازه شد. صفحه را دوباره بارگذاری کنید.',
    OTP_RATE_LIMITED: 'درخواست‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
    OTP_VERIFICATION_FAILED: 'کد واردشده نامعتبر یا منقضی است.',
    SESSION_REQUIRED: 'برای ادامه وارد حساب خود شوید.',
    ADDRESS_NOT_FOUND: 'این نشانی پیدا نشد یا متعلق به حساب دیگری است.',
  };
  return messages[error.code] ?? 'انجام درخواست ممکن نشد. دوباره تلاش کنید.';
}
