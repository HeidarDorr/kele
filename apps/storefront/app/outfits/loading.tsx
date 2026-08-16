export default function OutfitsLoading() {
  return (
    <main id="main-content" className="shell outfits-loading" aria-busy="true" aria-live="polite">
      <p>در حال چیدن ست‌ها…</p>
      <div className="outfit-loading-grid" aria-hidden="true">
        <span />
        <span />
      </div>
    </main>
  );
}
