export const typographyVariants = ['elize', 'markazi'] as const;

export type TypographyVariant = (typeof typographyVariants)[number];

export function resolveTypographyVariant(value: string | undefined): TypographyVariant {
  return value === 'markazi' ? 'markazi' : 'elize';
}
