import { createHash, randomUUID } from 'node:crypto';

export type IdFactory = () => string;
export type Clock = () => Date;

export function runtimeClock(fixedTime: string | undefined): Clock {
  if (fixedTime === undefined) return () => new Date();
  const epochMilliseconds = Date.parse(fixedTime);
  if (!Number.isFinite(epochMilliseconds))
    throw new Error('E2E fixed time must be valid ISO time.');
  return () => new Date(epochMilliseconds);
}

export function runtimeIdFactory(seed: string | undefined, scope: string): IdFactory {
  if (seed === undefined) return randomUUID;
  let sequence = 0;
  return () => {
    sequence += 1;
    const bytes = createHash('sha256')
      .update(`${seed}:${scope}:${String(sequence)}`)
      .digest()
      .subarray(0, 16);
    bytes.writeUInt8((bytes.readUInt8(6) & 0x0f) | 0x40, 6);
    bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8);
    const hexadecimal = bytes.toString('hex');
    return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`;
  };
}

export function runtimeOrderedIdFactory(seed: string | undefined, scope: string): IdFactory {
  if (seed === undefined) return randomUUID;
  let sequence = 0;
  return () => {
    sequence += 1;
    const ordinal = sequence.toString(16).padStart(12, '0');
    const hexadecimal = createHash('sha256')
      .update(`${seed}:${scope}:${String(sequence)}`)
      .digest('hex');
    const variant = ((Number.parseInt(hexadecimal[3] ?? '0', 16) & 0x3) | 0x8).toString(16);
    return `${ordinal.slice(0, 8)}-${ordinal.slice(8)}-4${hexadecimal.slice(0, 3)}-${variant}${hexadecimal.slice(4, 7)}-${hexadecimal.slice(7, 19)}`;
  };
}
