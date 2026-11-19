/**
 * Format number into Indian Rupee format with optional decimals.
 * E.g. 1245000 -> ₹12,45,000.00
 */
export function formatINR(amount, includeDecimals = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₹0.00";
  }

  const num = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(num);
}

/**
 * Compact Indian currency representation: Lakhs (L) and Crores (Cr)
 * E.g. 1250000 -> ₹12.50 L
 */
export function formatINRCompact(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₹0";
  }

  const num = Math.abs(Number(amount));
  const sign = Number(amount) < 0 ? "-" : "";

  if (num >= 10000000) {
    return `${sign}₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `${sign}₹${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `${sign}₹${(num / 1000).toFixed(1)} k`;
  }
  return `${sign}₹${num.toFixed(0)}`;
}

/**
 * Format ISO date string into Indian standard format: '15 Jan 2026'
 */
export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
