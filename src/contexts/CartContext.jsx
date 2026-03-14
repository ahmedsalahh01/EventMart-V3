import { createContext, useContext, useMemo, useState } from "react";
import { normalizeCartItem } from "../lib/cart";

const CartContext = createContext(null);
const STORAGE_KEY = "eventmart_cart_v1";

function readItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeCartItem).filter((item) => item.id) : [];
  } catch (_error) {
    return [];
  }
}

function CartProvider({ children }) {
  const [items, internalSetItems] = useState(readItems);

  function persist(nextItems) {
    internalSetItems(nextItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    } catch (_error) {
      // Ignore storage errors.
    }
    window.dispatchEvent(new CustomEvent("eventmart:cart-updated"));
  }

  function setItems(next) {
    const nextItems = typeof next === "function" ? next(items).map(normalizeCartItem) : next.map(normalizeCartItem);
    persist(nextItems.filter((item) => item.id));
  }

  function addItem(product, quantity = 1, mode = "buy") {
    const unitPrice =
      mode === "rent" && product.rent_enabled && product.rent_price_per_day !== null
        ? Number(product.rent_price_per_day)
        : Number(product.buy_price ?? product.rent_price_per_day ?? 0);

    const stock = Number(product.quantity_available || 0);

    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.id === String(product.id) && item.mode === mode);
      if (existingIndex >= 0) {
        return current.map((item, index) => {
          if (index !== existingIndex) return item;
          const nextQuantity = stock > 0 ? Math.min(item.quantity + Number(quantity || 1), stock) : item.quantity + Number(quantity || 1);
          return {
            ...item,
            quantity: nextQuantity,
            rental_days: item.mode === "rent" ? Math.max(1, Number(item.rental_days || 1)) : 1,
            unit_price: unitPrice,
            stock,
            image_url: product.image_url || item.image_url
          };
        });
      }

      return [
        ...current,
        normalizeCartItem({
          id: String(product.id),
          product_id: String(product.product_id || ""),
          name: product.name,
          image_url: product.image_url || "",
          mode,
          quantity,
          rental_days: mode === "rent" ? 1 : 1,
          unit_price: unitPrice,
          currency: product.currency || "USD",
          stock
        })
      ];
    });
  }

  function updateQuantity(id, mode, quantity) {
    const nextQuantity = Math.max(1, Number(quantity || 1));
    setItems((current) =>
      current.map((item) => {
        if (item.id !== String(id) || item.mode !== mode) return item;
        const safeQuantity = item.stock > 0 ? Math.min(nextQuantity, item.stock) : nextQuantity;
        return { ...item, quantity: safeQuantity };
      })
    );
  }

  function updateRentalDays(id, mode, days) {
    const nextDays = Math.max(1, Number(days || 1));
    setItems((current) =>
      current.map((item) => {
        if (item.id !== String(id) || item.mode !== mode) return item;
        if (item.mode !== "rent") return item;
        return { ...item, rental_days: nextDays };
      })
    );
  }

  function removeItem(id, mode) {
    setItems((current) => current.filter((item) => !(item.id === String(id) && item.mode === mode)));
  }

  function clearCart() {
    persist([]);
  }

  const itemCount = items.reduce((total, item) => total + Number(item.quantity || 0), 0);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      setItems,
      addItem,
      updateQuantity,
      updateRentalDays,
      removeItem,
      clearCart
    }),
    [items, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}

export { CartProvider, useCart };
