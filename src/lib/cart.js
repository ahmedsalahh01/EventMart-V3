export function normalizeCartItem(item) {
  const stock = Number(item?.stock || 0);
  const rawQuantity = Math.max(1, Number(item?.quantity || 1));
  const quantity = stock > 0 ? Math.min(rawQuantity, stock) : rawQuantity;
  const rentalDays = Math.max(1, Number(item?.rental_days || item?.rentalDays || 1));
  const mode = item?.mode === "rent" ? "rent" : "buy";

  return {
    id: String(item?.id ?? ""),
    product_id: String(item?.product_id ?? ""),
    name: String(item?.name ?? "Unnamed Item"),
    image_url: String(item?.image_url ?? item?.image ?? ""),
    mode,
    quantity,
    rental_days: mode === "rent" ? rentalDays : 1,
    unit_price: Math.max(0, Number(item?.unit_price ?? item?.price ?? 0)),
    currency: String(item?.currency || "USD"),
    stock
  };
}
