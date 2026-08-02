import type {
  AddressSnapshot,
  ShippingMethodCodeValue,
  ShippingOptionValue,
  ShippingSettingsRecord,
} from './checkout.types.js';

const persianArabicMarks = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const whitespace = /[\s\u200c\u200d]+/g;

function normalizePlace(value: string): string {
  return value
    .normalize('NFKC')
    .replace(persianArabicMarks, '')
    .replace(/[كي]/g, (character) => (character === 'ك' ? 'ک' : 'ی'))
    .replace(whitespace, '')
    .toLocaleLowerCase('fa-IR');
}

export function normalizeAddressZone(
  address: Omit<AddressSnapshot, 'normalizedZone'>,
): string | null {
  const province = normalizePlace(address.province);
  const city = normalizePlace(address.city);
  return province === 'تهران' && city === 'تهران' ? 'tehran' : null;
}

export function quoteShippingOptions(
  settings: ShippingSettingsRecord,
  address: AddressSnapshot,
  itemsSubtotalRial: number,
): ShippingOptionValue[] {
  if (!Number.isSafeInteger(itemsSubtotalRial) || itemsSubtotalRial < 0) {
    throw new Error('Shipping subtotal must be a non-negative safe integer IRR value.');
  }
  const threshold = settings.freeShippingThresholdRial;
  const freeShippingApplied = threshold !== null && itemsSubtotalRial >= threshold;
  return settings.methods
    .toSorted((left, right) => left.displayOrder - right.displayOrder)
    .map((method) => {
      const localCourierOutsideTehran =
        method.code === 'tehran_local_courier' && address.normalizedZone !== 'tehran';
      const eligible = method.enabled && !localCourierOutsideTehran;
      return {
        method: method.code,
        name: method.name,
        eligible,
        ineligibilityCode: !method.enabled
          ? 'SHIPPING_METHOD_DISABLED'
          : localCourierOutsideTehran
            ? 'LOCAL_COURIER_OUTSIDE_TEHRAN'
            : null,
        quotedPriceRial: freeShippingApplied ? 0 : method.fixedPriceRial,
        fixedPriceRial: method.fixedPriceRial,
        eligibilitySubtotalRial: itemsSubtotalRial,
        freeShippingApplied,
        freeShippingThresholdRial: threshold,
        settingsVersion: settings.version,
      };
    });
}

export class ShippingEligibilityError extends Error {
  constructor(public readonly code: string) {
    super('Shipping method is not eligible.');
  }
}

export function requireEligibleShippingOption(
  options: readonly ShippingOptionValue[],
  method: ShippingMethodCodeValue,
): ShippingOptionValue {
  const selected = options.find((option) => option.method === method);
  if (selected === undefined || !selected.eligible) {
    throw new ShippingEligibilityError(
      selected?.ineligibilityCode ?? 'SHIPPING_METHOD_UNAVAILABLE',
    );
  }
  return selected;
}
