import apiClient from "./apiClient.js";

export async function listSocieties() {
  const { data } = await apiClient.get("/societies");
  return data.data || [];
}

export async function getSociety(id) {
  const { data } = await apiClient.get(`/societies/${id}`);
  return data.data;
}

export async function createSociety(payload) {
  const { data } = await apiClient.post("/societies", payload);
  return data.data;
}

export async function updateSociety(id, payload) {
  const { data } = await apiClient.put(`/societies/${id}`, payload);
  return data.data;
}

export async function getTopology(id) {
  const { data } = await apiClient.get(`/societies/${id}/topology`);
  return data.data;
}

export async function listWings(socId) {
  const { data } = await apiClient.get(`/societies/${socId}/wings`);
  return data.data || [];
}

export async function createWing(socId, payload) {
  const { data } = await apiClient.post(`/societies/${socId}/wings`, payload);
  return data.data;
}

export async function updateWing(socId, wingId, payload) {
  const { data } = await apiClient.put(`/societies/${socId}/wings/${wingId}`, payload);
  return data.data;
}

export async function deleteWing(socId, wingId) {
  const { data } = await apiClient.delete(`/societies/${socId}/wings/${wingId}`);
  return data.data;
}

export async function listFlats(socId, params = {}) {
  const { data } = await apiClient.get(`/societies/${socId}/flats`, { params });
  return data.data || [];
}

export async function createFlat(socId, payload) {
  const { data } = await apiClient.post(`/societies/${socId}/flats`, payload);
  return data.data;
}

export async function autoGenerateFlats(socId, payload) {
  const { data } = await apiClient.post(`/societies/${socId}/flats/auto-generate`, payload);
  return data.data;
}

export async function updateFlat(socId, flatId, payload) {
  const { data } = await apiClient.put(`/societies/${socId}/flats/${flatId}`, payload);
  return data.data;
}

export async function deleteFlat(socId, flatId) {
  const { data } = await apiClient.delete(`/societies/${socId}/flats/${flatId}`);
  return data.data;
}
