import { fallbackImage, formatMoney, getMode, getModeLabel, getProductRating } from "../../lib/products";

function ProductCard({ product, onView, onQuickAdd, isFeatured = true }) {
  const buyExists = product.buy_enabled && product.buy_price !== null;
  const rentExists = product.rent_enabled && product.rent_price_per_day !== null;
  const canCart = (buyExists || rentExists) && product.quantity_available !== 0;
  const mode = getMode(product);

  function renderPrice() {
    if (buyExists && rentExists) {
      return (
        <>
          <strong>{formatMoney(product.buy_price, product.currency)}</strong>
          <span>{formatMoney(product.rent_price_per_day, product.currency)}/day</span>
        </>
      );
    }

    if (buyExists) return <strong>{formatMoney(product.buy_price, product.currency)}</strong>;
    if (rentExists) return <strong>{formatMoney(product.rent_price_per_day, product.currency)}/day</strong>;
    return <strong>Unavailable</strong>;
  }

  const shortDescription = product.description?.trim()
    ? product.description.length <= 58
      ? product.description
      : `${product.description.slice(0, 58).trim()}...`
    : "No description provided.";

  return (
    <article className="product-card">
      <div className="product-media">
        <img src={product.image_url || fallbackImage(product.name)} alt={product.name} />
        <div className="product-badges">
          <span className="badge badge-mode">{getModeLabel(mode)}</span>
          {isFeatured ? <span className="badge badge-featured">Featured</span> : null}
        </div>
      </div>

      <div className="product-body">
        <div className="product-head">
          <h3>{product.name}</h3>
          <span className="product-rating">&#9733; {getProductRating(product)}</span>
        </div>

        <p className="product-desc">{shortDescription}</p>

        <div className="price-line">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m3 9 9-6 9 6-9 6-9-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M6 11.5v5.8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {renderPrice()}
        </div>

        <div className="product-actions">
          <button className="add-cart-btn" type="button" disabled={!canCart} onClick={() => onQuickAdd(product)}>
            Add to Cart
          </button>
          <button className="view-btn" type="button" aria-label="View details" onClick={() => onView(product)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6S2.2 12 2.2 12Z" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
