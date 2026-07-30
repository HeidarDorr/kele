import process from 'node:process';

const expectedNode = '24.18.0';
const expectedPnpm = '11.18.0';

if (process.versions.node !== expectedNode) {
  throw new Error(`KELE requires Node.js ${expectedNode}; found ${process.versions.node}.`);
}

const userAgent = process.env.npm_config_user_agent ?? '';
const match = /pnpm\/(\d+\.\d+\.\d+)/.exec(userAgent);

if (match?.[1] !== expectedPnpm) {
  throw new Error(`KELE requires pnpm ${expectedPnpm}; found ${match?.[1] ?? 'unknown'}.`);
}
