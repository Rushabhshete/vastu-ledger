import apiClient from "./apiClient.js";

export async function generateBills(billingCycle) {
  const { data } = await apiClient.post("/billing/generate", { billingCycle });
  return data.data;
}

export async function listBills(params = {}) {
  const { data } = await apiClient.get("/billing", { params });
  return data.data;
}

export async function getMyBills() {
  const { data } = await apiClient.get("/billing/my-bills");
  return data.data;
}

export async function getLateFee(billId) {
  const { data } = await apiClient.get(`/billing/${billId}/late-fee`);
  return data.data;
}

export async function submitUtr({ billId, utr, amount }) {
  const { data } = await apiClient.post("/billing/upi/submit", {
    billId: Number(billId),
    utr,
    amount: Number(amount),
  });
  return data.data;
}

export async function listPendingReconciliations() {
  const { data } = await apiClient.get("/billing/upi/pending");
  return data.data;
}

export async function verifyUtr(reconciliationId) {
  const { data } = await apiClient.post(`/billing/upi/verify/${reconciliationId}`);
  return data.data;
}

export async function previewBankStatement(file) {
  const formData = new FormData();
  formData.append("statement", file);
  const { data } = await apiClient.post("/billing/reconcile/bank-statement/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function batchReconcileBankStatement(items) {
  const { data } = await apiClient.post("/billing/reconcile/bank-statement/commit", { items });
  return data.data;
}
