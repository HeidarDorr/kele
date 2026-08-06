import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = new URL(process.env.API_BASE_URL ?? 'http://127.0.0.1:3101/api/v1');
const apiRoot = `${baseUrl.toString().replace(/\/$/, '')}/`;
const confirmation = process.env.M9_LOAD_CONFIRM_SYNTHETIC;
const durationMs = boundedInteger('M9_LOAD_DURATION_MS', 5_000, 1_000, 60_000);
const concurrency = boundedInteger('M9_LOAD_CONCURRENCY', 16, 1, 100);

if (!['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname)) {
  throw new Error('Milestone 9 load rehearsal refuses a non-loopback target.');
}
if (confirmation !== 'isolated-kele-e2e') {
  throw new Error('M9_LOAD_CONFIRM_SYNTHETIC=isolated-kele-e2e is required.');
}

const profiles = [
  {
    name: 'public-read',
    requests: [
      { path: '/homepage' },
      { path: '/catalog/products?limit=24' },
      { path: '/catalog/products?search=%D9%85%D8%A7%D9%86%D8%AA%D9%88&limit=24' },
      { path: '/catalog/categories' },
      { path: '/catalog/outfits' },
      { path: '/journal?limit=12' },
    ],
  },
  {
    name: 'operator-read',
    requests: [
      {
        path: '/admin/orders',
        headers: {
          cookie: `kele_session=${encodeURIComponent(
            process.env.ADMIN_SUPER_SESSION_TOKEN ??
              'development-super-admin-session-token-00000001',
          )}`,
        },
      },
      {
        path: '/admin/audit-events?limit=20',
        headers: {
          cookie: `kele_session=${encodeURIComponent(
            process.env.ADMIN_SUPER_SESSION_TOKEN ??
              'development-super-admin-session-token-00000001',
          )}`,
        },
      },
    ],
  },
];

const startedAt = new Date();
const results = [];
for (const profile of profiles) results.push(await runProfile(profile));
const finishedAt = new Date();
const evidence = {
  schemaVersion: 1,
  synthetic: true,
  target: `${baseUrl.protocol}//${baseUrl.host}/api/v1`,
  runtime: {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
  },
  configuration: { durationMs, concurrency },
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  results,
};
const evidenceDirectory = path.join(workspace, 'output/playwright/.e2e-run/milestone-9');
await mkdir(evidenceDirectory, { recursive: true });
const evidencePath = path.join(evidenceDirectory, 'load.json');
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

for (const result of results) {
  console.log(
    `[m9-load] ${result.profile}: ${String(result.requests)} requests, ${result.requestsPerSecond.toFixed(1)} req/s, p95=${String(result.latencyMs.p95)}ms, unexpected=${String(result.unexpectedErrors)}.`,
  );
}
console.log(`[m9-load] Evidence written to ${path.relative(workspace, evidencePath)}.`);

if (results.some((result) => result.unexpectedErrorRate >= 0.01 || result.latencyMs.p95 >= 500)) {
  throw new Error('Milestone 9 local read-only load objective was not met.');
}

async function runProfile(profile) {
  const latencies = [];
  let total = 0;
  let unexpectedErrors = 0;
  const statusCounts = {};
  const deadline = performance.now() + durationMs;

  await Promise.all(
    Array.from({ length: concurrency }, async (_, workerIndex) => {
      let sequence = workerIndex;
      while (performance.now() < deadline) {
        const request = profile.requests[sequence % profile.requests.length];
        sequence += concurrency;
        const requestStartedAt = performance.now();
        try {
          const response = await fetch(new URL(request.path.replace(/^\//, ''), apiRoot), {
            headers: request.headers,
            signal: AbortSignal.timeout(5_000),
          });
          const latency = performance.now() - requestStartedAt;
          latencies.push(latency);
          total += 1;
          statusCounts[String(response.status)] = (statusCounts[String(response.status)] ?? 0) + 1;
          if (!response.ok) unexpectedErrors += 1;
          await response.arrayBuffer();
        } catch {
          latencies.push(performance.now() - requestStartedAt);
          total += 1;
          unexpectedErrors += 1;
          statusCounts.transport_error = (statusCounts.transport_error ?? 0) + 1;
        }
      }
    }),
  );

  latencies.sort((left, right) => left - right);
  return {
    profile: profile.name,
    requests: total,
    requestsPerSecond: total / (durationMs / 1_000),
    unexpectedErrors,
    unexpectedErrorRate: total === 0 ? 1 : unexpectedErrors / total,
    statusCounts,
    latencyMs: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      max: Math.round(latencies.at(-1) ?? 0),
    },
  };
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return Math.round(sorted[index] ?? 0);
}

function boundedInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${String(minimum)} to ${String(maximum)}.`);
  }
  return parsed;
}
