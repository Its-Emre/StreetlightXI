import mongoose from "mongoose";

export const ROLES = ["Batter", "Bowler", "All-Rounder", "Wicket-Keeper"];

const statsSchema = new mongoose.Schema(
  {
    matches: { type: Number, default: 0, min: 0 },
    runs: { type: Number, default: 0, min: 0 },
    highestScore: { type: Number, default: 0, min: 0 },
    wickets: { type: Number, default: 0, min: 0 },
    catches: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// A player's card. Stats are edited directly on the card (group-trust
// model — no match-record entry), and the rating is always computed
// from stats, never stored.
const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    role: { type: String, enum: ROLES, default: "All-Rounder" },
    // Google Drive file id of the player's photo (optional).
    photoDriveId: { type: String, trim: true, default: "" },
    stats: { type: statsSchema, default: () => ({}) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Player = mongoose.model("Player", playerSchema);
export default Player;
