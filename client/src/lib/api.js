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
  listAuctions: () => request("/auctions"),
  createAuction: (payload) => request("/auctions", { method: "POST", body: payload }),
  getAuction: (id) => request(`/auctions/${id}`),
  createTeam: (id, payload) => request(`/auctions/${id}/teams`, { method: "POST", body: payload }),
  startAuction: (id) => request(`/auctions/${id}/start`, { method: "POST", body: {} }),
  nextLot: (id, playerId) =>
    request(`/auctions/${id}/lots/next`, { method: "POST", body: playerId ? { playerId } : {} }),
  placeBid: (id, amount) => request(`/auctions/${id}/bid`, { method: "POST", body: { amount } }),
  sellLot: (id) => request(`/auctions/${id}/lots/sold`, { method: "POST", body: {} }),
  unsoldLot: (id) => request(`/auctions/${id}/lots/unsold`, { method: "POST", body: {} }),
  resolveRtm: (id, decision) => request(`/auctions/${id}/rtm`, { method: "POST", body: { decision } }),
  finishAuction: (id) => request(`/auctions/${id}/finish`, { method: "POST", body: {} }),
  getSettings: () => request("/settings"),
  updateSettings: (payload) => request("/settings", { method: "PUT", body: payload }),
};

// Client mirror of the server's base-price formula, for lot previews.
export function basePricePreview(player) {
  const s = player?.stats || {};
  const matches = Number(s.matches) || 0;
  let rating = 45;
  if (matches > 0) {
    const points =
      (Number(s.runs) || 0) + 25 * (Number(s.wickets) || 0) + 10 * (Number(s.catches) || 0);
    rating = Math.round(45 + Math.min(points / matches, 54));
  }
  return Math.max(20, Math.round((rating * 2) / 5) * 5);
}

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
