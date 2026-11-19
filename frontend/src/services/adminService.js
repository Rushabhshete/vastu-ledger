import apiClient from "./apiClient.js";

export async function getSettings() {
  const { data } = await apiClient.get("/admin/settings");
  return data.data;
}

export async function updateSetting(key, value) {
  const { data } = await apiClient.put("/admin/settings", { key, value });
  return data.data;
}

export async function bulkUpdateSettings(settings) {
  const { data } = await apiClient.put("/admin/settings/bulk", { settings });
  return data.data;
}

export async function getAuditLogs(params = {}) {
  const { data } = await apiClient.get("/admin/audit-logs", { params });
  return data.data;
}

export async function listUsers() {
  const { data } = await apiClient.get("/admin/users");
  return data.data;
}

export async function listFlats() {
  const { data } = await apiClient.get("/admin/flats");
  return data.data;
}

/* ------------------------------------------------------------------ */
/*  Users CRUD                                                        */
/* ------------------------------------------------------------------ */

export async function createUser(payload) {
  const { data } = await apiClient.post("/admin/users", payload);
  return data.data;
}

export async function updateUser(id, payload) {
  const { data } = await apiClient.put(`/admin/users/${id}`, payload);
  return data.data;
}

export async function deleteUser(id) {
  const { data } = await apiClient.delete(`/admin/users/${id}`);
  return data.data;
}

/* ------------------------------------------------------------------ */
/*  Flats CRUD                                                        */
/* ------------------------------------------------------------------ */

export async function createFlat(payload) {
  const { data } = await apiClient.post("/admin/flats", payload);
  return data.data;
}

export async function updateFlat(id, payload) {
  const { data } = await apiClient.put(`/admin/flats/${id}`, payload);
  return data.data;
}

export async function deleteFlat(id) {
  const { data } = await apiClient.delete(`/admin/flats/${id}`);
  return data.data;
}

export async function rotateBankMaster(payload) {
  const { data } = await apiClient.post("/admin/bank/rotate", payload);
  return data.data;
}
