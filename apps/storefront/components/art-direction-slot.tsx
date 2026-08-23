'use client';

import { useState } from 'react';
import type { ArtDirectionBrief } from '../lib/art-direction';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

/**
 * Where the missing artwork sits. A `panel` slot owns its frame and can show the
 * whole brief. A `backdrop` slot sits behind headline copy, so it stays out of
 * the way and keeps the prompt folded away until it is asked for.
 */
export type SlotVariant = 'panel' | 'backdrop';

/**
 * Renders the production brief for artwork the storefront expects but does not
 * have yet. It reserves the real image geometry, so replacing the brief with the
 * delivered file cannot shift the layout.
 */
export function ArtDirectionSlot({
  brief,
  variant = 'panel',
  decorative = false,
}: {
  brief: ArtDirectionBrief;
  variant?: SlotVariant | undefined;
  /** True when adjacent copy already names the image. */
  decorative?: boolean | undefined;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(brief.prompt);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={variant === 'backdrop' ? 'art-slot is-backdrop' : 'art-slot'}
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': `جای تصویر: ${brief.label}. تصویر هنوز تولید نشده است.` })}
    >
      <div className="art-slot-inner">
        <div className="art-slot-head">
          <p className="art-slot-label">{brief.label}</p>
          <p className="art-slot-size">
            {toPersianDigits(brief.width)} × {toPersianDigits(brief.height)}
          </p>
        </div>

        <p className="art-slot-path" dir="ltr">
          apps/storefront/public{brief.file}
        </p>

        <details className="art-slot-body" open={variant === 'panel'}>
          <summary>دستور ساخت تصویر</summary>
          <p className="art-slot-note">{brief.composition}</p>
          <p className="art-slot-prompt" dir="ltr" lang="en">
            {brief.prompt}
          </p>
          <button className="art-slot-copy" type="button" onClick={() => void copyPrompt()}>
            {copied ? 'کپی شد' : 'کپی پرامپت'}
          </button>
        </details>
      </div>
    </div>
  );
}
