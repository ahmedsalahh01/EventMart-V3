const STORAGE_KEY = "eventmart_products_v1";
const METRICS_KEY = "eventmart_product_metrics_v1";
const API_CANDIDATES = ["http://localhost:4000/api/products", "http://localhost:4000/products"];
const USERS_API_CANDIDATES = ["http://localhost:4000/api/users", "/api/users"];

let products = [];
let users = [];
let editingId = null;
let currentRange = { start: null, end: null };
let productApiBase = API_CANDIDATES[0];

const sideButtons = Array.from(document.querySelectorAll(".side-btn"));
const sections = Array.from(document.querySelectorAll(".admin-section"));

const presetRange = document.getElementById("presetRange");
const rangeStartInput = document.getElementById("rangeStart");
const rangeEndInput = document.getElementById("rangeEnd");
const applyRangeBtn = document.getElementById("applyRangeBtn");
const dashboardCards = document.getElementById("dashboardCards");

const productForm = document.getElementById("productForm");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const adminSearch = document.getElementById("adminSearch");
const adminProductsList = document.getElementById("adminProductsList");
const usersSearch = document.getElementById("usersSearch");
const refreshUsersBtn = document.getElementById("refreshUsersBtn");
const usersListTitle = document.getElementById("usersListTitle");
const usersList = document.getElementById("usersList");

const mostSoldList = document.getElementById("mostSoldList");
const mostVisitedList = document.getElementById("mostVisitedList");
const cartVsSuccessList = document.getElementById("cartVsSuccessList");
const profitabilityList = document.getElementById("profitabilityList");
const ISO_CURRENCY_ALPHA_REGEX = /^[A-Z]{3}$/;
const ISO_CURRENCY_NUMERIC_REGEX = /^\d{3}$/;
const PRODUCT_ID_REGEX = /^[A-Z0-9][A-Z0-9-_]{1,31}$/;
const DEFAULT_CURRENCY_ALPHA = "EGP";
const DEFAULT_CURRENCY_NUMERIC = "000";
const CURRENCY_NUMERIC_TO_ALPHA = Object.freeze({
  "008": "ALL",
  "012": "DZD",
  "032": "ARS",
  "036": "AUD",
  "124": "CAD",
  "156": "CNY",
  "392": "JPY",
  "410": "KRW",
  "682": "SAR",
  "784": "AED",
  "818": "EGP",
  "826": "GBP",
  "840": "USD",
  "978": "EUR"
});
const CURRENCY_ALPHA_TO_NUMERIC = Object.freeze(
  Object.fromEntries(
    Object.entries(CURRENCY_NUMERIC_TO_ALPHA).map(([numeric, alpha]) => [alpha, numeric])
  )
);

const fields = {
  productId: document.getElementById("productId"),
  product_id: document.getElementById("product_id"),
  name: document.getElementById("name"),
  category: document.getElementById("category"),
  subcategory: document.getElementById("subcategory"),
  currency: document.getElementById("currency"),
  buy_price: document.getElementById("buy_price"),
  rent_price_per_day: document.getElementById("rent_price_per_day"),
  quantity_available: document.getElementById("quantity_available"),
  reorder_level: document.getElementById("reorder_level"),
  unit_cost: document.getElementById("unit_cost"),
  overhead_cost: document.getElementById("overhead_cost"),
  image_url: document.getElementById("image_url"),
  description: document.getElementById("description"),
  quality_points: document.getElementById("quality_points"),
  buy_enabled: document.getElementById("buy_enabled"),
  rent_enabled: document.getElementById("rent_enabled"),
  active: document.getElementById("active")
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeProductIdInput(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-_]/g, "");
}

