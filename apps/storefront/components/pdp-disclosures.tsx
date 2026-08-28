'use client';

import { useState } from 'react';

export type DisclosureItem = {
  readonly title: string;
  readonly content: string;
};

export function PdpDisclosures({ items }: { readonly items: readonly DisclosureItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="pdp-disclosures">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `pdp-disclosure-panel-${String(index)}`;
        const triggerId = `pdp-disclosure-trigger-${String(index)}`;

        return (
          <div key={item.title} className={`pdp-disclosure-item ${isOpen ? 'is-open' : ''}`}>
            <button
              id={triggerId}
              type="button"
              className="pdp-disclosure-trigger"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => {
                setOpenIndex((current) => (current === index ? null : index));
              }}
            >
              <span>{item.title}</span>
              <span className="pdp-disclosure-icon" aria-hidden="true">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className="pdp-disclosure-body"
            >
              <div className="pdp-disclosure-content">
                <p>{item.content}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
