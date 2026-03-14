import { useState } from "react";
import { fallbackImage, formatMoney, getMode, getModeLabel } from "../../lib/products";

function ProductModal({ product, onClose, onAddToCart, onBuyNow }) {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  if (!product) return null;

  const qualityPoints = Array.isArray(product.quality_points) && product.quality_points.length
    ? product.quality_points
    : ["No quality points added yet."];

  function handleCart() {
    onAddToCart(product, quantity);
    setMessage(
      <>
        Added to cart: {quantity} x {product.name}. <a href="/cart">View cart</a>
      </>
    );
  }

  function handleBuy() {
    onBuyNow(product, quantity);
    setMessage(`Purchase confirmed: ${quantity} x ${product.name}`);
  }

  return (
    <div className="modal-backdrop show" aria-hidden="false" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" type="button" onClick={onClose}>
          X
        </button>

        <div className="modal-body">
          <div className="modal-media">
            <img src={product.image_url || fallbackImage(product.name)} alt="Product image" />
          </div>

          <div className="modal-info">
            <h2>{product.name}</h2>
            <p className="muted">{product.description || "No description provided."}</p>

            <div className="tags">
              {[product.category, product.subcategory, getModeLabel(getMode(product)), `Stock: ${product.quantity_available}`, `ID: ${product.product_id || "-"}`].map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            <h3 className="small-title">Quality</h3>
            <ul className="quality">
              {qualityPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            <div className="modal-prices">
              {product.buy_enabled && product.buy_price !== null ? (
                <div className="modal-price">
                  <span>
                    {formatMoney(product.buy_price, product.currency)} <small>buy</small>
                  </span>
                  <small>one-time</small>
                </div>
              ) : null}
              {product.rent_enabled && product.rent_price_per_day !== null ? (
                <div className="modal-price">
                  <span>
                    {formatMoney(product.rent_price_per_day, product.currency)} <small>/day rent</small>
                  </span>
                  <small>per day</small>
                </div>
              ) : null}
            </div>

            <div className="qty-row">
              <label htmlFor="modalQty">Quantity</label>
              <input
                id="modalQty"
                type="number"
                min="1"
                max={product.quantity_available > 0 ? product.quantity_available : undefined}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}
              />
            </div>

            <div className="modal-actions">
              <button className="btn primary" type="button" onClick={handleBuy}>
                Buy Now
              </button>
              <button className="btn" type="button" onClick={handleCart}>
                Add to Cart
              </button>
            </div>
            <p className="cart-msg">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;
