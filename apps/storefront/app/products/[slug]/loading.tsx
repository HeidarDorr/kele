export default function ProductLoading() {
  return (
    <main className="shell product-page" aria-busy="true" aria-label="در حال بارگذاری محصول">
      <div className="product-detail-grid">
        <div className="skeleton skeleton-product-media" />
        <div>
          <div className="skeleton skeleton-heading" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      </div>
    </main>
  );
}
