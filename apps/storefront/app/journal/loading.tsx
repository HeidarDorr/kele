import { LoadingSkeleton } from '../../components/loading-skeleton';

export default function JournalLoading() {
  return (
    <main
      id="main-content"
      className="journal-index shell"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="در حال دریافت ژورنال"
    >
      <span className="visually-hidden">در حال بارگذاری ژورنال</span>
      <header className="journal-index-heading" aria-hidden="true">
        <LoadingSkeleton className="skeleton-line short" />
        <LoadingSkeleton className="skeleton-heading" />
        <LoadingSkeleton className="skeleton-line" />
      </header>
      <div className="journal-index-grid" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <article className={index === 0 ? 'journal-featured' : ''} key={index}>
            <LoadingSkeleton className="journal-index-media" />
            <span className="journal-index-copy">
              <LoadingSkeleton className="skeleton-line short" />
              <LoadingSkeleton className="skeleton-line" />
              <LoadingSkeleton className="skeleton-line short" />
            </span>
          </article>
        ))}
      </div>
    </main>
  );
}
