import Player, { ROLES } from "../models/Player.js";
import { parseDriveId } from "../utils/drive.js";
import { computeRating } from "../utils/rating.js";

// Shape sent to the client: the stored card + its computed rating.
const present = (p) => {
  const obj = typeof p.toObject === "function" ? p.toObject() : p;
  return { ...obj, rating: computeRating(obj.stats) };
};

const readStats = (body) => {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  return {
    matches: num(body.matches),
    runs: num(body.runs),
    highestScore: num(body.highestScore),
    wickets: num(body.wickets),
    catches: num(body.catches),
  };
};

const readCard = (body) => {
  const card = {};
  if (body.name !== undefined) card.name = String(body.name).trim();
  if (body.role !== undefined && ROLES.includes(body.role)) card.role = body.role;
  if (body.photoLink !== undefined) {
    const link = String(body.photoLink).trim();
    card.photoDriveId = link ? parseDriveId(link) || "" : "";
    if (link && !card.photoDriveId) card.photoError = true;
  }
  if (body.stats !== undefined) card.stats = readStats(body.stats);
  return card;
};

// GET /api/players — every card in the group, best rated first.
export const listPlayers = async (req, res) => {
  const players = await Player.find()
    .populate("createdBy", "name")
    .sort({ createdAt: 1 })
    .lean();
  const withRating = players.map((p) => ({
    ...p,
    createdBy: p.createdBy ? { id: p.createdBy._id, name: p.createdBy.name } : null,
    rating: computeRating(p.stats),
  }));
  withRating.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  res.json({ players: withRating });
};

// GET /api/players/:id
export const getPlayer = async (req, res) => {
  const player = await Player.findById(req.params.id).populate("createdBy", "name");
  if (!player) return res.status(404).json({ message: "Player not found" });
  const obj = present(player);
  obj.createdBy = player.createdBy
    ? { id: player.createdBy._id, name: player.createdBy.name }
    : null;
  res.json({ player: obj });
};

// POST /api/players — any group member can add a card.
export const createPlayer = async (req, res) => {
  const card = readCard(req.body);
  if (!card.name) return res.status(400).json({ message: "Player name is required" });
  if (card.photoError) {
    return res.status(400).json({ message: "That photo link doesn't look like a Google Drive link" });
  }
  const player = await Player.create({
    name: card.name,
    role: card.role || "All-Rounder",
    photoDriveId: card.photoDriveId || "",
    stats: card.stats || {},
    createdBy: req.user.id,
  });
  const obj = present(player);
  obj.createdBy = { id: req.user.id, name: req.user.name };
  res.status(201).json({ player: obj });
};

// PUT /api/players/:id — group-trust editing: any member may fix a
// card or update its stats (the way a real friends' group works).
export const updatePlayer = async (req, res) => {
  const card = readCard(req.body);
  if (card.name !== undefined && !card.name) {
    return res.status(400).json({ message: "Player name can't be empty" });
  }
  if (card.photoError) {
    return res.status(400).json({ message: "That photo link doesn't look like a Google Drive link" });
  }
  delete card.photoError;
  const player = await Player.findByIdAndUpdate(req.params.id, card, { new: true })
    .populate("createdBy", "name");
  if (!player) return res.status(404).json({ message: "Player not found" });
  const obj = present(player);
  obj.createdBy = player.createdBy
    ? { id: player.createdBy._id, name: player.createdBy.name }
    : null;
  res.json({ player: obj });
};

// DELETE /api/players/:id — only whoever added the card.
export const deletePlayer = async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).json({ message: "Player not found" });
  if (player.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only the member who added this card can delete it" });
  }
  await player.deleteOne();
  res.json({ message: "Player deleted" });
};
