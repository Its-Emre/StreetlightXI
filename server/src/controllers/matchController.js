import Match from "../models/Match.js";
import Player from "../models/Player.js";
import {
  deriveInnings,
  validateEvent,
  describeResult,
  topPerformers,
} from "../utils/scoring.js";

// ---- derivation helpers -------------------------------------------------

// The batting pool: the team's own players, plus the common player
// when one is designated (he bats for both sides). A pool of exactly
// 3 plays last-man-stands: the final batsman needs no partner.
const battingPool = (match, key) =>
  (key === "A" ? match.teamA.players : match.teamB.players).length +
  (match.commonPlayer ? 1 : 0);

const maxWicketsFor = (pool) => (pool === 3 ? pool : pool - 1);

function ctxFor(match, battingTeam, target) {
  const pool = battingPool(match, battingTeam);
  return {
    squadSize: pool,
    oversLimit: match.oversPerInnings,
    target,
    lastManStands: pool === 3,
  };
}

function deriveAll(match) {
  const derived = [];
  let target = null;
  match.innings.forEach((inn, i) => {
    const d = deriveInnings(inn.log || [], ctxFor(match, inn.battingTeam, i === 1 ? target : null));
    derived.push(d);
    if (i === 0) target = d.runs + 1;
  });
  return { derived, target };
}

function phaseOf(match, derived) {
  if (match.status === "completed") return "completed";
  if (match.status === "abandoned") return "abandoned";
  if (match.status === "setup") return "awaiting-toss";
  if (derived.length === 0) return "awaiting-openers";
  if (derived.length === 1) return derived[0].complete ? "break" : "innings-1";
  return derived[1].complete ? "completed" : "innings-2";
}

function matchView(match) {
  const { derived, target } = deriveAll(match);
  const phase = phaseOf(match, derived);
  const tops =
    derived.length > 0 ? topPerformers(derived[0], derived[1] || null) : { bestBatter: null, bestBowler: null };
  return {
    id: match._id,
    teamA: { name: match.teamA.name, players: match.teamA.players },
    teamB: { name: match.teamB.name, players: match.teamB.players },
    oversPerInnings: match.oversPerInnings,
    toss: match.toss,
    commonPlayer: match.commonPlayer ? String(match.commonPlayer) : null,
    status: match.status,
    phase,
    innings: match.innings.map((inn, i) => ({
      battingTeam: inn.battingTeam,
      log: inn.log,
      state: derived[i],
    })),
    target: derived.length > 0 ? target : null,
    result: match.result,
    statsApplied: match.statsApplied,
    tops,
    createdBy: match.createdBy?._id || match.createdBy,
    createdAt: match.createdAt,
  };
}

// Applies the finished match's figures to the career cards — once.
async function applyStats(match, derived) {
  if (match.statsApplied) return;
  // A common player bats in BOTH innings — figures must be summed
  // across innings, not overwritten.
  const batting = new Map();
  const bowling = new Map();
  const catches = new Map();

  derived.forEach((d) => {
    d.batting.forEach((b) => {
      const prev = batting.get(b.player);
      batting.set(b.player, {
        runs: (prev?.runs || 0) + b.runs,
        best: Math.max(prev?.best || 0, b.runs),
      });
    });
    d.bowling.forEach((b) => {
      const prev = bowling.get(b.player);
      bowling.set(b.player, { wickets: (prev?.wickets || 0) + b.wickets });
    });
  });
  match.innings.forEach((inn) => {
    (inn.log || []).forEach((ev) => {
      if (ev.kind === "ball" && ev.outcome === "wicket" && ev.wicketType === "caught" && ev.fielder) {
        catches.set(ev.fielder, (catches.get(ev.fielder) || 0) + 1);
      }
    });
  });

  const everyone = new Set([
    ...match.teamA.players.map(String),
    ...match.teamB.players.map(String),
    ...(match.commonPlayer ? [String(match.commonPlayer)] : []),
  ]);
  for (const pid of everyone) {
    const inc = { "stats.matches": 1 };
    const bat = batting.get(pid);
    if (bat) inc["stats.runs"] = bat.runs;
    const bowl = bowling.get(pid);
    if (bowl) inc["stats.wickets"] = bowl.wickets;
    if (catches.get(pid)) inc["stats.catches"] = catches.get(pid);
    const update = { $inc: inc };
    if (bat) update.$max = { "stats.highestScore": bat.best };
    await Player.updateOne({ _id: pid }, update);
  }
  match.statsApplied = true;
}

