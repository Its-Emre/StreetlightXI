import mongoose from "mongoose";

// A live-scored match. Each innings stores ONLY its event log; the
// score, batting/bowling cards and match state are derived from the
// log by utils/scoring.js. Career stats are applied to player cards
// exactly once, when the match completes (statsApplied guard).

const eventSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true }, // setOpeners|setBowler|setBatsman|ball
    striker: { type: String },
    nonStriker: { type: String },
    bowler: { type: String },
    player: { type: String },
    outcome: { type: String }, // bat|wide|noball|wicket
    runs: { type: Number },
    outId: { type: String },
    wicketType: { type: String },
    fielder: { type: String },
  },
  { _id: false }
);

const inningsSchema = new mongoose.Schema(
  {
    battingTeam: { type: String, enum: ["A", "B"], required: true },
    log: { type: [eventSchema], default: [] },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    teamA: { type: teamSchema, required: true },
    teamB: { type: teamSchema, required: true },
    oversPerInnings: { type: Number, required: true, min: 1, max: 50 },
    toss: {
      type: new mongoose.Schema(
        {
          winner: { type: String, enum: ["A", "B"] },
          decision: { type: String, enum: ["bat", "bowl"] },
        },
        { _id: false }
      ),
      default: null,
    },
    status: {
      type: String,
      enum: ["setup", "live", "completed", "abandoned"],
      default: "setup",
    },
    innings: { type: [inningsSchema], default: [] },
    result: { type: String, default: "" },
    statsApplied: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Match = mongoose.model("Match", matchSchema);
export default Match;