function fallbackProductId(seed) {
  const clean = String(seed ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (clean) {
    const tail = clean.slice(-5).padStart(5, "0");
    return `P-${tail}`;
  }
  return `P-${Date.now().toString().slice(-5)}`;
}

function generateNextProductId() {
  const maxNumeric = products.reduce((max, product) => {
    const match = String(product.product_id || "").match(/(\d+)/);
    const n = match ? Number(match[1]) : 0;
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `P-${String(maxNumeric + 1).padStart(5, "0")}`;
}

function normalizeCurrencyNumericInput(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 3);
}

function normalizeCurrencyAlphaInput(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

function numericCurrencyToAlpha(value) {
  const normalized = normalizeCurrencyNumericInput(value);
  if (!ISO_CURRENCY_NUMERIC_REGEX.test(normalized)) return "";
  return CURRENCY_NUMERIC_TO_ALPHA[normalized] || "";
}

function alphaCurrencyToNumeric(value) {
  const normalized = normalizeCurrencyAlphaInput(value);
  if (!ISO_CURRENCY_ALPHA_REGEX.test(normalized)) return "";
  return CURRENCY_ALPHA_TO_NUMERIC[normalized] || "";
}

function getSafeCurrencyAlpha(value, fallback = DEFAULT_CURRENCY_ALPHA) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  if (ISO_CURRENCY_NUMERIC_REGEX.test(raw)) {
    return numericCurrencyToAlpha(raw) || fallback;
  }

  const normalizedAlpha = normalizeCurrencyAlphaInput(raw);
  return ISO_CURRENCY_ALPHA_REGEX.test(normalizedAlpha) ? normalizedAlpha : fallback;
}

function getSafeCurrencyNumeric(value, fallback = DEFAULT_CURRENCY_NUMERIC) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  if (ISO_CURRENCY_NUMERIC_REGEX.test(raw)) {
    return numericCurrencyToAlpha(raw) ? raw : fallback;
  }

  return alphaCurrencyToNumeric(raw) || fallback;
}

function formatMoney(value, currency = DEFAULT_CURRENCY_ALPHA) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
    return "-";
  }
  const safeCurrency = getSafeCurrencyAlpha(currency, DEFAULT_CURRENCY_ALPHA);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 2
    }).format(Number(value));
  } catch (_error) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: DEFAULT_CURRENCY_ALPHA,
      maximumFractionDigits: 2
    }).format(Number(value));
  }
}

function formatDateTime(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Invalid date";
  return date.toLocaleString();
}

function toNum(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function clearStoredProducts() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // Ignore storage cleanup errors.
  }
}

function randomId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