// If the second innings just completed, finish the match: result text
// + career stats. Called after every appended ball event.
async function autoFinishIfDone(match) {
  if (match.status !== "live") return;
  const { derived } = deriveAll(match);
  if (derived.length === 2 && derived[1].complete) {
    const battingFirst = match.innings[0].battingTeam;
    const chasingKey = match.innings[1].battingTeam;
    match.result = describeResult(
      match.teamA.name,
      match.teamB.name,
      derived[0],
      derived[1],
      battingFirst,
      maxWicketsFor(battingPool(match, chasingKey))
    );
    match.status = "completed";
    await applyStats(match, derived);
    await match.save();
  }
}

const loadMatch = async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return null;
  }
  return match;
};

// ---- endpoints ----------------------------------------------------------

// POST /api/matches — squads + overs; the toss happens next.
export const createMatch = async (req, res) => {
  const { teamAName, teamBName, teamAPlayers, teamBPlayers, overs, commonPlayer } = req.body;
  const a = Array.isArray(teamAPlayers) ? teamAPlayers : [];
  const b = Array.isArray(teamBPlayers) ? teamBPlayers : [];
  const common = commonPlayer ? String(commonPlayer) : null;
  if (!teamAName?.trim() || !teamBName?.trim()) {
    return res.status(400).json({ message: "Both teams need a name" });
  }
  // With a common player, two-player teams work (2 + common = a
  // batting pool of 3, which plays last-man-stands).
  const minSize = common ? 2 : 3;
  if (a.length < minSize || a.length > 11 || b.length < minSize || b.length > 11) {
    return res.status(400).json({
      message: common
        ? "With a common player, each team needs 2 to 11 players"
        : "Each team needs 3 to 11 players",
    });
  }
  const all = [...a, ...b];
  if (new Set(all.map(String)).size !== all.length) {
    return res.status(400).json({ message: "A player can't be in both teams" });
  }
  if (common && all.map(String).includes(common)) {
    return res.status(400).json({ message: "The common player can't also be in a team" });
  }
  const toCheck = common ? [...all, common] : all;
  const found = await Player.countDocuments({ _id: { $in: toCheck } });
  if (found !== toCheck.length) {
    return res.status(400).json({ message: "Some players don't exist" });
  }
  const oversNum = Math.floor(Number(overs) || 0);
  if (oversNum < 1 || oversNum > 50) {
    return res.status(400).json({ message: "Overs must be between 1 and 50" });
  }
  const match = await Match.create({
    teamA: { name: teamAName.trim(), players: a },
    teamB: { name: teamBName.trim(), players: b },
    commonPlayer: common,
    oversPerInnings: oversNum,
    createdBy: req.user.id,
  });
  res.status(201).json({ match: matchView(match) });
};

// GET /api/matches — newest first, with score lines.
export const listMatches = async (req, res) => {
  const matches = await Match.find().sort({ createdAt: -1 }).limit(50);
  res.json({ matches: matches.map((m) => matchView(m)) });
};

// GET /api/matches/:id
export const getMatch = async (req, res) => {
  const match = await loadMatch(req, res);
  if (!match) return;
  res.json({ match: matchView(match) });
};

// POST /api/matches/:id/toss { winner: "A"|"B", decision: "bat"|"bowl" }
export const recordToss = async (req, res) => {
  const match = await loadMatch(req, res);
  if (!match) return;
  if (match.status !== "setup") return res.status(400).json({ message: "The toss is already done" });
  const { winner, decision } = req.body;
  if (!["A", "B"].includes(winner) || !["bat", "bowl"].includes(decision)) {
    return res.status(400).json({ message: "Invalid toss result" });
  }
  match.toss = { winner, decision };
  const battingTeam = decision === "bat" ? winner : winner === "A" ? "B" : "A";
  match.innings = [{ battingTeam, log: [] }];
  match.status = "live";
  await match.save();
  res.json({ match: matchView(match) });
};

// POST /api/matches/:id/innings — begin the second innings.
export const beginNextInnings = async (req, res) => {
  const match = await loadMatch(req, res);
  if (!match) return;
  if (match.status !== "live") return res.status(400).json({ message: "Match is not live" });
  const { derived } = deriveAll(match);
  if (derived.length !== 1 || !derived[0].complete) {
    return res.status(400).json({ message: "The first innings is not over yet" });
  }
  const next = match.innings[0].battingTeam === "A" ? "B" : "A";
  match.innings.push({ battingTeam: next, log: [] });
  await match.save();
  res.json({ match: matchView(match) });
};

