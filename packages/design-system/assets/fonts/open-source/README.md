# Temporary KELE typography pairing

The user selected this pairing for local review on 2026-09-05:

- Estedad Variable: headings, normally weight 500.
- Vazirmatn Variable: body text (400), controls and prices (500–600).

Both original WOFF2 files support weights 100–900 and are self-hosted using
Next.js `next/font/local`. No external font CDN is needed at runtime. The
unmodified upstream SIL Open Font License 1.1 notices are included alongside
the fonts. `manifest.json` records source revisions, download URLs, file sizes
and SHA-256 checksums; no glyphs or font tables were modified.

Upstream projects:

- https://github.com/aminabedi68/Estedad
- https://github.com/rastikerdar/vazirmatn

`KELE_TYPOGRAPHY=estedad-vazirmatn` is the temporary default. Explicit `elize`
or `markazi` retains the earlier Peyda-based review variants. Change the value
before starting/rebuilding the Next.js applications. This review selection does
not finalize the brand typography decision tracked by DES-002.
