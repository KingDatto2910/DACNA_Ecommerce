// Tự động tạo orderID theo quy luật (OD YYYY MM DD hh mm ss SSS)
// Ex: OD20251027152330041
export function newOrderCode() {
  const d = new Date();
  const pad = (n, size = 2) => String(n).padStart(size, "0");
  return (
    "OD" +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    pad(d.getMilliseconds(), 3)
  );
}

/**
 * Format tiền tệ (VND)
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return amount?.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) || "0 ₫";
}

// Format thời gian theo ÍO→ dd/mm/yyyy hh:mm:ss

export function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
