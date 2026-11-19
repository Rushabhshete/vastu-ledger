import apiClient from "./apiClient.js";

export async function getWhatsAppStats() {
  const { data } = await apiClient.get("/whatsapp/stats");
  return data.data;
}

export async function getWhatsAppLogs(params = {}) {
  const { data } = await apiClient.get("/whatsapp/logs", { params });
  return data.data;
}

export async function getWhatsAppConfig() {
  const { data } = await apiClient.get("/whatsapp/config");
  return data.data;
}

export async function updateWhatsAppConfig(config) {
  const { data } = await apiClient.put("/whatsapp/config", config);
  return data.data;
}

export async function sendBillWhatsApp(billId) {
  const { data } = await apiClient.post(`/whatsapp/send-bill/${billId}`);
  return data;
}

export async function sendBatchDueReminders() {
  const { data } = await apiClient.post("/whatsapp/batch-reminders");
  return data;
}

export async function sendBroadcast({ title, message, urgency }) {
  const { data } = await apiClient.post("/whatsapp/broadcast", { title, message, urgency });
  return data;
}
