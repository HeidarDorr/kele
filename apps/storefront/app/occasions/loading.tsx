import { LoadingSkeleton } from '../../components/loading-skeleton';

export default function OccasionsLoading() {
  return (
    <main
      id="main-content"
      className="occasion-index shell"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="در حال بارگذاری موقعیت‌ها"
    >
      <span className="visually-hidden">در حال بارگذاری موقعیت‌ها</span>
      <header aria-hidden="true">
        <LoadingSkeleton className="skeleton-line short" />
        <LoadingSkeleton className="skeleton-heading" />
        <LoadingSkeleton className="skeleton-line" />
      </header>
      <div className="editorial-loading-grid" aria-hidden="true">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    </main>
  );
}
