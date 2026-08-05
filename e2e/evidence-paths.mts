import { resolve } from 'node:path';

const reviewEvidenceRoot = process.env.E2E_EVIDENCE_ROOT?.trim() || 'output/playwright/.e2e-run';

export function reviewEvidencePath(...segments: string[]): string {
  return resolve(reviewEvidenceRoot, ...segments);
}
