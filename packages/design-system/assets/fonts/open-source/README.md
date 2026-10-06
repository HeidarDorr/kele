# Final KELE typography pairing

The approved pairing on 2026-10-06 is:

- Parastoo Variable: headings, normally weight 500.
- Vazirmatn Variable: body text (400), controls and prices (500–600).

Both faces are self-hosted using Next.js `next/font/local`. No external font CDN
is needed at runtime. The unmodified upstream SIL Open Font License 1.1 notices
are included alongside the fonts. `manifest.json` records source revisions,
download URLs, file sizes and SHA-256 checksums; no glyphs or font tables were
modified.

Upstream projects:

- https://github.com/googlefonts/parastoo-font
- https://github.com/rastikerdar/vazirmatn
- https://github.com/aminabedi68/Estedad

`KELE_TYPOGRAPHY=parastoo-vazirmatn` is the approved default.
`KELE_TYPOGRAPHY=estedad-vazirmatn` retains the earlier Estedad/Vazirmatn review
pairing as a legacy rollback choice. Explicit `elize` or `markazi` retains the
earlier Peyda-based review variants. Change the value before starting/rebuilding
the Next.js applications. See `docs/decisions/2026-10-06-final-typography-pairing.md`.
