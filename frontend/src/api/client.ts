import axios, { type AxiosError } from "axios";

/**
 * Axios baseURL — Django API ildizi (oxirida /api). Masalan: https://api.onrender.com/api
 * So'rovlar: api.post("/token/", ...) → .../api/token/
 *
 * Tartib (birinchi to'ldirilgani):
 * 1) VITE_API_BASE yoki VITE_BACKEND_URL — to'liq path (mahalliy .env uchun qulay)
 * 2) VITE_API_URL yoki VITE_BACKEND_ORIGIN — faqat domen; /api avtomatik qo'shiladi
 *    (production: .env.production yoki Vercel ENV)
 *
 * Mahalliy: .env da VITE_API_BASE=http://127.0.0.1:8000/api — VITE_API_URL ishlatmasangiz ham bo'ladi.
 * Vite: .env, .env.local, .env.production (faqat build) — hujjat: .env.example
 */
function apiBaseUrl(): string {
  const base =
    import.meta.env.VITE_API_BASE?.trim() || import.meta.env.VITE_BACKEND_URL?.trim();
  if (base) return base.replace(/\/$/, "");
  const origin =
    import.meta.env.VITE_API_URL?.trim() || import.meta.env.VITE_BACKEND_ORIGIN?.trim();
  if (origin) {
    const o = origin.replace(/\/$/, "");
    return o.endsWith("/api") ? o : `${o}/api`;
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
