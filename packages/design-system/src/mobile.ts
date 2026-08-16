const e164IranianMobile = /^\+989[0-9]{9}$/;

function latinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/gu, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/gu, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

export function normalizeIranianMobile(value: string): string {
  const compact = latinDigits(value.trim()).replace(/[\s\-()]/gu, '');
  if (e164IranianMobile.test(compact)) return compact;
  if (/^09[0-9]{9}$/u.test(compact)) return `+98${compact.slice(1)}`;
  if (/^9[0-9]{9}$/u.test(compact)) return `+98${compact}`;
  return compact;
}

export function isIranianMobile(value: string): boolean {
  return e164IranianMobile.test(normalizeIranianMobile(value));
}
