import { getGroupSettings, SETTING_KEYS } from "../models/Settings.js";

const view = (doc) => {
  const out = {};
  for (const k of SETTING_KEYS) out[k] = doc[k] !== false;
  return out;
};

// GET /api/settings
export const getSettings = async (req, res) => {
  const doc = await getGroupSettings();
  res.json({ settings: view(doc) });
};

// PUT /api/settings — group-trust: any member may flip a switch.
// Only whitelisted boolean keys are accepted.
export const updateSettings = async (req, res) => {
  const doc = await getGroupSettings();
  for (const k of SETTING_KEYS) {
    if (typeof req.body[k] === "boolean") doc[k] = req.body[k];
  }
  await doc.save();
  res.json({ settings: view(doc) });
};
