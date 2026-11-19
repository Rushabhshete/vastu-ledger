import apiClient from "./apiClient.js";

export async function getComplianceScorecard() {
  const { data } = await apiClient.get("/documents/compliance-scorecard");
  return data.data;
}

export async function listDocuments(params = {}) {
  const { data } = await apiClient.get("/documents", { params });
  return data.data;
}

export async function uploadDocument(formData) {
  const { data } = await apiClient.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteDocument(id) {
  const { data } = await apiClient.delete(`/documents/${id}`);
  return data;
}

export async function listNotices(params = {}) {
  const { data } = await apiClient.get("/documents/notices", { params });
  return data.data;
}

export async function createNotice(formData) {
  const { data } = await apiClient.post("/documents/notices", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteNotice(id) {
  const { data } = await apiClient.delete(`/documents/notices/${id}`);
  return data;
}
