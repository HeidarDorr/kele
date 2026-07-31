const tomanFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  useGrouping: true,
});

export function irrToToman(amountRial: number): number {
  if (!Number.isSafeInteger(amountRial) || amountRial < 0) {
    throw new RangeError('IRR amount must be a non-negative safe integer.');
  }
  return amountRial / 10;
}

export function formatIrrAsToman(amountRial: number): string {
  return `${tomanFormatter.format(irrToToman(amountRial))} تومان`;
}
