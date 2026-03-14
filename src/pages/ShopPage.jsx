import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/shop/ProductCard";
import ProductModal from "../components/shop/ProductModal";
import { useCart } from "../contexts/CartContext";
import {
  bumpMetric,
  getMode,
  getProductMetric,
  loadProducts,
  metricScore
} from "../lib/products";
import "./../styles/shop.css";

function ShopPage() {
  const [searchParams] = useSearchParams();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedMode, setSelectedMode] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("featured");
  const [activeProduct, setActiveProduct] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadProducts().then((rows) => {
      if (cancelled) return;
      setProducts(rows);

      const requestedCategory = searchParams.get("category");
      if (requestedCategory && rows.some((product) => product.category === requestedCategory)) {
        setSelectedCategory(requestedCategory);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const categories = useMemo(
    () => Array.from(new Set(products.filter((product) => product.active !== false).map((product) => product.category))).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const next = products.filter((product) => {
      const categoryOk = selectedCategory === "ALL" || product.category === selectedCategory;
      const modeOk = selectedMode === "ALL" || getMode(product) === selectedMode;
      const searchOk =
        !query ||
        product.name.toLowerCase().includes(query) ||
        String(product.product_id || "").toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.subcategory.toLowerCase().includes(query);

      return product.active !== false && categoryOk && modeOk && searchOk;
    });

    return [...next].sort((a, b) => {
      if (sortMode === "low") return a.startingPrice - b.startingPrice;
      if (sortMode === "high") return b.startingPrice - a.startingPrice;
      if (sortMode === "name") return a.name.localeCompare(b.name);
      return metricScore(b.id) - metricScore(a.id);
    });
  }, [products, searchQuery, selectedCategory, selectedMode, sortMode]);

  const browseInfo = `Browse ${products.length} products across ${categories.length} categories`;

  function openModal(product) {
    bumpMetric(product.id, "product_view", 1);
    setActiveProduct(product);
  }

  function quickAdd(product) {
    if (product.quantity_available <= 0) return;
    const mode = product.buy_enabled && product.buy_price !== null ? "buy" : "rent";
    bumpMetric(product.id, "add_to_cart", 1);
    addItem(product, 1, mode);
  }

  function handleAddToCart(product, quantity) {
    const mode = product.buy_enabled && product.buy_price !== null ? "buy" : "rent";
    bumpMetric(product.id, "add_to_cart", quantity);
    addItem(product, quantity, mode);
  }

  function handleBuyNow(product, quantity) {
    bumpMetric(product.id, "purchase", quantity);
    addItem(product, quantity, "buy");
  }

  return (
    <motion.div className="shop-page-shell" data-theme-scope="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <main className="shop-page">
        <section className="shop-header">
          <h1>Shop Equipment</h1>
          <p>{browseInfo}</p>
        </section>

        <section className="shop-filters" aria-label="Product filters">
          <label className="search-wrap" htmlFor="searchInput">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input id="searchInput" type="search" placeholder="Search products..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </label>

          <div className="filter-selects">
            <select value={selectedCategory} aria-label="Filter by category" onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="ALL">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select value={selectedMode} aria-label="Filter by mode" onChange={(event) => setSelectedMode(event.target.value)}>
              <option value="ALL">All</option>
              <option value="BUY_ONLY">Buy Only</option>
              <option value="RENT_ONLY">Rent Only</option>
              <option value="BOTH">Buy / Rent</option>
            </select>

            <select value={sortMode} aria-label="Sort products" onChange={(event) => setSortMode(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="name">Name: A - Z</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
        </section>

        <p className="results-text">{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} found</p>
        <section className="products-grid" aria-label="Products list">
          {filteredProducts.length ? (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={openModal}
                onQuickAdd={quickAdd}
                isFeatured={getProductMetric(product.id, "purchase") * 5 + getProductMetric(product.id, "add_to_cart") * 2 + getProductMetric(product.id, "product_view") >= 0}
              />
            ))
          ) : (
            <article className="empty-card">
              <h3>No products found</h3>
              <p>Try changing filters, or add products from the Admin page.</p>
            </article>
          )}
        </section>
      </main>

      {activeProduct ? (
        <ProductModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      ) : null}
    </motion.div>
  );
}

export default ShopPage;
