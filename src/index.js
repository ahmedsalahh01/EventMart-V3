const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "eventmart_dev_secret_change_me";
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

app.use(cors());
app.use(express.json());

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeUser(userRow) {
  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    created_at: userRow.created_at,
    last_login_at: userRow.last_login_at
  };
}

function createAuthToken(userRow) {
  return jwt.sign(
    {
      sub: userRow.id,
      email: userRow.email,
      role: userRow.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice(7).trim();
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid token payload." });
    }
    req.auth = {
      userId,
      email: decoded.email,
      role: decoded.role
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

async function ensureSchema() {
  const schemaPath = path.resolve(__dirname, "../../schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schemaSql);
}

function formatUsd(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

function summarizeProductCatalog(rows) {
  return rows.slice(0, 45).map((row) => {
    const mode = row.buy_enabled && row.rent_enabled ? "buy/rent" : row.buy_enabled ? "buy" : row.rent_enabled ? "rent" : "n/a";
    return {
      id: row.id,
      product_id: row.product_id,
      name: row.name,
      category: row.category,
      mode,
      buy_price: row.buy_price,
      rent_price_per_day: row.rent_price_per_day
    };
  });
}

function fallbackPlannerReply(prompt, context, products) {
  const eventType = String(context?.eventType || "Event");
  const attendees = Number(context?.attendees || 0) || 100;
  const budget = Number(context?.budget || 0) || 5000;
  const venue = String(context?.venue || "Indoor");

  const categoryHints = {
    wedding: ["wood", "sound", "stage"],
    conference: ["sound", "merch", "wood"],
    concert: ["stage", "sound", "light"],
    birthday: ["merch", "sound", "wood"],
    corporate: ["sound", "stage", "wood"],
    festival: ["stage", "sound", "light"],
    exhibition: ["wood", "merch", "stage"]
  };

  const hints = categoryHints[eventType.toLowerCase()] || [];
  const picked = products
    .filter((item) => {
      if (!hints.length) return true;
      const c = String(item.category || "").toLowerCase();
      return hints.some((hint) => c.includes(hint));
    })
    .slice(0, 5);

  const lines = [
    `### Your ${eventType} Plan`,
    `- **Attendees:** ${attendees}`,
    `- **Venue:** ${venue}`,
    `- **Budget:** ${formatUsd(budget)}`,
    "",
    "### Recommended Products"
  ];

  if (picked.length === 0) {
    lines.push("- No products found yet. Add products from Admin to get matching recommendations.");
  } else {
    picked.forEach((item) => {
      const price = Number.isFinite(Number(item.buy_price))
        ? formatUsd(item.buy_price)
        : Number.isFinite(Number(item.rent_price_per_day))
          ? `${formatUsd(item.rent_price_per_day)}/day`
          : "Price unavailable";
      lines.push(`- **${item.name}** (${item.mode}) - ${price}`);
    });
  }

  lines.push(
    "",
    "### Suggested Timeline",
    "- 8 weeks before: confirm venue and core equipment",
    "- 4 weeks before: finalize quantities and delivery",
    "- 1 week before: setup rehearsal and crew checklist",
    "- Event day: setup starts 4-6 hours before guests",
    "",
    `You can refine this plan by adding more details to: "${prompt}".`
  );

  return lines.join("\n");
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks = [];
  const output = Array.isArray(payload?.output) ? payload.output : [];
  output.forEach((item) => {
    const content = Array.isArray(item?.content) ? item.content : [];
    content.forEach((part) => {
      if (typeof part?.text === "string") chunks.push(part.text);
      if (typeof part?.output_text === "string") chunks.push(part.output_text);
    });
  });
  return chunks.join("\n").trim();
}

const PRODUCT_ID_REGEX = /^[A-Z0-9][A-Z0-9-_]{1,31}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

const PRODUCT_SELECT_SQL = `
  SELECT
    p.id,
    p.product_id,
    p.name,
    p.category,
    p.subcategory,
    p.description,
    p.quality_points,
    p.buy_enabled,
    p.rent_enabled,
    p.buy_price,
    p.rent_price_per_day,
    p.currency,
    p.active,
    p.created_at,
    p.updated_at,
    COALESCE(inv.quantity_available, 0)::INT AS quantity_available,
    COALESCE(inv.reorder_level, 0)::INT AS reorder_level,
    COALESCE(cost.unit_cost, 0) AS unit_cost,
    COALESCE(cost.overhead_cost, 0) AS overhead_cost,
    COALESCE(img.url, '') AS image_url
  FROM products p
  LEFT JOIN product_inventory inv ON inv.product_id = p.id
  LEFT JOIN product_costs cost ON cost.product_id = p.id
  LEFT JOIN LATERAL (
    SELECT url
    FROM product_images
    WHERE product_id = p.id
    ORDER BY sort_order ASC, id ASC
    LIMIT 1
  ) img ON TRUE
`;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseOptionalNumber(value, fieldLabel) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw createHttpError(400, `${fieldLabel} must be a valid number.`);
  }
  if (num < 0) {
    throw createHttpError(400, `${fieldLabel} cannot be negative.`);
  }
  return num;
}

function parseWholeNumber(value, fieldLabel) {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw createHttpError(400, `${fieldLabel} must be a non-negative whole number.`);
  }
  return num;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeQualityPoints(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeProductPayload(body) {
  const productId = String(body?.product_id || "")
    .trim()
    .toUpperCase();
  const name = String(body?.name || "").trim();
  const category = String(body?.category || "").trim();
  const subcategory = String(body?.subcategory || "").trim();
  const description = String(body?.description || "").trim();
  const currency = String(body?.currency || "USD")
    .trim()
    .toUpperCase();
  const imageUrl = String(body?.image_url || "").trim();

  if (!PRODUCT_ID_REGEX.test(productId)) {
    throw createHttpError(400, "Product ID must be 2-32 chars using letters, numbers, '-' or '_'.");
  }
  if (!name) throw createHttpError(400, "Product name is required.");
  if (!category) throw createHttpError(400, "Category is required.");
  if (!subcategory) throw createHttpError(400, "Subcategory is required.");
  if (!CURRENCY_REGEX.test(currency)) {
    throw createHttpError(400, "Currency must be a 3-letter ISO code like USD or EGP.");
  }

  const buyEnabled = parseBoolean(body?.buy_enabled, true);
  const rentEnabled = parseBoolean(body?.rent_enabled, false);
  if (!buyEnabled && !rentEnabled) {
    throw createHttpError(400, "Enable at least Buy or Rent.");
  }

  return {
    product_id: productId,
    name,
    category,
    subcategory,
    description,
    quality_points: normalizeQualityPoints(body?.quality_points),
    buy_enabled: buyEnabled,
    rent_enabled: rentEnabled,
    buy_price: parseOptionalNumber(body?.buy_price, "Buy price"),
    rent_price_per_day: parseOptionalNumber(body?.rent_price_per_day, "Rent price / day"),
    currency,
    active: parseBoolean(body?.active, true),
    quantity_available: parseWholeNumber(body?.quantity_available, "Quantity available"),
    reorder_level: parseWholeNumber(body?.reorder_level, "Reorder level"),
    unit_cost: parseOptionalNumber(body?.unit_cost, "Unit cost") ?? 0,
    overhead_cost: parseOptionalNumber(body?.overhead_cost, "Overhead cost") ?? 0,
    image_url: imageUrl
  };
}

function parseProductRouteId(rawId) {
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw createHttpError(400, "Product id must be a positive integer.");
  }
  return productId;
}

async function listProducts() {
  const result = await pool.query(`${PRODUCT_SELECT_SQL} ORDER BY p.id ASC`);
  return result.rows;
}

async function getProductById(productId) {
  const result = await pool.query(`${PRODUCT_SELECT_SQL} WHERE p.id = $1 LIMIT 1`, [productId]);
  return result.rows[0] || null;
}

async function syncProductRelations(client, productId, product) {
  await client.query(
    `
    INSERT INTO product_inventory (product_id, quantity_available, reorder_level, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (product_id)
    DO UPDATE SET
      quantity_available = EXCLUDED.quantity_available,
      reorder_level = EXCLUDED.reorder_level,
      updated_at = NOW()
    `,
    [productId, product.quantity_available, product.reorder_level]
  );

  await client.query(
    `
    INSERT INTO product_costs (product_id, unit_cost, overhead_cost, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (product_id)
    DO UPDATE SET
      unit_cost = EXCLUDED.unit_cost,
      overhead_cost = EXCLUDED.overhead_cost,
      updated_at = NOW()
    `,
    [productId, product.unit_cost, product.overhead_cost]
  );

  await client.query("DELETE FROM product_images WHERE product_id = $1", [productId]);
  if (product.image_url) {
    await client.query(
      "INSERT INTO product_images (product_id, url, sort_order) VALUES ($1, $2, 0)",
      [productId, product.image_url]
    );
  }
}

async function runProductTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function sendProductError(res, error, logPrefix) {
  if (error?.status) {
    return res.status(error.status).json({ error: error.message });
  }

  if (error?.code === "23505") {
    return res.status(409).json({ error: "Product ID already exists." });
  }

  console.error(logPrefix, error.message);
  return res.status(500).json({
    error: "Server error",
    details: error.message
  });
}

app.get("/", (req, res) => {
  res.send("EventMart API running");
});

app.get(["/products", "/api/products"], async (_req, res) => {
  try {
    const rows = await listProducts();
    res.json(rows);
  } catch (err) {
    return sendProductError(res, err, "PRODUCTS ROUTE ERROR:");
  }
});

app.post(["/products", "/api/products"], async (req, res) => {
  try {
    const product = normalizeProductPayload(req.body);

    const createdId = await runProductTransaction(async (client) => {
      const insertResult = await client.query(
        `
        INSERT INTO products (
          product_id,
          name,
          category,
          subcategory,
          description,
          quality_points,
          buy_enabled,
          rent_enabled,
          buy_price,
          rent_price_per_day,
          currency,
          active,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING id
        `,
        [
          product.product_id,
          product.name,
          product.category,
          product.subcategory,
          product.description,
          JSON.stringify(product.quality_points),
          product.buy_enabled,
          product.rent_enabled,
          product.buy_price,
          product.rent_price_per_day,
          product.currency,
          product.active
        ]
      );

      const productId = insertResult.rows[0].id;
      await syncProductRelations(client, productId, product);
      return productId;
    });

    const created = await getProductById(createdId);
    return res.status(201).json(created);
  } catch (err) {
    return sendProductError(res, err, "CREATE PRODUCT ROUTE ERROR:");
  }
});

app.put(["/products/:id", "/api/products/:id"], async (req, res) => {
  try {
    const routeProductId = parseProductRouteId(req.params.id);
    const product = normalizeProductPayload(req.body);

    await runProductTransaction(async (client) => {
      const updateResult = await client.query(
        `
        UPDATE products
        SET product_id = $1,
            name = $2,
            category = $3,
            subcategory = $4,
            description = $5,
            quality_points = $6::jsonb,
            buy_enabled = $7,
            rent_enabled = $8,
            buy_price = $9,
            rent_price_per_day = $10,
            currency = $11,
            active = $12,
            updated_at = NOW()
        WHERE id = $13
        RETURNING id
        `,
        [
          product.product_id,
          product.name,
          product.category,
          product.subcategory,
          product.description,
          JSON.stringify(product.quality_points),
          product.buy_enabled,
          product.rent_enabled,
          product.buy_price,
          product.rent_price_per_day,
          product.currency,
          product.active,
          routeProductId
        ]
      );

      if (!updateResult.rows.length) {
        throw createHttpError(404, "Product not found.");
      }

      await syncProductRelations(client, routeProductId, product);
    });

    const updated = await getProductById(routeProductId);
    return res.json(updated);
  } catch (err) {
    return sendProductError(res, err, "UPDATE PRODUCT ROUTE ERROR:");
  }
});

app.delete(["/products/:id", "/api/products/:id"], async (req, res) => {
  try {
    const routeProductId = parseProductRouteId(req.params.id);
    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [routeProductId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Product not found." });
    }

    return res.status(204).send();
  } catch (err) {
    return sendProductError(res, err, "DELETE PRODUCT ROUTE ERROR:");
  }
});

app.post("/api/ai-planner", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const catalogResult = await pool.query(
      `
      SELECT
        id,
        product_id,
        name,
        category,
        buy_enabled,
        rent_enabled,
        buy_price,
        rent_price_per_day
      FROM products
      WHERE active = TRUE
      ORDER BY id DESC
      LIMIT 80
      `
    );
    const catalog = summarizeProductCatalog(catalogResult.rows);

    if (!OPENAI_API_KEY || typeof fetch !== "function") {
      return res.json({
        message: fallbackPlannerReply(prompt, context, catalog),
        source: "fallback"
      });
    }

    const systemPrompt = [
      "You are EventMart's AI Event Planner assistant.",
      "Create practical recommendations using only products from the provided catalog.",
      "Keep the answer structured with short sections and bullet points.",
      "Always include: event summary, recommended products, and a concise timeline.",
      "Avoid mentioning products not in the catalog."
    ].join(" ");

    const userPrompt = JSON.stringify({
      request: prompt,
      context,
      catalog
    });

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.5,
        max_output_tokens: 850,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }]
          }
        ]
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI PLANNER OPENAI ERROR:", aiRes.status, errText.slice(0, 600));
      return res.json({
        message: fallbackPlannerReply(prompt, context, catalog),
        source: "fallback"
      });
    }

    const payload = await aiRes.json();
    const reply = extractResponseText(payload);
    if (!reply) {
      return res.json({
        message: fallbackPlannerReply(prompt, context, catalog),
        source: "fallback"
      });
    }

    return res.json({
      message: reply,
      source: "openai",
      model: OPENAI_MODEL
    });
  } catch (err) {
    console.error("AI PLANNER ROUTE ERROR:", err.message);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const created = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at, last_login_at`,
      [name, email, passwordHash]
    );

    const user = sanitizeUser(created.rows[0]);
    const token = createAuthToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error("REGISTER ROUTE ERROR:", err.message);
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
    const userRow = result.rows[0];
    if (!userRow) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const loginUpdate = await pool.query(
      `UPDATE users
       SET last_login_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, created_at, last_login_at`,
      [userRow.id]
    );

    const user = sanitizeUser(loginUpdate.rows[0]);
    const token = createAuthToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error("LOGIN ROUTE ERROR:", err.message);
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

app.get("/api/users", async (_req, res) => {
  try {
    const users = await pool.query(
      `SELECT id, name, email, role, created_at, last_login_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(users.rows);
  } catch (err) {
    console.error("USERS ROUTE ERROR:", err.message);
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at, last_login_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.auth.userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("ME ROUTE ERROR:", err.message);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

app.put("/api/me", requireAuth, async (req, res) => {
  try {
    const incomingName = req.body?.name;
    const incomingEmail = req.body?.email;
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    const currentResult = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [req.auth.userId]);
    const currentUser = currentResult.rows[0];
    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const nextName =
      typeof incomingName === "string" ? incomingName.trim() : String(currentUser.name || "").trim();
    const nextEmail =
      typeof incomingEmail === "string" ? normalizeEmail(incomingEmail) : normalizeEmail(currentUser.email);

    if (!nextName || !nextEmail) {
      return res.status(400).json({ error: "Name and email are required." });
    }

    if (nextEmail !== normalizeEmail(currentUser.email)) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1",
        [nextEmail, req.auth.userId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Email is already registered." });
      }
    }

    let nextPasswordHash = currentUser.password_hash;
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters." });
      }
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to set a new password." });
      }

      const passwordOk = await bcrypt.compare(currentPassword, currentUser.password_hash);
      if (!passwordOk) {
        return res.status(401).json({ error: "Current password is incorrect." });
      }

      nextPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    }

    const updated = await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           password_hash = $3
       WHERE id = $4
       RETURNING id, name, email, role, created_at, last_login_at`,
      [nextName, nextEmail, nextPasswordHash, req.auth.userId]
    );

    const user = sanitizeUser(updated.rows[0]);
    const token = createAuthToken(user);
    return res.json({ user, token });
  } catch (err) {
    console.error("UPDATE ME ROUTE ERROR:", err.message);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

app.get("/api/me/orders", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        o.id,
        o.status,
        o.subtotal,
        o.tax,
        o.discount,
        o.shipping,
        o.total,
        o.created_at,
        o.paid_at,
        COALESCE(SUM(oi.quantity), 0)::INT AS total_items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `,
      [req.auth.userId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("ME ORDERS ROUTE ERROR:", err.message);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

async function start() {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("SERVER STARTUP ERROR:", err.message);
    process.exit(1);
  }
}

start();

