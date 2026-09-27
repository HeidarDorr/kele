import { LoadingSkeleton } from '../components/loading-skeleton';

export default function StorefrontLoading() {
  return (
    <main
      id="main-content"
      className="home"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="در حال بارگذاری صفحه"
    >
      <span className="visually-hidden">در حال بارگذاری صفحه</span>
      <section className="home-hero" aria-hidden="true">
        <LoadingSkeleton className="home-hero-media" />
        <div className="home-hero-veil" />
        <div className="home-hero-copy">
          <LoadingSkeleton className="skeleton-line short" />
          <LoadingSkeleton className="skeleton-heading" />
          <LoadingSkeleton className="skeleton-line" />
          <div className="skeleton-tools">
            <LoadingSkeleton />
            <LoadingSkeleton />
          </div>
        </div>
      </section>
      <section className="home-promise" aria-hidden="true">
        <div className="shell">
          <ul className="home-promise-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index}>
                <LoadingSkeleton className="skeleton-line short" />
                <LoadingSkeleton className="skeleton-line" />
                <LoadingSkeleton className="skeleton-line short" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
