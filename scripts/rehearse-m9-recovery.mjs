import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { config as loadEnvironment } from 'dotenv';
import { readE2EDatabaseConfiguration } from '../packages/config/src/e2e-database.ts';

const emptyDatabaseName = 'kele_m9_empty';
const restoreDatabaseName = 'kele_m9_restore';
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvironment({ path: path.join(workspace, '.env'), override: false });

if (process.env.M9_RECOVERY_CONFIRM_SYNTHETIC !== 'isolated-kele-e2e') {
  throw new Error('M9_RECOVERY_CONFIRM_SYNTHETIC=isolated-kele-e2e is required.');
}
const e2e = readE2EDatabaseConfiguration(process.env);
const sourceUrl = new URL(e2e.databaseUrl);
if (!['127.0.0.1', 'localhost', '::1'].includes(sourceUrl.hostname)) {
  throw new Error('Milestone 9 recovery rehearsal refuses a non-loopback PostgreSQL host.');
}
if ((sourceUrl.port || '5432') !== '5432' || sourceUrl.username !== 'kele') {
  throw new Error('Recovery rehearsal requires the repository-local PostgreSQL service.');
}

const apiPackage = path.join(workspace, 'apps/api/package.json');
const requireFromApi = createRequire(apiPackage);
const { PrismaClient } = requireFromApi('@prisma/client');
const prismaCli = requireFromApi.resolve('prisma/build/index.js');
const schemaPath = path.join(workspace, 'apps/api/prisma/schema.prisma');
const evidenceDirectory = path.join(workspace, 'output/playwright/.e2e-run/milestone-9');
const backupPath = path.join(evidenceDirectory, 'kele-m9-synthetic.logical.json');
await mkdir(evidenceDirectory, { recursive: true });

const source = clientFor(e2e.databaseUrl);
const maintenance = clientFor(e2e.maintenanceUrl);
let sourceSnapshot;
try {
  sourceSnapshot = await databaseSnapshot(source);
  if (sourceSnapshot.migrations === 0) {
    throw new Error('The isolated E2E source has no applied migrations.');
  }
  await replaceIsolatedDatabase(maintenance, emptyDatabaseName);
  await replaceIsolatedDatabase(maintenance, restoreDatabaseName);
} finally {
  await source.$disconnect();
  await maintenance.$disconnect();
}

const emptyUrl = databaseUrlFor(emptyDatabaseName);
const restoreUrl = databaseUrlFor(restoreDatabaseName);
const emptyMigrationStarted = performance.now();
await runNode(prismaCli, ['migrate', 'deploy', '--schema', schemaPath], {
  DATABASE_URL: emptyUrl,
});
const emptyMigrationMs = performance.now() - emptyMigrationStarted;

const backupStarted = performance.now();
await createLogicalBackup(e2e.databaseUrl, backupPath);
const backupMs = performance.now() - backupStarted;

const restoredMigrationStarted = performance.now();
await runNode(prismaCli, ['migrate', 'deploy', '--schema', schemaPath], {
  DATABASE_URL: restoreUrl,
});
const restoredMigrationMs = performance.now() - restoredMigrationStarted;

const restoreStarted = performance.now();
await restoreLogicalBackup(restoreUrl, backupPath);
const restoreMs = performance.now() - restoreStarted;

const empty = clientFor(emptyUrl);
const restored = clientFor(restoreUrl);
let emptySnapshot;
let restoredSnapshot;
try {
  [emptySnapshot, restoredSnapshot] = await Promise.all([
    databaseSnapshot(empty),
    databaseSnapshot(restored),
  ]);
} finally {
  await empty.$disconnect();
  await restored.$disconnect();
}

