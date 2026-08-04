import { createHash } from 'node:crypto';

export type CommandFingerprint = Readonly<{
  commandType: string;
  targetId: string;
  requestHash: string;
}>;

function canonicalJson(value: unknown, ancestors: WeakSet<object>): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) {
        throw new TypeError('Command fingerprint values must contain only finite numbers.');
      }
      return JSON.stringify(value);
    case 'object': {
      if (ancestors.has(value)) {
        throw new TypeError('Command fingerprint values must not contain circular references.');
      }
      ancestors.add(value);
      try {
        if (Object.getOwnPropertySymbols(value).length > 0) {
          throw new TypeError('Command fingerprint values must not contain symbol keys.');
        }
        if (Array.isArray(value)) {
          const items: string[] = [];
          for (let index = 0; index < value.length; index += 1) {
            if (!Object.prototype.hasOwnProperty.call(value, index)) {
              throw new TypeError('Command fingerprint arrays must not contain empty slots.');
            }
            items.push(canonicalJson(value[index], ancestors));
          }
          return `[${items.join(',')}]`;
        }

        const prototype = Reflect.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
          throw new TypeError('Command fingerprint values must contain only plain objects.');
        }
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key], ancestors)}`)
          .join(',')}}`;
      } finally {
        ancestors.delete(value);
      }
    }
    default:
      throw new TypeError(
        'Command fingerprint values must not contain undefined, bigint, symbol, or function values.',
      );
  }
}

export function commandFingerprint(
  input: Readonly<{
    commandType: string;
    target: Readonly<{ type: string; id: string }>;
    version: number | null;
    payload: unknown;
  }>,
): CommandFingerprint {
  const envelope = {
    fingerprintVersion: 1,
    commandType: input.commandType,
    target: input.target,
    version: input.version,
    payload: input.payload,
  };
  const canonicalEnvelope = canonicalJson(envelope, new WeakSet<object>());
  return Object.freeze({
    commandType: input.commandType,
    targetId: input.target.id,
    requestHash: createHash('sha256').update(canonicalEnvelope).digest('hex'),
  });
}

/**
 * Creates a deterministic namespace for append-only fact keys that cannot
 * collide with a validated client Idempotency-Key (which is at most 120
 * characters). Fact columns allow 160 characters; this key is always 133.
 */
export function internalFactIdempotencyKey(parts: readonly string[]): string {
  if (parts.length === 0 || parts.some((part) => part.length === 0)) {
    throw new TypeError('Internal fact idempotency key parts must be non-empty strings.');
  }
  const canonicalParts = canonicalJson(parts, new WeakSet<object>());
  const primary = createHash('sha256').update(`m6-fact-v1:primary:${canonicalParts}`).digest('hex');
  const secondary = createHash('sha256')
    .update(`m6-fact-v1:secondary:${canonicalParts}`)
    .digest('hex');
  return `m6f:${primary}:${secondary}`;
}
