const sensitiveKey =
  /address|authorization|callback.*payload|cookie|credential|mobile|one.?time|otp|password|payload|pepper|secret|session|signature|token|verification.?code/i;

const textReplacements: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]'],
  [/(authorization|cookie|set-cookie|signature)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]'],
  [/(password|secret|token|pepper|otp|verification.?code)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]'],
  [/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[REDACTED]@'],
  [/\+98\d{10}\b/g, '[REDACTED_MOBILE]'],
];

const maxDepth = 8;
const maxEntries = 100;
const maxStringLength = 8_000;

export function redactTelemetry(value: unknown): unknown {
  return redact(value, 0, new WeakSet<object>());
}

export function redactTelemetryText(value: string): string {
  let output = value.slice(0, maxStringLength);
  for (const [pattern, replacement] of textReplacements) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function redact(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactTelemetryText(value);
  if (typeof value !== 'object' || value === null) return value;
  if (depth >= maxDepth) return '[TRUNCATED]';
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, maxEntries).map((entry) => redact(entry, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, maxEntries)
      .map(([key, entry]) => [
        key,
        sensitiveKey.test(key) ? '[REDACTED]' : redact(entry, depth + 1, seen),
      ]),
  );
}
