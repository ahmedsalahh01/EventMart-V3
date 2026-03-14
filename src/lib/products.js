const STORAGE_KEY = "eventmart_products_v1";
const METRICS_KEY = "eventmart_product_metrics_v1";
const API_CANDIDATES = ["/api/products", "/products"];

export function formatMoney(value, currency = "USD") {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2
  }).format(Number(value));
}

export function fallbackImage() {
  return "/assets/equipment-collage.jpg";
}

export function fallbackProductId(id) {
  const clean = String(id ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (clean) return `P-${clean.slice(-5).padStart(5, "0")}`;
  return `P-${Date.now().toString().slice(-5)}`;
}

export function getMode(product) {
  if (product.buy_enabled && product.rent_enabled) return "BOTH";
  if (product.buy_enabled) return "BUY_ONLY";
  if (product.rent_enabled) return "RENT_ONLY";
  return "NONE";
}

export function getModeLabel(mode) {
  if (mode === "BUY_ONLY") return "Buy Only";
  if (mode === "RENT_ONLY") return "Rent Only";
  if (mode === "BOTH") return "Buy / Rent";
  return "Unavailable";
}

export function getStartingPrice(product) {
  if (product.buy_enabled && product.buy_price !== null) return Number(product.buy_price);
  if (product.rent_enabled && product.rent_price_per_day !== null) return Number(product.rent_price_per_day);
  return 0;
}

function toNum(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

export function normalizeProduct(row) {
  const localId = String(row.id);
  const product = {
    id: localId,
    product_id: String(row.product_id || fallbackProductId(localId)),
    name: String(row.name || "Unnamed Product"),
    category: String(row.category || "General"),
    subcategory: String(row.subcategory || "General"),
    image_url: row.image_url || "",
    description: String(row.description || ""),
    quality_points: Array.isArray(row.quality_points) ? row.quality_points : [],
    buy_enabled: Boolean(row.buy_enabled),
    rent_enabled: Boolean(row.rent_enabled),
    buy_price: toNum(row.buy_price, null),
    rent_price_per_day: toNum(row.rent_price_per_day, null),
    currency: String(row.currency || "USD"),
    active: row.active !== false,
    quantity_available: toNum(row.quantity_available, 0)
  };

  return {
    ...product,
    startingPrice: getStartingPrice(product)
  };
}

export function clearStoredProducts() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // Ignore storage cleanup failures.
  }
}

export function readStoredProducts() {
  return [];
}

export async function loadProducts() {
  clearStoredProducts();

  for (const url of API_CANDIDATES) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const rows = await response.json();
      if (!Array.isArray(rows)) continue;
      const products = rows.map(normalizeProduct);
      return products.filter((product) => product.active !== false);
    } catch (_error) {
      // Try next endpoint.
    }
  }

  return [];
}

export function getMetricsMap() {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_error) {
    return {};
  }
}

export function bumpMetric(productId, metric, qty = 1) {
  if (!productId) return;
  const metrics = getMetricsMap();
  if (!metrics[productId]) metrics[productId] = {};
  metrics[productId][metric] = Number(metrics[productId][metric] || 0) + Number(qty || 1);
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

export function getProductMetric(productId, metric) {
  return Number(getMetricsMap()?.[productId]?.[metric] || 0);
}

export function metricScore(productId) {
  return getProductMetric(productId, "purchase") * 5 + getProductMetric(productId, "add_to_cart") * 2 + getProductMetric(productId, "product_view");
}

export function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

export function getProductRating(product) {
  const seed = hashCode(String(product.id || product.name || "product"));
  const score = metricScore(product.id);
  const spread = ((seed + score) % 6) / 10;
  const rating = Math.min(5, 4.5 + spread);
  return rating.toFixed(1);
}

