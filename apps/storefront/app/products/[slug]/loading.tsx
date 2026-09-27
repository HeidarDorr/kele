import { LoadingSkeleton } from '../../../components/loading-skeleton';

export default function ProductLoading() {
  return (
    <main
      id="main-content"
      className="shell product-page"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="در حال بارگذاری محصول"
    >
      <span className="visually-hidden">در حال بارگذاری محصول</span>
      <div aria-hidden="true">
        <LoadingSkeleton className="skeleton-line short" />
        <div className="product-detail-grid">
          <LoadingSkeleton className="skeleton-product-media" />
          <div className="detail-purchase-panel">
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
        </div>
      </div>
    </main>
  );
}
