import { LoadingSkeleton } from '../../components/loading-skeleton';

export default function OutfitsLoading() {
  return (
    <main
      id="main-content"
      className="shell outfits-loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="در حال چیدن ست‌ها…"
    >
      <span className="visually-hidden">در حال بارگذاری ست‌ها</span>
      <div aria-hidden="true">
        <LoadingSkeleton className="skeleton-line short" />
        <LoadingSkeleton className="skeleton-heading" />
        <LoadingSkeleton className="skeleton-line" />
        <div className="outfit-loading-grid">
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    </main>
  );
}
