import axios, { type AxiosError } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
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
