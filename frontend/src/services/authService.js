import apiClient, { setAccessToken } from "./apiClient.js";

export async function login({ email, password }) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  if (data.data?.accessToken) {
    setAccessToken(data.data.accessToken);
  }
  return data.data; // { accessToken, user }
}

export async function logout() {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

export async function refreshSession() {
  const { data } = await apiClient.post("/auth/refresh");
  if (data.data?.accessToken) {
    setAccessToken(data.data.accessToken);
  }
  return data.data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get("/auth/me");
  return data.data;
}
