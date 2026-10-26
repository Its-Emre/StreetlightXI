import mongoose from "mongoose";

// Group-wide display & feature switches (single document, key "group").
// Any member can flip them; every client reads the same settings, so
// the whole group's app behaves the same way.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "group" },
    // "SOLD price · team" tags on player cards and profiles.
    soldTags: { type: Boolean, default: true },
    // Gold frame for the group's top-rated player.
    goldenFrame: { type: Boolean, default: true },
    // Ratings shown on cards, profiles and the team maker.
    ratings: { type: Boolean, default: true },
    // Most Runs / Most Wickets / Safe Hands boards on Home.
    leaderboards: { type: Boolean, default: true },
    // Right-to-Match windows during auctions.
    rtm: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;

export const SETTING_KEYS = ["soldTags", "goldenFrame", "ratings", "leaderboards", "rtm"];

export async function getGroupSettings() {
  let doc = await Settings.findOne({ key: "group" });
  if (!doc) doc = await Settings.create({ key: "group" });
  return doc;
}
