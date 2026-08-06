export default function CatalogLoading() {
  return (
    <main
      id="main-content"
      className="shell catalog-page"
      aria-busy="true"
      aria-label="در حال بارگذاری کاتالوگ"
    >
      <span className="visually-hidden">در حال بارگذاری کاتالوگ</span>
      <div className="skeleton skeleton-heading" />
      <div className="skeleton-tools">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="product-grid skeleton-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index}>
            <div className="skeleton skeleton-image" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))}
      </div>
    </main>
  );
}