// POST /api/matches/:id/events — one scoring event (see scoring.js).
export const appendEvent = async (req, res) => {
  const match = await loadMatch(req, res);
  if (!match) return;
  if (match.status !== "live") return res.status(400).json({ message: "Match is not live" });
  if (match.innings.length === 0) return res.status(400).json({ message: "Do the toss first" });

  const innIndex = match.innings.length - 1;
  const inn = match.innings[innIndex];
  const { derived, target } = deriveAll(match);
  const ctx = ctxFor(match, inn.battingTeam, innIndex === 1 ? target : null);
  const ev = req.body.event || {};
  // Player references must belong to this match — with the common
  // player allowed everywhere except as a bowler.
  const commonId = match.commonPlayer ? String(match.commonPlayer) : null;
  const battingIds = new Set(
    (inn.battingTeam === "A" ? match.teamA.players : match.teamB.players).map(String)
  );
  const fieldingIds = new Set(
    (inn.battingTeam === "A" ? match.teamB.players : match.teamA.players).map(String)
  );
  if (commonId) battingIds.add(commonId);
  const fielderIds = new Set(fieldingIds);
  if (commonId) fielderIds.add(commonId);
  const refsOk =
    (!ev.striker || battingIds.has(String(ev.striker))) &&
    (!ev.nonStriker || battingIds.has(String(ev.nonStriker))) &&
    (!ev.player || battingIds.has(String(ev.player)) || fielderIds.has(String(ev.player))) &&
    (!ev.bowler || fieldingIds.has(String(ev.bowler))) &&
    (!ev.outId || battingIds.has(String(ev.outId))) &&
    (!ev.fielder || fielderIds.has(String(ev.fielder)));
  if (!refsOk) return res.status(400).json({ message: "That player is not in this match" });
  if (ev.kind === "setBowler" && ev.player && !fieldingIds.has(String(ev.player))) {
    return res.status(400).json({ message: "The common player doesn't bowl" });
  }

  const err = validateEvent(derived[innIndex], ev, ctx);
  if (err) return res.status(400).json({ message: err });

  inn.log.push({
    kind: ev.kind,
    striker: ev.striker,
    nonStriker: ev.nonStriker,
    bowler: ev.bowler,
    player: ev.player,
    outcome: ev.outcome,
    runs: ev.runs,
    outId: ev.outId,
    wicketType: ev.wicketType,
    fielder: ev.fielder,
  });
  match.markModified("innings");
  await match.save();
  await autoFinishIfDone(match);
  const fresh = await Match.findById(match._id);
  res.json({ match: matchView(fresh) });
};

// POST /api/matches/:id/undo — remove the last event of the current
// innings. Blocked once the match is completed (stats are applied).
export const undoEvent = async (req, res) => {
  const match = await loadMatch(req, res);
  if (!match) return;
  if (match.status !== "live") {
    return res.status(400).json({ message: "Only a live match can be edited" });
  }
  if (match.innings.length === 0) return res.status(400).json({ message: "Nothing to undo" });
  const inn = match.innings[match.innings.length - 1];
  if (!inn.log || inn.log.length === 0) {
    return res.status(400).json({ message: "Nothing to undo in this innings" });
  }
  inn.log.pop();
  match.markModified("innings");
  await match.save();
  res.json({ match: matchView(match) });
};

// POST /api/matches/:id/abandon — call it off (rain, darkness, dinner).
// No stats are applied for an abandoned match.
export const abandonMatch = async (req, res) => {
  const match = await loadMatch(req, res);
  if (!match) return;
  if (match.status === "completed") {
    return res.status(400).json({ message: "A completed match can't be abandoned" });
  }
  match.status = "abandoned";
  match.result = "Match abandoned";
  await match.save();
  res.json({ match: matchView(match) });
};

// DELETE /api/matches/:id — creator only, and never after completion
// (career stats already carry the match).
export const deleteMatch = async (req, res) => {
  const match = await loadMatch(req, res);
  if (!match) return;
  if (match.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ message: "Only the member who created this match can delete it" });
  }
  if (match.status === "completed") {
    return res.status(400).json({ message: "A completed match is part of the record — it can't be deleted" });
  }
  await match.deleteOne();
  res.json({ message: "Match deleted" });
};
