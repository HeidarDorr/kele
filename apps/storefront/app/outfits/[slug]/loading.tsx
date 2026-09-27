import { LoadingSkeleton } from '../../../components/loading-skeleton';

export default function OutfitDetailLoading() {
  return (
    <main
      id="main-content"
      className="shell outfit-detail-page"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="در حال بررسی اجزا و موجودی ست…"
    >
      <span className="visually-hidden">در حال بارگذاری جزئیات ست</span>
      <div aria-hidden="true">
        <LoadingSkeleton className="skeleton-line short" />
        <section className="outfit-detail-hero">
          <LoadingSkeleton className="skeleton-product-media" />
          <div className="outfit-detail-copy detail-purchase-panel">
            <LoadingSkeleton className="skeleton-line short" />
            <LoadingSkeleton className="skeleton-heading" />
            <LoadingSkeleton className="skeleton-line" />
            <LoadingSkeleton className="skeleton-line" />
            <div className="skeleton-tools">
              <LoadingSkeleton />
              <LoadingSkeleton />
            </div>
            <LoadingSkeleton className="skeleton-line short" />
          </div>
        </section>
      </div>
    </main>
  );
}
