import apiClient from "./apiClient.js";

export async function getTransactions() {
  const { data } = await apiClient.get("/ledger");
  return data.data;
}

export async function getBalance() {
  const { data } = await apiClient.get("/ledger/balance");
  return data.data;
}

export async function getSummary() {
  const { data } = await apiClient.get("/ledger/summary");
  return data.data;
}

export async function getAnalytics() {
  const { data } = await apiClient.get("/ledger/analytics");
  return data.data;
}

export async function verifyIntegrity() {
  const { data } = await apiClient.get("/ledger/verify");
  return data.data; // { valid: boolean, brokenAtId?: number }
}

export async function listExpenses(params = {}) {
  const { data } = await apiClient.get("/ledger/expenses", { params });
  return data.data;
}

export async function uploadReceipt(file) {
  const formData = new FormData();
  formData.append("receipt", file);
  const { data } = await apiClient.post("/ledger/upload-receipt", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data.data;
}

export async function createExpense(expenseData) {
  const { data } = await apiClient.post("/ledger/expenses", expenseData);
  return data.data;
}

export async function approveExpense(id) {
  const { data } = await apiClient.post(`/ledger/expenses/${id}/approve`);
  return data.data;
}

export async function rejectExpense(id, rejectionReason) {
  const { data } = await apiClient.post(`/ledger/expenses/${id}/reject`, { rejectionReason });
  return data.data;
}

export async function getAgmPackage() {
  const { data } = await apiClient.get("/ledger/agm-package");
  return data.data;
}