async function apiRequestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.details || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function requestProductApi({ method = "GET", id = "", body } = {}) {
  const orderedBases = [productApiBase, ...API_CANDIDATES.filter((candidate) => candidate !== productApiBase)];
  let lastError = null;

  for (const base of orderedBases) {
    const url = id ? `${base}/${encodeURIComponent(id)}` : base;
    try {
      const payload = await apiRequestJson(url, { method, body });
      productApiBase = base;
      return payload;
    } catch (error) {
      lastError = error;
      if (error?.status && ![404, 405].includes(error.status)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Unable to reach the products API.");
}

async function loadProducts() {
  try {
    const rows = await requestProductApi();
    products = Array.isArray(rows) ? ensureUniqueProductIds(rows.map(mapApiProduct)) : [];
    clearStoredProducts();
  } catch (error) {
    console.error("LOAD PRODUCTS ERROR:", error.message);
    products = [];
  }
}

async function loadUsers() {
  for (const url of USERS_API_CANDIDATES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const rows = await res.json();
      if (!Array.isArray(rows)) continue;
      users = rows.map((row) => ({
        id: String(row.id ?? ""),
        name: String(row.name ?? "Unnamed User"),
        email: String(row.email ?? ""),
        role: String(row.role ?? "customer"),
        created_at: row.created_at || null,
        last_login_at: row.last_login_at || null
      }));
      return;
    } catch (_error) {
      // Keep trying next candidate.
    }
  }

  users = [];
}

function mapApiProduct(row) {
  const mappedId = String(row.id ?? randomId());
  return {
    id: mappedId,
    product_id: normalizeProductIdInput(row.product_id) || fallbackProductId(mappedId),
    name: String(row.name ?? ""),
    category: String(row.category ?? "General"),
    subcategory: String(row.subcategory ?? "General"),
    description: String(row.description ?? ""),
    quality_points: Array.isArray(row.quality_points) ? row.quality_points : [],
    buy_enabled: Boolean(row.buy_enabled),
    rent_enabled: Boolean(row.rent_enabled),
    buy_price: toNum(row.buy_price, null),
    rent_price_per_day: toNum(row.rent_price_per_day, null),
    currency: getSafeCurrencyAlpha(row.currency, DEFAULT_CURRENCY_ALPHA),
    active: row.active !== false,
    quantity_available: toNum(row.quantity_available, 0),
    reorder_level: toNum(row.reorder_level, 0),
    unit_cost: toNum(row.unit_cost, 0),
    overhead_cost: toNum(row.overhead_cost, 0),
    image_url: String(row.image_url ?? ""),
    created_at: String(row.created_at ?? nowIso()),
    updated_at: String(row.updated_at ?? nowIso())
  };
}

function ensureUniqueProductIds(list) {
  const used = new Set();
  return list.map((item) => {
    const base = normalizeProductIdInput(item.product_id) || fallbackProductId(item.id);
    let candidate = base;
    let suffix = 1;
    while (used.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    return { ...item, product_id: candidate };
  });
}



function getMetricsMap() {
  return storageGet(METRICS_KEY, {});
}

function setRangeFromPreset(preset) {
  const end = new Date();
  const start = new Date(end);

  if (preset === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (preset === "week") {
    start.setDate(end.getDate() - 7);
  } else if (preset === "month") {
    start.setMonth(end.getMonth() - 1);
  } else if (preset === "year") {
    start.setFullYear(end.getFullYear() - 1);
  } else if (preset === "custom") {
    return;
  }

  currentRange.start = start;
  currentRange.end = end;
  rangeStartInput.value = toDateTimeLocal(start);
  rangeEndInput.value = toDateTimeLocal(end);
}

function toDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isWithinRange(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.valueOf())) return true;
  if (currentRange.start && date < currentRange.start) return false;
  if (currentRange.end && date > currentRange.end) return false;
  return true;
}

function computeDashboardMetrics() {
  const inRange = products.filter((p) => isWithinRange(p.created_at || p.updated_at));
  const activeCount = inRange.filter((p) => p.active).length;
  const lowStock = inRange.filter((p) => Number(p.quantity_available) <= Number(p.reorder_level)).length;
  const categories = new Set(inRange.map((p) => p.category.trim()).filter(Boolean));
  const avgStartPrice = inRange.length
    ? inRange.reduce((sum, p) => sum + Number(p.buy_price ?? p.rent_price_per_day ?? 0), 0) / inRange.length
    : 0;

  return [
    { title: "Products In Range", value: inRange.length, sub: "Filtered by selected date range." },
    { title: "Active Products", value: activeCount, sub: `${inRange.length - activeCount} inactive` },
    { title: "Categories", value: categories.size, sub: "Dynamic categories from product records." },
    { title: "Low Stock", value: lowStock, sub: "Quantity less than or equal reorder level." },
    { title: "Avg Starting Price", value: formatMoney(avgStartPrice, "USD"), sub: "Buy price if available, else rent/day." }
  ];
}

function renderDashboard() {
  if (!dashboardCards) return;
  const cards = computeDashboardMetrics();
  dashboardCards.innerHTML = cards
    .map(
      (c) => `
        <article class="metric-card">
          <h4>${safeText(c.title)}</h4>
          <div class="value">${safeText(c.value)}</div>
          <div class="sub">${safeText(c.sub)}</div>
        </article>
      `
    )
    .join("");
}

function productMatchesSearch(product, q) {
  if (!q) return true;
  const haystack = [
    product.product_id,
    product.name,
    product.category,
    product.subcategory,
    product.description
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function renderProductsList() {
  if (!adminProductsList) return;
  const q = adminSearch?.value?.trim().toLowerCase() || "";
  const list = products.filter((p) => productMatchesSearch(p, q));

  if (list.length === 0) {
    adminProductsList.innerHTML = `
      <div class="admin-product-card">
        <div></div>
        <div>
          <h4>No products found</h4>
          <p class="meta">Try changing search text or add your first product.</p>
        </div>
      </div>
    `;
    return;
  }

  adminProductsList.innerHTML = list
    .map((p) => {
      const buy = p.buy_enabled ? formatMoney(p.buy_price, p.currency) : "-";
      const rent = p.rent_enabled ? formatMoney(p.rent_price_per_day, p.currency) : "-";
      const image = p.image_url || "https://placehold.co/320x220?text=EventMart";

      return `
        <article class="admin-product-card" data-id="${safeText(p.id)}">
          <img src="${safeText(image)}" alt="${safeText(p.name)}">
          <div>
            <h4>${safeText(p.name)}</h4>
            <p class="meta">Product ID: ${safeText(p.product_id || "-")}</p>
            <p class="meta">${safeText(p.category)} / ${safeText(p.subcategory)}</p>
            <p class="meta">Qty: ${safeText(p.quantity_available)} | Reorder: ${safeText(p.reorder_level)} | ${p.active ? "Active" : "Inactive"}</p>
            <p class="price-line">Buy: ${safeText(buy)} | Rent/day: ${safeText(rent)}</p>
          </div>
          <div class="product-actions">
            <button class="btn" type="button" data-action="edit">Edit</button>
            <button class="btn ghost" type="button" data-action="delete">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function userMatchesSearch(user, q) {
  if (!q) return true;
  return `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(q);
}

function renderUsersList() {
  if (!usersList) return;
  const q = usersSearch?.value?.trim().toLowerCase() || "";
  const filtered = users.filter((u) => userMatchesSearch(u, q));

  if (usersListTitle) {
    usersListTitle.textContent = `Registered Users (${filtered.length})`;
  }

  if (!filtered.length) {
    usersList.innerHTML = `
      <div class="admin-user-card">
        <div class="admin-user-main">
          <h4>No users found</h4>
          <p>Register users from the client Register / Sign In page first.</p>
        </div>
      </div>
    `;
    return;
  }

  usersList.innerHTML = filtered
    .map(
      (user) => `
        <article class="admin-user-card">
          <div class="admin-user-main">
            <h4>${safeText(user.name)}</h4>
            <p>${safeText(user.email)}</p>
          </div>
          <span class="role-pill">${safeText(user.role)}</span>
          <div class="admin-user-date">
            <div>Joined: ${safeText(formatDateTime(user.created_at))}</div>
            <div>Last Login: ${safeText(formatDateTime(user.last_login_at))}</div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderStatList(target, rows, emptyText) {
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = `<div class="stat-row"><strong>${safeText(emptyText)}</strong><span>Add interactions from Shop first.</span></div>`;
    return;
  }
  target.innerHTML = rows
    .map(
      (row) => `
        <div class="stat-row">
          <strong>${safeText(row.title)}</strong>
          <span>${safeText(row.sub)}</span>
        </div>
      `
    )
    .join("");
}

function renderAnalytics() {
  const metrics = getMetricsMap();
  const byProduct = products.map((p) => {
    const m = metrics[p.id] || {};
    const unitCost = Number(p.unit_cost || 0);
    const overhead = Number(p.overhead_cost || 0);
    const sold = Number(m.purchase || 0);
    const buyPrice = Number(p.buy_price || 0);
    const margin = buyPrice - unitCost - overhead;
    const totalProfit = margin * sold;
    const conversion = Number(m.add_to_cart || 0) > 0 ? (sold / Number(m.add_to_cart || 1)) * 100 : 0;

    return {
      product: p,
      visited: Number(m.product_view || 0),
      added: Number(m.add_to_cart || 0),
      sold,
      conversion,
      totalProfit
    };
  });

  const topSold = [...byProduct]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 6)
    .map((x) => ({
      title: `${x.product.name} (${x.sold})`,
      sub: `${x.product.category} / ${x.product.subcategory}`
    }));

  const topVisited = [...byProduct]
    .sort((a, b) => b.visited - a.visited)
    .slice(0, 6)
    .map((x) => ({
      title: `${x.product.name} (${x.visited} views)`,
      sub: `${x.added} add-to-cart`
    }));

  const cartVsSuccess = [...byProduct]
    .sort((a, b) => b.conversion - a.conversion)
    .slice(0, 6)
    .map((x) => ({
      title: `${x.product.name}`,
      sub: `Add-to-cart: ${x.added}, Purchases: ${x.sold}, Conversion: ${x.conversion.toFixed(1)}%`
    }));

  const profitability = [...byProduct]
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 6)
    .map((x) => ({
      title: `${x.product.name}`,
      sub: `Estimated profit: ${formatMoney(x.totalProfit, x.product.currency || "USD")}`
    }));

  renderStatList(mostSoldList, topSold, "No sales yet");
  renderStatList(mostVisitedList, topVisited, "No visits yet");
  renderStatList(cartVsSuccessList, cartVsSuccess, "No cart activity yet");
  renderStatList(profitabilityList, profitability, "No profitability data yet");
}

function populateForm(product) {
  editingId = product.id;
  fields.productId.value = product.id;
  fields.product_id.value = product.product_id || fallbackProductId(product.id);
  fields.name.value = product.name;
  fields.category.value = product.category;
  fields.subcategory.value = product.subcategory;
  fields.currency.value = getSafeCurrencyNumeric(product.currency, DEFAULT_CURRENCY_NUMERIC);
  fields.buy_price.value = product.buy_price ?? "";
  fields.rent_price_per_day.value = product.rent_price_per_day ?? "";
  fields.quantity_available.value = product.quantity_available ?? 0;
  fields.reorder_level.value = product.reorder_level ?? 0;
  fields.unit_cost.value = product.unit_cost ?? 0;
  fields.overhead_cost.value = product.overhead_cost ?? 0;
  fields.image_url.value = product.image_url || "";
  fields.description.value = product.description || "";
  fields.quality_points.value = Array.isArray(product.quality_points) ? product.quality_points.join("\n") : "";
  fields.buy_enabled.checked = Boolean(product.buy_enabled);
  fields.rent_enabled.checked = Boolean(product.rent_enabled);
  fields.active.checked = Boolean(product.active);

  formTitle.textContent = "Edit Product";
  saveBtn.textContent = "Update Product";
}

function resetForm() {
  editingId = null;
  fields.productId.value = "";
  productForm.reset();
  fields.product_id.value = generateNextProductId();
  fields.currency.value = DEFAULT_CURRENCY_NUMERIC;
  fields.quantity_available.value = "0";
  fields.reorder_level.value = "0";
  fields.unit_cost.value = "0";
  fields.overhead_cost.value = "0";
  fields.buy_enabled.checked = true;
  fields.rent_enabled.checked = false;
  fields.active.checked = true;
  formTitle.textContent = "Add Product";
  saveBtn.textContent = "Save Product";
}

function collectFormData() {
  const qualityPoints = fields.quality_points.value
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const buyEnabled = fields.buy_enabled.checked;
  const rentEnabled = fields.rent_enabled.checked;
  const buyPrice = toNum(fields.buy_price.value, null);
  const rentPrice = toNum(fields.rent_price_per_day.value, null);
  const currencyCode = normalizeCurrencyNumericInput(fields.currency.value);
  const normalizedCurrency = getSafeCurrencyAlpha(currencyCode, DEFAULT_CURRENCY_ALPHA);
  const normalizedProductId = normalizeProductIdInput(fields.product_id.value);

  if (!buyEnabled && !rentEnabled) {
    throw new Error("Enable at least Buy or Rent.");
  }

  if (!PRODUCT_ID_REGEX.test(normalizedProductId)) {
    throw new Error("Product ID must be 2-32 chars using letters, numbers, '-' or '_'.");
  }

  const duplicate = products.find(
    (p) => p.id !== editingId && String(p.product_id || "").toUpperCase() === normalizedProductId
  );
  if (duplicate) {
    throw new Error("Product ID already exists. Use a unique Product ID.");
  }

  if (!ISO_CURRENCY_NUMERIC_REGEX.test(currencyCode)) {
    throw new Error("Currency must be a 3-digit numeric code.");
  }

  return {
    id: editingId || randomId(),
    product_id: normalizedProductId,
    name: fields.name.value.trim(),
    category: fields.category.value.trim(),
    subcategory: fields.subcategory.value.trim(),
    description: fields.description.value.trim(),
    quality_points: qualityPoints,
    buy_enabled: buyEnabled,
    rent_enabled: rentEnabled,
    buy_price: buyPrice,
    rent_price_per_day: rentPrice,
    currency: normalizedCurrency,
    active: fields.active.checked,
    quantity_available: toNum(fields.quantity_available.value, 0),
    reorder_level: toNum(fields.reorder_level.value, 0),
    unit_cost: toNum(fields.unit_cost.value, 0),
    overhead_cost: toNum(fields.overhead_cost.value, 0),
    image_url: fields.image_url.value.trim(),
    created_at: editingId
      ? (products.find((p) => p.id === editingId)?.created_at || nowIso())
      : nowIso(),
    updated_at: nowIso()
  };
}

async function saveProduct(data) {
  if (editingId) {
    await requestProductApi({ method: "PUT", id: editingId, body: data });
  } else {
    await requestProductApi({ method: "POST", body: data });
  }

  await loadProducts();
  renderAll();
  resetForm();
}

async function deleteProduct(id) {
  const yes = window.confirm("Delete this product?");
  if (!yes) return;

  await requestProductApi({ method: "DELETE", id });
  await loadProducts();
  renderAll();
  if (editingId === id) resetForm();
}

function renderAll() {
  renderDashboard();
  renderProductsList();
  renderUsersList();
  renderAnalytics();
}

function bindEvents() {
  fields.product_id?.addEventListener("input", () => {
    const normalized = normalizeProductIdInput(fields.product_id.value);
    if (fields.product_id.value !== normalized) {
      fields.product_id.value = normalized;
    }
  });

  fields.product_id?.addEventListener("blur", () => {
    if (!fields.product_id.value.trim()) {
      fields.product_id.value = generateNextProductId();
    }
  });

  fields.currency?.addEventListener("input", () => {
    const normalized = normalizeCurrencyNumericInput(fields.currency.value);
    if (fields.currency.value !== normalized) {
      fields.currency.value = normalized;
    }
  });

  fields.currency?.addEventListener("blur", () => {
    if (!fields.currency.value.trim()) {
      fields.currency.value = DEFAULT_CURRENCY_NUMERIC;
    }
  });

  sideButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.section;
      sideButtons.forEach((b) => b.classList.remove("active"));
      sections.forEach((s) => s.classList.remove("active-section"));
      btn.classList.add("active");
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.add("active-section");
    });
  });

  if (presetRange) {
    presetRange.addEventListener("change", () => {
      const preset = presetRange.value;
      if (preset !== "custom") {
        setRangeFromPreset(preset);
        renderDashboard();
      }
    });
  }

  if (applyRangeBtn) {
    applyRangeBtn.addEventListener("click", () => {
      currentRange.start = rangeStartInput.value ? new Date(rangeStartInput.value) : null;
      currentRange.end = rangeEndInput.value ? new Date(rangeEndInput.value) : null;
      renderDashboard();
    });
  }

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const wasEditing = Boolean(editingId);
    saveBtn.disabled = true;
    saveBtn.textContent = wasEditing ? "Updating..." : "Saving...";

    try {
      const data = collectFormData();
      if (!data.name || !data.category || !data.subcategory) {
        window.alert("Name, category, and subcategory are required.");
        return;
      }
      await saveProduct(data);
    } catch (error) {
      window.alert(error.message || "Unable to save product.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = editingId ? "Update Product" : "Save Product";
    }
  });

  resetBtn.addEventListener("click", resetForm);

  adminSearch?.addEventListener("input", renderProductsList);
  usersSearch?.addEventListener("input", renderUsersList);

  refreshUsersBtn?.addEventListener("click", async () => {
    await loadUsers();
    renderUsersList();
  });

  adminProductsList?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const card = e.target.closest(".admin-product-card[data-id]");
    if (!card) return;
    const id = card.dataset.id;
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (btn.dataset.action === "edit") {
      populateForm(product);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (btn.dataset.action === "delete") {
      try {
        await deleteProduct(id);
      } catch (error) {
        window.alert(error.message || "Unable to delete product.");
      }
    }
  });

  window.addEventListener("storage", (e) => {
    if (e.key === METRICS_KEY) {
      renderAll();
    }
  });
}

async function init() {
  bindEvents();
  setRangeFromPreset("month");
  if (presetRange) presetRange.value = "month";
  await loadProducts();
  if (!fields.product_id?.value) {
    fields.product_id.value = generateNextProductId();
  }
  await loadUsers();
  renderAll();
}

init();

