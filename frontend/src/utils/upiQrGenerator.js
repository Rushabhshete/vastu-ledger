/**
 * Generate standard NPCI UPI Intent URI for payment.
 *
 * @param {Object} params
 * @param {string} params.vpa - Society UPI ID (e.g. 'vastuheights@icici')
 * @param {string} params.payeeName - Payee name (e.g. 'Vastu Heights CHS')
 * @param {number|string} params.amount - Amount in INR (e.g. 7590.00)
 * @param {string} [params.billId] - Bill reference number
 * @param {string} [params.flatNumber] - Flat number (e.g. 'A-101')
 * @returns {string} Standard UPI URI string
 */
export function buildUpiUri({ vpa, payeeName, amount, billId, flatNumber, referenceId = null }) {
  const cleanVpa = encodeURIComponent(vpa || "vastuheights@icici");
  const cleanName = encodeURIComponent(payeeName || "Vastu Ledger CHS");
  const numAmount = Number(amount || 0).toFixed(2);
  const note = encodeURIComponent(`Maint ${flatNumber ? `Flat ${flatNumber}` : ""} Bill #${billId || ""}`.trim());

  let uri = `upi://pay?pa=${cleanVpa}&pn=${cleanName}&am=${numAmount}&cu=INR&tn=${note}`;
  if (referenceId) {
    uri += `&tr=${encodeURIComponent(referenceId)}`;
  }

  return uri;
}
