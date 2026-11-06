import axios from "axios";

const STORAGE_KEY = "rag_api_base_url";

const resolveDefaultBaseUrl = (): string => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }
  return window.location.origin;
};

export const getApiBaseUrl = (): string => {
  const raw = window.localStorage.getItem(STORAGE_KEY)?.trim();
  if (raw && raw.length > 0) {
    return raw.replace(/\/$/, "");
  }
  return resolveDefaultBaseUrl();
};

export const setApiBaseUrl = (value: string): void => {
  window.localStorage.setItem(STORAGE_KEY, value.trim().replace(/\/$/, ""));
};

export const http = axios.create({
  timeout: 120000
});

http.interceptors.request.use((config) => {
  const baseUrl = getApiBaseUrl();
  config.baseURL = `${baseUrl}/api`;
  return config;
});
