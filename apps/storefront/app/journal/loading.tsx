export default function JournalLoading() {
  return (
    <main id="main-content" className="journal-index shell" aria-busy="true">
      <div className="editorial-loading-line" />
      <div className="editorial-loading-grid">
        <span />
        <span />
        <span />
      </div>
      <p className="visually-hidden">در حال دریافت ژورنال</p>
    </main>
  );
}
