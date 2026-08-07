import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = new URL(process.env.API_BASE_URL ?? 'http://127.0.0.1:3101/api/v1');
const apiRoot = `${baseUrl.toString().replace(/\/$/, '')}/`;
const confirmation = process.env.M9_LOAD_CONFIRM_SYNTHETIC;
const durationMs = boundedInteger('M9_LOAD_DURATION_MS', 5_000, 1_000, 60_000);
const concurrency = boundedInteger('M9_LOAD_CONCURRENCY', 16, 1, 100);
const transactionalConcurrency = Math.min(concurrency, 16);
const loadSkuId = '20000000-0000-4000-8000-000000000041';

if (!['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname)) {
  throw new Error('Milestone 9 load rehearsal refuses a non-loopback target.');
}
if (confirmation !== 'isolated-kele-e2e') {
  throw new Error('M9_LOAD_CONFIRM_SYNTHETIC=isolated-kele-e2e is required.');
}

const databaseUrl = new URL(process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? '');
if (
  !['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname) ||
  databaseUrl.pathname.replace(/^\//, '') !== 'kele_e2e'
) {
  throw new Error('Milestone 9 mutating load profiles require the isolated kele_e2e database.');
}

const apiPackage = path.join(workspace, 'apps/api/package.json');
const { PrismaClient } = createRequire(apiPackage)('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
const startedAt = new Date();
const results = [];

try {
  const transactionalFixtures = await prepareTransactionalFixtures();

  results.push(
    await runDurationProfile({
      name: 'public-read',
      concurrency,
      durationMs,
      p95LimitMs: 500,
      requests: [
        { path: '/homepage' },
        { path: '/catalog/products?limit=24' },
        { path: '/catalog/products?search=%D9%85%D8%A7%D9%86%D8%AA%D9%88&limit=24' },
        { path: '/catalog/categories' },
        { path: '/catalog/outfits' },
        { path: '/journal?limit=12' },
      ],
    }),
  );

  const identityTasks = Array.from({ length: 96 }, (_, sequence) => async () => {
    if (sequence % 2 === 0) {
      const response = await requestJson('/auth/otp/challenges', {
        method: 'POST',
        body: {
          mobile:
            sequence % 4 === 0
              ? loadMobile(7_000_000 + (sequence % 3))
              : loadMobile(1_000_000 + sequence),
        },
      });
      return measuredResponse(
        response.status,
        [202, 429],
        response.status === 202 ? 'accepted' : 'limited',
      );
    }
    const response = await requestJson('/auth/otp/verifications', {
      method: 'POST',
      body: { challengeId: randomUUID(), code: '000000' },
    });
    return measuredResponse(
      response.status,
      [400, 429],
      response.status === 400 ? 'rejected' : 'limited',
    );
  });
  results.push(
    await runFiniteProfile({
      name: 'identity-abuse',
      concurrency,
      p95LimitMs: 1_000,
      tasks: identityTasks,
    }),
  );

  const checkoutTasks = transactionalFixtures.map((fixture, index) => async () => {
    const response = await requestJson('/checkout-sessions', {
      method: 'POST',
      jar: fixture.jar,
      headers: {
        'idempotency-key': `m9-load-checkout-${String(index).padStart(8, '0')}`,
        'x-csrf-token': fixture.jar.required('kele_csrf'),
      },
      body: {
        cartId: fixture.cartId,
        addressId: fixture.addressId,
        deliveryMethod: 'iran_post',
      },
    });
    fixture.checkout = response.body;
    return measuredResponse(response.status, [201], response.status === 201 ? 'created' : 'failed');
  });
  const checkoutResult = await runFiniteProfile({
    name: 'checkout-write',
    concurrency: transactionalConcurrency,
    p95LimitMs: 1_000,
    tasks: checkoutTasks,
  });
  const checkoutIds = transactionalFixtures.map((fixture) => requiredId(fixture.checkout, 'id'));
  const activeReservations = await prisma.inventoryReservation.count({
    where: { checkoutSessionId: { in: checkoutIds }, status: 'ACTIVE' },
  });
  checkoutResult.invariants = {
    checkoutSessions: checkoutIds.length,
    activeReservations,
    expectedActiveReservations: transactionalFixtures.length,
    pass: activeReservations === transactionalFixtures.length,
  };
  results.push(checkoutResult);

  const callbackFixture = transactionalFixtures[0];
  if (callbackFixture === undefined) throw new Error('A callback load fixture is required.');
  const checkoutId = requiredId(callbackFixture.checkout, 'id');
  const paymentIdempotencyKey = 'm9-load-payment-attempt-00000001';
  const paymentResponse = await requestJson(
    `/checkout-sessions/${encodeURIComponent(checkoutId)}/payment-attempts`,
    {
      method: 'POST',
      jar: callbackFixture.jar,
      headers: {
        'idempotency-key': paymentIdempotencyKey,
        'x-csrf-token': callbackFixture.jar.required('kele_csrf'),
      },
    },
  );
  requireStatus(paymentResponse, [201], 'prepare callback payment attempt');
  const paymentAttemptId = requiredId(paymentResponse.body, 'id');
  const amountRial = requiredNestedInteger(paymentResponse.body, 'amount', 'amountRial');
  const providerReference = `fake-${createHash('sha256')
    .update(`${checkoutId}:${paymentIdempotencyKey}`)
    .digest('hex')
    .slice(0, 48)}`;
  const exactCallback = {
    providerReference,
    providerTransactionId: 'm9-load-provider-transaction-00000001',
    status: 'success',
    amountRial,
    currency: 'IRR',
    issuedAt: process.env.E2E_FIXED_TIME ?? new Date().toISOString(),
    nonce: 'm9-load-callback-replay-nonce-00000001',
  };
  const alteredCallback = { ...exactCallback, amountRial: exactCallback.amountRial + 1 };
  const exactSignature = callbackSignature(exactCallback);
  const alteredSignature = callbackSignature(alteredCallback);
  const established = await callbackRequest(exactCallback, exactSignature);
  requireStatus(established, [200], 'establish callback replay fact');

  const callbackTasks = Array.from({ length: transactionalConcurrency }, (_, index) => {
    const altered = index % 2 === 1;
    return async () => {
      const response = await callbackRequest(
        altered ? alteredCallback : exactCallback,
        altered ? alteredSignature : exactSignature,
      );
      return measuredResponse(
        response.status,
        altered ? [409] : [200],
        altered ? 'altered_rejected' : 'exact_replay',
      );
    };
  });
  const callbackResult = await runFiniteProfile({
    name: 'callback-replay',
    concurrency: transactionalConcurrency,
    p95LimitMs: 1_000,
    tasks: callbackTasks,
  });
  const [orderCount, callbackReceiptCount, loadInventory] = await Promise.all([
    prisma.order.count({ where: { paymentAttemptId } }),
    prisma.paymentCallbackReceipt.count({
      where: { provider: 'fake', providerEventId: exactCallback.nonce },
    }),
    prisma.inventory.findUnique({ where: { skuId: loadSkuId } }),
  ]);
  callbackResult.invariants = {
    ordersForPaymentAttempt: orderCount,
    callbackReceiptsForNonce: callbackReceiptCount,
    physicalQuantity: loadInventory?.physicalQuantity ?? null,
    reservedQuantity: loadInventory?.reservedQuantity ?? null,
    invalidInventory:
      loadInventory === null ||
      loadInventory.physicalQuantity < 0 ||
      loadInventory.reservedQuantity < 0 ||
      loadInventory.reservedQuantity > loadInventory.physicalQuantity,
    pass:
      orderCount === 1 &&
      callbackReceiptCount === 1 &&
      loadInventory !== null &&
      loadInventory.physicalQuantity >= 0 &&
      loadInventory.reservedQuantity >= 0 &&
      loadInventory.reservedQuantity <= loadInventory.physicalQuantity,
  };
  results.push(callbackResult);

  results.push(
    await runDurationProfile({
      name: 'operator-read',
      concurrency,
      durationMs,
      p95LimitMs: 500,
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
    }),
  );
} finally {
  await prisma.$disconnect();
}

const finishedAt = new Date();
const evidence = {
  schemaVersion: 2,
  synthetic: true,
  target: `${baseUrl.protocol}//${baseUrl.host}/api/v1`,
  database: 'kele_e2e',
  runtime: {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
  },
  configuration: { durationMs, concurrency, transactionalConcurrency },
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

if (
  results.some(
    (result) =>
      result.unexpectedErrorRate >= 0.01 ||
      result.latencyMs.p95 >= result.objective.p95BelowMs ||
      result.invariants?.pass === false,
  )
) {
  throw new Error('Milestone 9 local load objective or commercial invariant was not met.');
}

async function prepareTransactionalFixtures() {
  const inventory = await prisma.inventory.findUnique({ where: { skuId: loadSkuId } });
  if (inventory === null) throw new Error('The deterministic load SKU inventory was not seeded.');
  await prisma.inventory.update({
    where: { skuId: loadSkuId },
    data: {
      physicalQuantity: Math.max(inventory.physicalQuantity, transactionalConcurrency + 4),
      reservedQuantity: 0,
      version: { increment: 1 },
    },
  });

  const fixtures = [];
  for (let index = 0; index < transactionalConcurrency; index += 1) {
    const jar = createCookieJar();
    const cart = await requestJson('/cart', { jar });
    requireStatus(cart, [200], 'create load cart');
    const guestCartId = requiredId(cart.body, 'id');
    const cartVersion = requiredInteger(cart.body, 'version');
    const line = await requestJson('/cart/lines', {
      method: 'POST',
      jar,
      headers: {
        'if-match': `"${String(cartVersion)}"`,
        'x-csrf-token': jar.required('kele_csrf'),
      },
      body: { kind: 'product', skuId: loadSkuId, quantity: 1 },
    });
    requireStatus(line, [201], 'add load cart line');

    const mobile = loadMobile(100 + index);
    const challenge = await requestJson('/auth/otp/challenges', {
      method: 'POST',
      jar,
      body: { mobile },
    });
    requireStatus(challenge, [202], 'create load OTP challenge');
    const challengeId = requiredId(challenge.body, 'challengeId');
    const verification = await requestJson('/auth/otp/verifications', {
      method: 'POST',
      jar,
      headers: { 'x-csrf-token': jar.required('kele_csrf') },
      body: {
        challengeId,
        code: process.env.FAKE_SMS_OTP_CODE ?? '111111',
      },
    });
    requireStatus(verification, [200], 'verify load OTP challenge');
    const customerCartId = requiredNestedId(verification.body, 'cart', 'id');

    const address = await requestJson('/me/addresses', {
      method: 'POST',
      jar,
      headers: { 'x-csrf-token': jar.required('kele_csrf') },
      body: {
        recipientName: `M9 Load ${String(index)}`,
        recipientMobile: mobile,
        province: 'تهران',
        city: 'تهران',
        addressLine: `نشانی مصنوعی آزمون بار شماره ${String(index)}`,
        postalCode: String(1_000_000_000 + index),
        isDefault: true,
      },
    });
    requireStatus(address, [201], 'create load address');
    fixtures.push({
      jar,
      guestCartId,
      cartId: customerCartId,
      addressId: requiredId(address.body, 'id'),
    });
  }
  return fixtures;
}

async function runDurationProfile(profile) {
  const observations = [];
  const deadline = performance.now() + profile.durationMs;
  await Promise.all(
    Array.from({ length: profile.concurrency }, async (_, workerIndex) => {
      let sequence = workerIndex;
      while (performance.now() < deadline) {
        const request = profile.requests[sequence % profile.requests.length];
        const body = typeof request.body === 'function' ? request.body({ sequence }) : request.body;
        sequence += profile.concurrency;
        observations.push(
          await measure(async () => {
            const response = await requestJson(request.path, {
              method: request.method,
              headers: request.headers,
              body,
            });
            return measuredResponse(
              response.status,
              request.expectedStatuses ?? [200],
              request.outcomes?.[response.status] ?? `status_${String(response.status)}`,
            );
          }),
        );
      }
    }),
  );
  return summarize(
    profile.name,
    observations,
    profile.durationMs,
    profile.concurrency,
    profile.p95LimitMs,
  );
}

async function runFiniteProfile(profile) {
  const started = performance.now();
  const observations = [];
  let nextTask = 0;
  await Promise.all(
    Array.from({ length: Math.min(profile.concurrency, profile.tasks.length) }, async () => {
      while (nextTask < profile.tasks.length) {
        const task = profile.tasks[nextTask];
        nextTask += 1;
        observations.push(await measure(task));
      }
    }),
  );
  const elapsedMs = Math.max(1, performance.now() - started);
  return summarize(profile.name, observations, elapsedMs, profile.concurrency, profile.p95LimitMs);
}

async function measure(operation) {
  const requestStartedAt = performance.now();
  try {
    const response = await operation();
    return { ...response, latencyMs: performance.now() - requestStartedAt };
  } catch {
    return {
      status: 'transport_error',
      expected: false,
      outcome: 'transport_error',
      latencyMs: performance.now() - requestStartedAt,
    };
  }
}

function measuredResponse(status, expectedStatuses, outcome) {
  return { status, expected: expectedStatuses.includes(status), outcome };
}

function summarize(profile, observations, measuredDurationMs, profileConcurrency, p95LimitMs) {
  const latencies = observations.map((observation) => observation.latencyMs).sort((a, b) => a - b);
  const statusCounts = {};
  const outcomeCounts = {};
  let unexpectedErrors = 0;
  for (const observation of observations) {
    const status = String(observation.status);
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    outcomeCounts[observation.outcome] = (outcomeCounts[observation.outcome] ?? 0) + 1;
    if (!observation.expected) unexpectedErrors += 1;
  }
  return {
    profile,
    requests: observations.length,
    concurrency: profileConcurrency,
    durationMs: Math.round(measuredDurationMs),
    requestsPerSecond: observations.length / (measuredDurationMs / 1_000),
    unexpectedErrors,
    unexpectedErrorRate: observations.length === 0 ? 1 : unexpectedErrors / observations.length,
    statusCounts,
    outcomeCounts,
    objective: { unexpectedErrorRateBelow: 0.01, p95BelowMs: p95LimitMs },
    latencyMs: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      max: Math.round(latencies.at(-1) ?? 0),
    },
  };
}

async function callbackRequest(payload, signature) {
  return requestJson('/payment-callbacks/fake', {
    method: 'POST',
    headers: { 'x-payment-signature': signature },
    body: payload,
  });
}

function callbackSignature(payload) {
  const canonical = JSON.stringify({
    amountRial: payload.amountRial,
    currency: payload.currency,
    issuedAt: payload.issuedAt,
    nonce: payload.nonce,
    providerReference: payload.providerReference,
    providerTransactionId: payload.providerTransactionId,
    status: payload.status,
  });
  return createHmac(
    'sha256',
    process.env.FAKE_PAYMENT_SIGNING_SECRET ?? 'development-fake-payment-signing-secret-0001',
  )
    .update(canonical)
    .digest('hex');
}

async function requestJson(requestPath, options = {}) {
  const headers = new Headers(options.headers);
  if (options.jar !== undefined) {
    const cookie = options.jar.header();
    if (cookie !== '') headers.set('cookie', cookie);
  }
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  const response = await fetch(new URL(requestPath.replace(/^\//, ''), apiRoot), {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(5_000),
  });
  options.jar?.capture(response.headers);
  const text = await response.text();
  let body = null;
  if (text !== '') {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

function createCookieJar() {
  const cookies = new Map();
  return {
    capture(headers) {
      for (const value of headers.getSetCookie()) {
        const [pair, ...attributes] = value.split(';');
        const separator = pair.indexOf('=');
        if (separator < 1) continue;
        const name = pair.slice(0, separator).trim();
        const cookieValue = pair.slice(separator + 1).trim();
        const deleted =
          cookieValue === '' ||
          attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute));
        if (deleted) cookies.delete(name);
        else cookies.set(name, cookieValue);
      }
    },
    header() {
      return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    required(name) {
      const value = cookies.get(name);
      if (value === undefined) throw new Error(`Required load-test cookie ${name} was not set.`);
      return value;
    },
  };
}

function requireStatus(response, accepted, operation) {
  if (!accepted.includes(response.status)) {
    const code =
      typeof response.body === 'object' && response.body !== null && 'code' in response.body
        ? response.body.code
        : 'unknown';
    throw new Error(`${operation} returned ${String(response.status)} (${String(code)}).`);
  }
}

function requiredId(value, key) {
  if (typeof value !== 'object' || value === null || typeof value[key] !== 'string') {
    throw new Error(`Load fixture response is missing ${key}.`);
  }
  return value[key];
}

function requiredInteger(value, key) {
  if (typeof value !== 'object' || value === null || !Number.isSafeInteger(value[key])) {
    throw new Error(`Load fixture response is missing integer ${key}.`);
  }
  return value[key];
}

function requiredNestedInteger(value, parent, key) {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Load fixture response is missing ${parent}.${key}.`);
  }
  return requiredInteger(value[parent], key);
}

function requiredNestedId(value, parent, key) {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Load fixture response is missing ${parent}.${key}.`);
  }
  return requiredId(value[parent], key);
}

function loadMobile(sequence) {
  return `+98910${String(sequence % 10_000_000).padStart(7, '0')}`;
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
