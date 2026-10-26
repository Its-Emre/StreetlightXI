import mongoose from "mongoose";

// One auction event (e.g. "Season 1 Mega Auction"). Teams join it,
// players are lotted one at a time, captains bid from their phones,
// and final sales land back on the player cards as auction tags.

const bidSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "AuctionTeam" },
    teamName: { type: String, default: "" },
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    playerName: { type: String, default: "" },
    amount: { type: Number, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    playerName: { type: String, default: "" },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "AuctionTeam" },
    teamName: { type: String, default: "" },
    price: { type: Number, required: true },
    viaRtm: { type: Boolean, default: false },
  },
  { _id: false }
);

const lotSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    playerName: { type: String, default: "" },
    basePrice: { type: Number, required: true },
    currentBid: { type: Number, default: null },
    leaderTeam: { type: mongoose.Schema.Types.ObjectId, ref: "AuctionTeam", default: null },
    leaderTeamName: { type: String, default: "" },
  },
  { _id: false }
);

// When a player sells, his former team (same name in this auction)
// may hold a Right-to-Match: match the price and take him back.
const rtmSchema = new mongoose.Schema(
  {
    forTeam: { type: mongoose.Schema.Types.ObjectId, ref: "AuctionTeam" },
    forTeamName: { type: String, default: "" },
    winnerTeam: { type: mongoose.Schema.Types.ObjectId, ref: "AuctionTeam" },
    winnerTeamName: { type: String, default: "" },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const auctionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    purse: { type: Number, default: 1000, min: 100 },
    status: { type: String, enum: ["setup", "live", "done"], default: "setup" },
    currentLot: { type: lotSchema, default: null },
    rtmWindow: { type: rtmSchema, default: null },
    bids: { type: [bidSchema], default: [] },
    results: { type: [resultSchema], default: [] },
    unsoldIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const teamSchema = new mongoose.Schema(
  {
    auction: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    captainName: { type: String, default: "" },
    spent: { type: Number, default: 0 },
    rtmUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

teamSchema.index({ auction: 1, name: 1 }, { unique: true });
teamSchema.index({ auction: 1, captain: 1 }, { unique: true });

export const Auction = mongoose.model("Auction", auctionSchema);
export const AuctionTeam = mongoose.model("AuctionTeam", teamSchema);
