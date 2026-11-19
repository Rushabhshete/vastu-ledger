import axios from "axios";
import { ENV } from "../config/env.js";

let accessTokenInMemory = null;

export function setAccessToken(token) {
  accessTokenInMemory = token;
}

export function getAccessToken() {
  return accessTokenInMemory;
}

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach Bearer token and active society context
apiClient.interceptors.request.use((config) => {
  if (accessTokenInMemory) {
    config.headers.Authorization = `Bearer ${accessTokenInMemory}`;
  }
  const activeSocId = localStorage.getItem("vl_active_society_id") || "1";
  if (activeSocId) {
    config.headers["x-society-id"] = activeSocId;
  }
  return config;
});

// Response interceptor: handle 401 & attempt silent refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/")) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${ENV.API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.data.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
