export const money = (v, currency = "USD") => {
  if (v == null || Number.isNaN(v)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
  } catch {
    return `$${Number(v).toFixed(2)}`;
  }
};

export const discountPct = (price, oldPrice) => {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
};

export const trackClickUrl = (backend, productId) =>
  `${backend}/api/track/click/${productId}`;
