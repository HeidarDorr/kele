import { LoadingSkeleton } from '../../components/loading-skeleton';

export default function CatalogLoading() {
  return (
    <main
      id="main-content"
      className="shell catalog-page"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="در حال بارگذاری کاتالوگ"
    >
      <span className="visually-hidden">در حال بارگذاری کاتالوگ</span>
      <div aria-hidden="true">
        <header className="catalog-heading">
          <LoadingSkeleton className="skeleton-line short" />
          <LoadingSkeleton className="skeleton-heading" />
          <LoadingSkeleton className="skeleton-line" />
        </header>
        <div className="product-category-index catalog-category-skeleton-index">
          {Array.from({ length: 8 }, (_, index) => (
            <LoadingSkeleton className="catalog-category-skeleton" key={index} />
          ))}
        </div>
        <div className="skeleton-tools">
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
        <div className="product-grid skeleton-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <LoadingSkeleton className="skeleton-image" />
              <LoadingSkeleton className="skeleton-line" />
              <LoadingSkeleton className="skeleton-line short" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