const comparableKeys = ['customers', 'orders', 'paymentAttempts', 'inventory', 'businessEvents'];
for (const key of comparableKeys) {
  if (sourceSnapshot[key] !== restoredSnapshot[key]) {
    throw new Error(`Restored count mismatch for ${key}.`);
  }
}
if (
  restoredSnapshot.invalidInventory !== 0 ||
  restoredSnapshot.ordersWithoutVerifiedPayment !== 0
) {
  throw new Error('Restored database failed commercial invariant probes.');
}
if (emptySnapshot.migrations !== sourceSnapshot.migrations) {
  throw new Error('Empty-database migration chain did not reach the source schema version.');
}

const backupBytes = (await stat(backupPath)).size;
const backupSha256 = createHash('sha256')
  .update(await readFile(backupPath))
  .digest('hex');
const evidence = {
  schemaVersion: 1,
  synthetic: true,
  sourceDatabase: e2e.databaseName,
  emptyDatabase: emptyDatabaseName,
  restoreDatabase: restoreDatabaseName,
  postgresMajor: 16,
  timingsMs: {
    emptyMigration: Math.round(emptyMigrationMs),
    backup: Math.round(backupMs),
    restore: Math.round(restoreMs),
    restoredMigration: Math.round(restoredMigrationMs),
  },
  backup: { bytes: backupBytes, sha256: backupSha256 },
  backupFormat: 'versioned-application-logical-json-plus-migrations',
  sourceSnapshot,
  emptySnapshot,
  restoredSnapshot,
  completedAt: new Date().toISOString(),
};
const evidencePath = path.join(evidenceDirectory, 'recovery.json');
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(
  `[m9-recovery] Empty migration ${String(evidence.timingsMs.emptyMigration)}ms; backup ${String(evidence.timingsMs.backup)}ms; restore ${String(evidence.timingsMs.restore)}ms; restored migration ${String(evidence.timingsMs.restoredMigration)}ms.`,
);
console.log(`[m9-recovery] Evidence written to ${path.relative(workspace, evidencePath)}.`);

function databaseUrlFor(databaseName) {
  const url = new URL(e2e.databaseUrl);
  url.pathname = `/${databaseName}`;
  url.searchParams.set('schema', 'public');
  return url.toString();
}

function clientFor(url) {
  return new PrismaClient({ datasources: { db: { url } } });
}

async function replaceIsolatedDatabase(client, databaseName) {
  if (![emptyDatabaseName, restoreDatabaseName].includes(databaseName)) {
    throw new Error('Refusing to replace an unexpected database.');
  }
  await client.$queryRawUnsafe(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    databaseName,
  );
  await client.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await client.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
}

async function databaseSnapshot(client) {
  const [row] = await client.$queryRawUnsafe(`
    SELECT
      (SELECT count(*)::integer FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations,
      (SELECT count(*)::integer FROM customers) AS customers,
      (SELECT count(*)::integer FROM orders) AS orders,
      (SELECT count(*)::integer FROM payment_attempts) AS "paymentAttempts",
      (SELECT count(*)::integer FROM inventory) AS inventory,
      (SELECT count(*)::integer FROM business_events) AS "businessEvents",
      (SELECT count(*)::integer FROM inventory WHERE physical_quantity < 0 OR reserved_quantity < 0 OR reserved_quantity > physical_quantity) AS "invalidInventory",
      (SELECT count(*)::integer FROM orders o JOIN payment_attempts p ON p.id = o.payment_attempt_id WHERE p.status::text <> 'VERIFIED') AS "ordersWithoutVerifiedPayment"
  `);
  return row;
}

async function createLogicalBackup(databaseUrl, destination) {
  const client = clientFor(databaseUrl);
  try {
    const tableNames = await publicTableNames(client);
    const restoreOrder = await tableRestoreOrder(client, tableNames);
    const tableData = {};
    for (const tableName of restoreOrder) {
      const [row] = await client.$queryRawUnsafe(
        `SELECT COALESCE(jsonb_agg(to_jsonb(source_row)), '[]'::jsonb)::text AS data FROM ${quotedIdentifier(tableName)} source_row`,
      );
      tableData[tableName] = row.data;
    }
    const payload = JSON.stringify({ schemaVersion: 1, restoreOrder, tableData });
    const document = {
      schemaVersion: 1,
      synthetic: true,
      payload,
      payloadSha256: sha256(payload),
    };
    await writeFile(destination, `${JSON.stringify(document)}\n`, 'utf8');
  } finally {
    await client.$disconnect();
  }
}

