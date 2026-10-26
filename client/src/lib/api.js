// API base: in production VITE_API_URL points at the deployed API;
// in local development it stays "/api" and Vite proxies it to the
// backend on localhost:5000.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "streetlight_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: () => request("/auth/me"),
  listPlayers: () => request("/players"),
  getPlayer: (id) => request(`/players/${id}`),
  createPlayer: (payload) => request("/players", { method: "POST", body: payload }),
  updatePlayer: (id, payload) => request(`/players/${id}`, { method: "PUT", body: payload }),
  deletePlayer: (id) => request(`/players/${id}`, { method: "DELETE" }),
};

// Mirrors the server's Drive-link parser, for live form previews.
export function parseDriveIdClient(input) {
  if (!input) return null;
  const s = String(input).trim();
  const fileMatch = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (fileMatch) return fileMatch[1];
  const idParam = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idParam) return idParam[1];
  if (/^[a-zA-Z0-9_-]{25,}$/.test(s)) return s;
  return null;
}

export const thumbUrl = (driveId, size = 1000) =>
  `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`;

// Artwork through our own server (cached proxy) — Drive throttles
// direct browser thumbnail traffic, so this is the primary path.
export const mediaThumbUrl = (driveId, size = 1000) =>
  `${API_BASE}/media/${driveId}/thumb?size=${size}`;
