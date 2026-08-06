import { Injectable } from '@nestjs/common';

type Labels = Readonly<Record<string, string>>;

type Histogram = {
  buckets: readonly number[];
  bucketCounts: number[];
  count: number;
  sum: number;
};

const durationBuckets = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] as const;

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, Histogram>();

  increment(name: string, labels: Labels = {}, value = 1): void {
    const key = metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  gauge(name: string, value: number, labels: Labels = {}): void {
    this.gauges.set(metricKey(name, labels), finite(value));
  }

  incrementGauge(name: string, labels: Labels = {}, value = 1): void {
    const key = metricKey(name, labels);
    this.gauges.set(key, (this.gauges.get(key) ?? 0) + value);
  }

  observeDuration(name: string, seconds: number, labels: Labels = {}): void {
    const key = metricKey(name, labels);
    const histogram =
      this.histograms.get(key) ??
      ({
        buckets: durationBuckets,
        bucketCounts: durationBuckets.map(() => 0),
        count: 0,
        sum: 0,
      } satisfies Histogram);
    const observed = Math.max(0, finite(seconds));
    histogram.count += 1;
    histogram.sum += observed;
    histogram.buckets.forEach((upper, index) => {
      if (observed <= upper) {
        histogram.bucketCounts[index] = (histogram.bucketCounts[index] ?? 0) + 1;
      }
    });
    this.histograms.set(key, histogram);
  }

  render(): string {
    const lines = [
      '# HELP kele_build_info Static KELE process identity.',
      '# TYPE kele_build_info gauge',
      'kele_build_info{service="api"} 1',
      '# HELP kele_process_uptime_seconds API process uptime.',
      '# TYPE kele_process_uptime_seconds gauge',
      `kele_process_uptime_seconds ${formatNumber(process.uptime())}`,
      '# HELP kele_process_resident_memory_bytes API resident memory.',
      '# TYPE kele_process_resident_memory_bytes gauge',
      `kele_process_resident_memory_bytes ${String(process.memoryUsage().rss)}`,
    ];

    appendSimple(lines, this.counters, 'counter');
    appendSimple(lines, this.gauges, 'gauge');
    for (const [key, histogram] of [...this.histograms.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const parsed = parseMetricKey(key);
      lines.push(`# TYPE ${parsed.name} histogram`);
      histogram.buckets.forEach((upper, index) => {
        lines.push(
          `${parsed.name}_bucket${renderLabels({ ...parsed.labels, le: String(upper) })} ${String(histogram.bucketCounts[index])}`,
        );
      });
      lines.push(
        `${parsed.name}_bucket${renderLabels({ ...parsed.labels, le: '+Inf' })} ${String(histogram.count)}`,
        `${parsed.name}_sum${renderLabels(parsed.labels)} ${formatNumber(histogram.sum)}`,
        `${parsed.name}_count${renderLabels(parsed.labels)} ${String(histogram.count)}`,
      );
    }
    return `${deduplicateTypeLines(lines).join('\n')}\n`;
  }
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function metricKey(name: string, labels: Labels): string {
  const normalized = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\u0000');
  return `${name}\u0001${normalized}`;
}

function parseMetricKey(key: string): { name: string; labels: Record<string, string> } {
  const separatorIndex = key.indexOf('\u0001');
  const name = separatorIndex < 0 ? key : key.slice(0, separatorIndex);
  const encoded = separatorIndex < 0 ? '' : key.slice(separatorIndex + 1);
  const labels = Object.fromEntries(
    encoded.length === 0
      ? []
      : encoded.split('\u0000').map((entry) => {
          const separator = entry.indexOf('=');
          return [entry.slice(0, separator), entry.slice(separator + 1)];
        }),
  );
  return { name, labels };
}

function renderLabels(labels: Labels): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '';
  return `{${entries.map(([key, value]) => `${key}="${escapeLabel(value)}"`).join(',')}}`;
}

function escapeLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll('"', '\\"');
}

function formatNumber(value: number): string {
  return finite(value)
    .toFixed(6)
    .replace(/\.?0+$/, '');
}

function appendSimple(lines: string[], metrics: Map<string, number>, type: 'counter' | 'gauge') {
  for (const [key, value] of [...metrics.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const parsed = parseMetricKey(key);
    lines.push(`# TYPE ${parsed.name} ${type}`);
    lines.push(`${parsed.name}${renderLabels(parsed.labels)} ${formatNumber(value)}`);
  }
}

function deduplicateTypeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    if (!line.startsWith('# TYPE ')) return true;
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  });
}
