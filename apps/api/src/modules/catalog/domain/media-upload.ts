export type RasterContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export type InspectedRaster = Readonly<{
  width: number;
  height: number;
  format: 'jpg' | 'png' | 'webp';
  extension: 'jpg' | 'png' | 'webp';
}>;

export class MediaUploadValidationError extends Error {}

const maxBytes = 10 * 1024 * 1024;
const maxDimension = 12_000;
const maxPixels = 64_000_000;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function uint16BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) * 256 + (bytes[offset + 1] ?? 0);
}

function uint16LittleEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) + (bytes[offset + 1] ?? 0) * 256;
}

function uint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) + (bytes[offset + 1] ?? 0) * 256 + (bytes[offset + 2] ?? 0) * 65_536;
}

function inspectPng(bytes: Uint8Array): Pick<InspectedRaster, 'width' | 'height'> | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || signature.some((value, index) => bytes[index] !== value)) return null;
  if (ascii(bytes, 12, 4) !== 'IHDR') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

const jpegSizeMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function inspectJpeg(bytes: Uint8Array): Pick<InspectedRaster, 'width' | 'height'> | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 1;
      continue;
    }
    const segmentLength = uint16BigEndian(bytes, offset + 1);
    if (segmentLength < 2 || offset + 1 + segmentLength > bytes.length) return null;
    if (jpegSizeMarkers.has(marker)) {
      return {
        height: uint16BigEndian(bytes, offset + 4),
        width: uint16BigEndian(bytes, offset + 6),
      };
    }
    offset += 1 + segmentLength;
  }
  return null;
}

function inspectWebp(bytes: Uint8Array): Pick<InspectedRaster, 'width' | 'height'> | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    return null;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8X') {
    return {
      width: uint24LittleEndian(bytes, 24) + 1,
      height: uint24LittleEndian(bytes, 27) + 1,
    };
  }
  if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    const first = bytes[21] ?? 0;
    const second = bytes[22] ?? 0;
    const third = bytes[23] ?? 0;
    const fourth = bytes[24] ?? 0;
    return {
      width: 1 + (first | ((second & 0x3f) << 8)),
      height: 1 + ((second >> 6) | (third << 2) | ((fourth & 0x0f) << 10)),
    };
  }
  if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      width: uint16LittleEndian(bytes, 26) & 0x3fff,
      height: uint16LittleEndian(bytes, 28) & 0x3fff,
    };
  }
  return null;
}

export function inspectRaster(
  bytes: Uint8Array,
  declaredContentType: RasterContentType,
): InspectedRaster {
  if (bytes.byteLength < 24 || bytes.byteLength > maxBytes) {
    throw new MediaUploadValidationError('حجم فایل باید کمتر از ۱۰ مگابایت باشد.');
  }

  const inspected =
    declaredContentType === 'image/png'
      ? inspectPng(bytes)
      : declaredContentType === 'image/jpeg'
        ? inspectJpeg(bytes)
        : inspectWebp(bytes);
  if (inspected === null) {
    throw new MediaUploadValidationError('امضای فایل با فرمت اعلام‌شده مطابقت ندارد.');
  }
  if (
    inspected.width < 1 ||
    inspected.height < 1 ||
    inspected.width > maxDimension ||
    inspected.height > maxDimension ||
    inspected.width * inspected.height > maxPixels
  ) {
    throw new MediaUploadValidationError(
      'ابعاد یا تعداد پیکسل‌های تصویر از محدودهٔ امن بیشتر است.',
    );
  }
  const format =
    declaredContentType === 'image/jpeg'
      ? ('jpg' as const)
      : declaredContentType === 'image/png'
        ? ('png' as const)
        : ('webp' as const);
  return { ...inspected, format, extension: format };
}
