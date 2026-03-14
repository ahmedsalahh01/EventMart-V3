import { motion } from "framer-motion";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useTheme } from "../contexts/ThemeContext";
import Footer from "../components/Footer";
import { formatMoney } from "../lib/products";
import "./../styles/cart.css";

function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated, firstName } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { items, itemCount, updateQuantity, updateRentalDays, removeItem, clearCart } = useCart();

  const subtotal = items.reduce((total, item) => {
    const multiplier = item.mode === "rent" ? Number(item.rental_days || 1) : 1;
    return total + Number(item.unit_price || 0) * Number(item.quantity || 0) * multiplier;
  }, 0);
  const currency = items[0]?.currency || "USD";
  const hasItems = items.length > 0;
  const authLabel = isAuthenticated && firstName ? `Hi, ${firstName}` : "Sign In";
  const cartTitle = `Shopping Cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`;

  function navLinkClassName({ isActive }) {
    return isActive ? "active" : undefined;
  }

  function fallbackImage(item) {
    return item.image_url || "/assets/EVE4.png";
  }

  return (
    <motion.div className="cart-page" data-theme-scope="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <header className="cart-navbar">
        <Link to="/" className="brand-link" aria-label="EventMart Home">
          <span className="brand-text">
            Event<span>Mart</span>
          </span>
        </Link>

        <nav className="center-nav" aria-label="Main navigation">
          <NavLink to="/" end className={navLinkClassName}>
            Home
          </NavLink>
          <NavLink to="/shop" className={navLinkClassName}>
            Shop
          </NavLink>
          <NavLink to="/ai-planner" className={navLinkClassName}>
            AI Planner
          </NavLink>
          <NavLink to="/about" className={navLinkClassName}>
            About
          </NavLink>
          <NavLink to="/contact" className={navLinkClassName}>
            Contact
          </NavLink>
        </nav>

        <div className="nav-actions">
          <button type="button" className="icon-btn" id="themeToggle" data-theme-toggle aria-label="Toggle interface color" onClick={toggleTheme}>
            <svg id="themeIconSun" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: theme === "dark" ? "none" : "block" }}>
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 3V5.2M12 18.8V21M3 12H5.2M18.8 12H21M5.64 5.64L7.2 7.2M16.8 16.8L18.36 18.36M18.36 5.64L16.8 7.2M7.2 16.8L5.64 18.36"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <svg id="themeIconMoon" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: theme === "dark" ? "block" : "none" }}>
              <path
                d="M20 14.2A8 8 0 1 1 9.8 4 6.4 6.4 0 0 0 20 14.2Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <Link to="/cart" className="icon-btn cart-btn active-cart" aria-label="Shopping cart">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 5H6L7.7 14.2A1 1 0 0 0 8.68 15H17.4A1 1 0 0 0 18.36 14.26L20 8H7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9.6" cy="19" r="1.2" fill="currentColor" />
              <circle cx="16.8" cy="19" r="1.2" fill="currentColor" />
            </svg>
            <span className="cart-badge" data-cart-count style={{ display: itemCount > 0 ? "inline-block" : "none" }}>
              {itemCount}
            </span>
          </Link>

          <Link to={isAuthenticated ? "/profile" : "/auth?tab=signin"} className="signin-link">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 20c.9-3.2 3.72-5 7-5s6.1 1.8 7 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span id="authText">{authLabel}</span>
          </Link>
        </div>
      </header>

      <main className="cart-main">
        <h2 id="cartTitle">{cartTitle}</h2>

        <div className="cart-layout">
          <section className="cart-panel">
            <section id="emptyState" className="empty-state" hidden={hasItems}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6.8 4h10.4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6.8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4.8 8.2h14.4L17 5.2H7l-2.2 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M9.3 11.6a2.7 2.7 0 0 0 5.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <h2>Your cart is empty</h2>
              <p>Start adding items to create your event</p>
              <Link to="/shop" className="browse-btn">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6.8 4h10.4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6.8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4.8 8.2h14.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Browse Products
              </Link>
            </section>

            <section id="filledState" className="filled-state" hidden={!hasItems}>
              <div id="cartItemsList" className="cart-items-list">
                {items.map((item) => {
                  const rentalDays = Math.max(1, Number(item.rental_days || 1));
                  const total = Number(item.quantity || 0) * Number(item.unit_price || 0) * (item.mode === "rent" ? rentalDays : 1);
                  const stockLimit = Number(item.stock || 0) > 0 ? Number(item.stock) : Number.POSITIVE_INFINITY;

                  return (
                    <article key={`${item.id}-${item.mode}`} className="cart-item">
                      <img className="item-image" src={fallbackImage(item)} alt={item.name} />

                      <div className="item-body">
                        <h3 className="item-title">{item.name}</h3>
                        <p className="item-mode">
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="m3 9 9-6 9 6-9 6-9-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                            <path d="M6 11.5v5.8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                          {item.mode === "rent" ? "Rent" : "Buy"}
                        </p>

                        <div className="item-controls">
                          <div className="qty-controls" aria-label="Quantity controls">
                            <button
                              className="qty-btn"
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => updateQuantity(item.id, item.mode, Math.max(1, item.quantity - 1))}
                            >
                              -
                            </button>
                            <span className="qty-value">{item.quantity}</span>
                            <button
                              className="qty-btn"
                              type="button"
                              aria-label="Increase quantity"
                              disabled={item.quantity >= stockLimit}
                              onClick={() => updateQuantity(item.id, item.mode, item.quantity + 1)}
                            >
                              +
                            </button>
                          </div>

                          {item.mode === "rent" ? (
                            <div className="rental-days-controls" aria-label="Rental days controls">
                              <span className="days-label">Days:</span>
                              <button
                                className="qty-btn"
                                type="button"
                                aria-label="Decrease rental days"
                                onClick={() => updateRentalDays(item.id, item.mode, Math.max(1, rentalDays - 1))}
                              >
                                -
                              </button>
                              <span className="qty-value">{rentalDays}</span>
                              <button
                                className="qty-btn"
                                type="button"
                                aria-label="Increase rental days"
                                onClick={() => updateRentalDays(item.id, item.mode, rentalDays + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="item-side">
                        <strong className="item-price">{formatMoney(total, item.currency)}</strong>
                        <button className="remove-btn" type="button" aria-label="Remove item" onClick={() => removeItem(item.id, item.mode)}>
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M5 7h14M9 7V5h6v2M9.5 11.2v5.8M14.5 11.2v5.8M7.8 7l.8 11.2a1 1 0 0 0 1 .8h4.8a1 1 0 0 0 1-.8L16.2 7"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <button type="button" id="clearCartBtn" className="clear-btn" hidden={!hasItems} onClick={clearCart}>
                Clear Cart
              </button>
            </section>
          </section>

          <aside className="summary-panel">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong id="summarySubtotal">{formatMoney(subtotal, currency)}</strong>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <strong className="muted-strong">Calculated at checkout</strong>
            </div>
            <hr />
            <div className="summary-row total-row">
              <span>Total</span>
              <strong id="summaryTotal">{formatMoney(subtotal, currency)}</strong>
            </div>
            <button
              type="button"
              id="checkoutBtn"
              className="checkout-btn"
              disabled={!hasItems}
              onClick={() => navigate("/auth?tab=signin")}
            >
              Checkout
              <span aria-hidden="true">&rarr;</span>
            </button>
          </aside>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
}

export default CartPage;
