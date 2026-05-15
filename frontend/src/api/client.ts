import axios, { type AxiosError } from "axios";

/** VITE_API_BASE ustuvor (oxirida /api). VITE_API_URL — faqat domen (Render), /api avtomatik qo'shiladi. */
function apiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE?.trim();
  if (base) return base.replace(/\/$/, "");
  const host = import.meta.env.VITE_API_URL?.trim();
  if (host) {
    const h = host.replace(/\/$/, "");
    return h.endsWith("/api") ? h : `${h}/api`;
  }
  return "/api";
}

const api = axios.create({
  baseURL: apiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("access");
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      if (!window.location.pathname.startsWith("/kirish")) {
        window.location.href = "/kirish";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
