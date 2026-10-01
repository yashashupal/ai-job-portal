import axios from "axios";

// In production VITE_API_URL points to the Render backend; in dev the Vite proxy handles /api.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem("access")) {
      localStorage.removeItem("access");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Downloads a private resume through the authenticated API.
export async function downloadResume(app) {
  const res = await api.get(`/applications/${app.id}/resume/`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = app.resume_name || "resume";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Turns any DRF error into one readable sentence.
export function errorText(err, fallback = "Something went wrong. Try again.") {
  const data = err?.response?.data;
  if (!data) return err?.message === "Network Error" ? "Cannot reach the server. Is the backend running?" : fallback;
  if (typeof data === "string") return fallback;
  if (data.detail) return data.detail;
  const first = Object.entries(data)[0];
  if (!first) return fallback;
  const [field, msg] = first;
  const text = Array.isArray(msg) ? msg[0] : String(msg);
  return field === "non_field_errors" ? text : `${field.replace(/_/g, " ")}: ${text}`;
}

export default api;
