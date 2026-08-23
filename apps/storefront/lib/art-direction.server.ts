import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findArtDirectionBrief, type ArtDirectionBrief } from './art-direction';

/**
 * Briefs stand in for missing artwork during design and review. Production
 * falls back to the ordinary "image unavailable" state instead, unless an
 * operator opts in explicitly.
 */
function briefsAreVisible(): boolean {
  const flag = process.env.KELE_ART_DIRECTION_BRIEFS;
  if (flag === 'on') return true;
  if (flag === 'off') return false;
  return process.env.NODE_ENV !== 'production';
}

/**
 * Resolves the brief to render in place of `src`, or `null` when the artwork is
 * present and the real image should be used.
 *
 * Only paths with a registered brief are ever probed, so an arbitrary API-supplied
 * URL can never be used to test the filesystem.
 */
export function pendingArtDirection(src: string): ArtDirectionBrief | null {
  const brief = findArtDirectionBrief(src);
  if (!brief) return null;
  const assetPath = join(process.cwd(), 'public', ...brief.file.slice(1).split('/'));
  if (existsSync(assetPath)) return null;
  return briefsAreVisible() ? brief : null;
}

/** True when `src` is briefed artwork that has not been delivered yet. */
export function artworkIsMissing(src: string): boolean {
  const brief = findArtDirectionBrief(src);
  if (!brief) return false;
  return !existsSync(join(process.cwd(), 'public', ...brief.file.slice(1).split('/')));
}
