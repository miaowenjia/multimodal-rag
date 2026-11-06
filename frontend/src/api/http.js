import axios from "axios";
const DEFAULT_BASE_URL = "http://localhost:8010";
const STORAGE_KEY = "rag_api_base_url";
export const getApiBaseUrl = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY)?.trim();
    return raw && raw.length > 0 ? raw : DEFAULT_BASE_URL;
};
export const setApiBaseUrl = (value) => {
    window.localStorage.setItem(STORAGE_KEY, value.trim());
};
export const http = axios.create({
    timeout: 120000
});
http.interceptors.request.use((config) => {
    const baseUrl = getApiBaseUrl();
    config.baseURL = `${baseUrl}/api`;
    return config;
});