async function restoreLogicalBackup(databaseUrl, source) {
  const document = JSON.parse(await readFile(source, 'utf8'));
  if (
    document?.schemaVersion !== 1 ||
    document.synthetic !== true ||
    typeof document.payload !== 'string' ||
    typeof document.payloadSha256 !== 'string' ||
    sha256(document.payload) !== document.payloadSha256
  ) {
    throw new Error('Logical backup integrity verification failed.');
  }
  const payload = JSON.parse(document.payload);
  if (
    payload?.schemaVersion !== 1 ||
    !Array.isArray(payload.restoreOrder) ||
    typeof payload.tableData !== 'object' ||
    payload.tableData === null
  ) {
    throw new Error('Logical backup structure is invalid.');
  }

  const client = clientFor(databaseUrl);
  try {
    const targetTables = await publicTableNames(client);
    if (
      targetTables.length !== payload.restoreOrder.length ||
      targetTables.some((tableName) => !payload.restoreOrder.includes(tableName))
    ) {
      throw new Error('Logical backup table set does not match the migrated target schema.');
    }
    await client.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      for (const tableName of payload.restoreOrder) {
        const data = payload.tableData[tableName];
        if (typeof data !== 'string') throw new Error(`Backup data is missing for ${tableName}.`);
        await transaction.$executeRawUnsafe(
          `INSERT INTO ${quotedIdentifier(tableName)} SELECT * FROM jsonb_populate_recordset(NULL::${quotedIdentifier(tableName)}, $1::jsonb)`,
          data,
        );
      }
      await transaction.$executeRawUnsafe("SET LOCAL session_replication_role = 'origin'");
    });
  } finally {
    await client.$disconnect();
  }
}

async function publicTableNames(client) {
  const rows = await client.$queryRawUnsafe(`
    SELECT tablename AS name
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);
  return rows.map((row) => row.name);
}

async function tableRestoreOrder(client, tableNames) {
  const rows = await client.$queryRawUnsafe(`
    SELECT child.relname AS child, parent.relname AS parent
    FROM pg_constraint constraint_row
    JOIN pg_class child ON child.oid = constraint_row.conrelid
    JOIN pg_class parent ON parent.oid = constraint_row.confrelid
    JOIN pg_namespace namespace_row ON namespace_row.oid = child.relnamespace
    WHERE constraint_row.contype = 'f'
      AND namespace_row.nspname = 'public'
      AND child.relname <> parent.relname
  `);
  const remaining = new Set(tableNames);
  const resolved = new Set();
  const ordered = [];
  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((tableName) =>
        rows
          .filter((dependency) => dependency.child === tableName)
          .every(
            (dependency) => resolved.has(dependency.parent) || !remaining.has(dependency.parent),
          ),
      )
      .sort();
    if (ready.length === 0) {
      throw new Error('Public table dependencies contain an unsupported cycle.');
    }
    for (const tableName of ready) {
      remaining.delete(tableName);
      resolved.add(tableName);
      ordered.push(tableName);
    }
  }
  return ordered;
}

function quotedIdentifier(value) {
  if (!/^[_A-Za-z][_A-Za-z0-9]*$/.test(value)) {
    throw new Error('Database table identifier is outside the accepted character set.');
  }
  return `"${value}"`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function runNode(entry, argumentsForEntry, environment) {
  await runProcess(process.execPath, [entry, ...argumentsForEntry], {
    ...process.env,
    ...environment,
  });
}

async function runProcess(command, argumentsForCommand, environment = process.env) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, argumentsForCommand, {
      cwd: workspace,
      env: environment,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed with ${signal ?? `exit code ${String(code)}`}.`));
    });
  });
}
