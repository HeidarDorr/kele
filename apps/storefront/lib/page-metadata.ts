import type { Metadata } from 'next';

/**
 * CMS SEO titles are complete document titles and must bypass the root
 * layout template (`%s | KELE`). Fallback names rely on that template.
 */
export function resolvePageTitle(
  seoTitle: string | null | undefined,
  fallback: string,
): Metadata['title'] {
  const trimmed = seoTitle?.trim();
  if (trimmed) {
    return { absolute: trimmed };
  }

  return fallback;
}

/**
 * Site-wide SEO defaults from editorial settings are also complete titles.
 */
export function resolveSiteTitle(
  configuredTitle: string | null | undefined,
): Metadata['title'] | undefined {
  const trimmed = configuredTitle?.trim();
  if (!trimmed) {
    return undefined;
  }

  return { absolute: trimmed };
}
