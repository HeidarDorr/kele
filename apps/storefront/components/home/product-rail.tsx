import Link from 'next/link';
import type { ProductCardValue } from '../../lib/catalog-api';
import { ProductCard } from '../product-card';

/**
 * Curated product row.
 *
 * The rail keeps a fixed card measure and scrolls, so a curation of one reads the
 * same as a curation of eight instead of stranding a lone card in a wide grid.
 */
export function ProductRail({
  title,
  items,
  titleId,
}: {
  title: string;
  items: readonly ProductCardValue[];
  titleId: string;
}) {
  return (
    <section className="home-products" aria-labelledby={titleId}>
      <div className="shell">
        <header className="home-heading home-heading-split">
          <div>
            <p className="home-eyebrow">انتخاب تحریریه</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Link className="home-heading-link" href="/catalog">
            مشاهدهٔ فروشگاه
          </Link>
        </header>
      </div>

      {items.length > 0 ? (
        <ul className="home-product-rail">
          {items.map((product) => (
            <li key={`${product.productId}-${product.selectedVariant.id}`}>
              <ProductCard product={product} />
            </li>
          ))}
          <li className="home-product-rail-end">
            <Link href="/catalog">
              <span aria-hidden="true">→</span>
              <strong>همهٔ محصولات</strong>
              <small>مجموعهٔ کامل KELE را ببینید</small>
            </Link>
          </li>
        </ul>
      ) : (
        <div className="shell">
          <div className="state-panel">
            <h3>انتخابی برای نمایش وجود ندارد</h3>
            <p>محصولات پیش‌نویس تا زمان انتشار در این بخش دیده نمی‌شوند.</p>
          </div>
        </div>
      )}
    </section>
  );
}
