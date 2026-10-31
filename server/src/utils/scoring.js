// Ball-by-ball scoring engine — pure functions, no database.
//
// An innings is stored as an EVENT LOG and everything else (score,
// batting card, bowling figures, who is on strike, what happens next)
// is derived from it. The log is the source of truth, which makes
// Undo trivial (pop the last event) and the scoreboard free.
//
// Event shapes:
//   { kind: "setOpeners", striker, nonStriker, bowler }   (first event)
//   { kind: "setBowler", player }                          (start of an over)
//   { kind: "setBatsman", player }                         (after a wicket)
//   { kind: "ball", outcome: "bat", runs }                 runs: 0,1,2,3,4,6
//   { kind: "ball", outcome: "wide", runs }                runs = extra runs
//                                                          run beyond the
//                                                          1-run penalty
//   { kind: "ball", outcome: "noball", runs }              runs = runs off
//                                                          the bat (0..6);
//                                                          +1 penalty added
//   { kind: "ball", outcome: "wicket", runs, outId,
//     wicketType, fielder }   runs = completed runs (run outs); outId =
//                             the dismissed player's id; wicketType:
//                             bowled|caught|runout|stumped|hitwicket;
//                             fielder = player id (caught / run out)

const BALLS_PER_OVER = 6;

export const oversText = (legalBalls) =>
  `${Math.floor(legalBalls / BALLS_PER_OVER)}.${legalBalls % BALLS_PER_OVER}`;

export function deriveInnings(log, ctx) {
  // ctx: { squadSize, oversLimit, target (runs to win, innings 2 only) }
  const bat = new Map();
  const bowl = new Map();
  let order = 0;

  const batEntry = (player) => {
    if (!bat.has(player)) {
      bat.set(player, {
        player,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: null,
        order: order++,
      });
    }
    return bat.get(player);
  };
  const bowlEntry = (player) => {
    if (!bowl.has(player)) bowl.set(player, { player, balls: 0, runs: 0, wickets: 0 });
    return bowl.get(player);
  };

  const st = {
    teamRuns: 0,
    wickets: 0,
    legalBalls: 0,
    strikerId: null,
    nonStrikerId: null,
    bowlerId: null,
    lastBowlerId: null,
    needsBowler: true,
    needsBatsman: false,
    pendingSlot: null, // "striker" | "nonstriker"
    thisOver: [],
    oversLog: [], // completed overs' chip lists
    complete: false,
    lone: false, // last man standing — one batsman, no partner
  };

  const swapEnds = () => {
    if (st.lone) return; // the last man is at both ends already
    const t = st.strikerId;
    st.strikerId = st.nonStrikerId;
    st.nonStrikerId = t;
  };

  const endOfOverIfNeeded = (wasLegal) => {
    if (!wasLegal || st.legalBalls % BALLS_PER_OVER !== 0 || st.legalBalls === 0) return;
    st.oversLog.push(st.thisOver);
    st.thisOver = [];
    swapEnds();
    st.lastBowlerId = st.bowlerId;
    if (!st.complete) st.needsBowler = true;
  };

  const checkComplete = () => {
    if (st.legalBalls >= ctx.oversLimit * BALLS_PER_OVER) st.complete = true;
    // Normally all out = squadSize - 1 wickets (one not-out remains).
    // With last-man-stands the innings ends only when he falls too.
    const maxWickets = ctx.lastManStands ? ctx.squadSize : ctx.squadSize - 1;
    if (st.wickets >= maxWickets) st.complete = true;
    if (ctx.target && st.teamRuns >= ctx.target) st.complete = true;
  };

  for (const ev of log || []) {
    if (ev.kind === "setOpeners") {
      batEntry(ev.striker);
      batEntry(ev.nonStriker);
      bowlEntry(ev.bowler);
      st.strikerId = ev.striker;
      st.nonStrikerId = ev.nonStriker;
      st.bowlerId = ev.bowler;
      st.needsBowler = false;
      continue;
    }
    if (ev.kind === "setBowler") {
      bowlEntry(ev.player);
      st.bowlerId = ev.player;
      st.needsBowler = false;
      continue;
    }
    if (ev.kind === "setBatsman") {
      batEntry(ev.player);
      if (st.pendingSlot === "striker") st.strikerId = ev.player;
      else st.nonStrikerId = ev.player;
      st.needsBatsman = false;
      st.pendingSlot = null;
      continue;
    }
    if (ev.kind !== "ball") continue;

    const striker = batEntry(st.strikerId);
    const bowler = bowlEntry(st.bowlerId);
    let legal = false;

    if (ev.outcome === "bat") {
      const runs = ev.runs || 0;
      st.teamRuns += runs;
      striker.runs += runs;
      striker.balls += 1;
      if (runs === 4) striker.fours += 1;
      if (runs === 6) striker.sixes += 1;
      bowler.runs += runs;
      bowler.balls += 1;
      st.legalBalls += 1;
      legal = true;
      st.thisOver.push(runs === 0 ? "•" : String(runs));
      if (runs % 2 === 1) swapEnds();
    } else if (ev.outcome === "wide") {
      const extra = ev.runs || 0; // runs beyond the penalty
      st.teamRuns += 1 + extra;
      bowler.runs += 1 + extra;
      st.thisOver.push(extra > 0 ? `wd+${extra}` : "wd");
      if (extra % 2 === 1) swapEnds();
    } else if (ev.outcome === "noball") {
      const runs = ev.runs || 0; // off the bat
      st.teamRuns += 1 + runs;
      striker.runs += runs;
      striker.balls += 1;
      if (runs === 4) striker.fours += 1;
      if (runs === 6) striker.sixes += 1;
      bowler.runs += 1 + runs;
      st.thisOver.push(runs > 0 ? `nb+${runs}` : "nb");
      if (runs % 2 === 1) swapEnds();
    } else if (ev.outcome === "wicket") {
      const runs = ev.runs || 0; // completed runs (run outs)
      st.teamRuns += runs;
      striker.runs += runs;
      striker.balls += 1;
      bowler.runs += runs;
      bowler.balls += 1;
      st.legalBalls += 1;
      legal = true;
      st.wickets += 1;
      if (ev.wicketType !== "runout") bowler.wickets += 1;
      const outEntry = batEntry(ev.outId);
      outEntry.out = {
        type: ev.wicketType,
        bowler: st.bowlerId,
        fielder: ev.fielder || null,
      };
      st.thisOver.push("W");
      if (runs % 2 === 1) swapEnds();
      if (ctx.lastManStands && st.wickets === ctx.squadSize - 1) {
        // Last man standing: the survivor bats alone from here —
        // no partner comes in, and he faces every ball.
        const survivor = ev.outId === st.strikerId ? st.nonStrikerId : st.strikerId;
        st.strikerId = survivor;
        st.nonStrikerId = null;
        st.lone = true;
      } else if (st.wickets < ctx.squadSize - 1) {
        // The dismissed player's slot is now vacant.
        if (ev.outId === st.strikerId) {
          st.strikerId = null;
          st.pendingSlot = "striker";
        } else {
          st.nonStrikerId = null;
          st.pendingSlot = "nonstriker";
        }
        st.needsBatsman = true;
      } else {
        if (ev.outId === st.strikerId) st.strikerId = null;
        else st.nonStrikerId = null;
      }
    }

    checkComplete();
    endOfOverIfNeeded(legal);
    if (st.complete) {
      // freeze: further events are ignored by validation upstream
    }
  }

  const batting = [...bat.values()].sort((a, b) => a.order - b.order);
  const bowling = [...bowl.values()];
  const ballsRemaining = Math.max(0, ctx.oversLimit * BALLS_PER_OVER - st.legalBalls);
  const crr = st.legalBalls > 0 ? st.teamRuns / (st.legalBalls / BALLS_PER_OVER) : 0;

  return {
    runs: st.teamRuns,
    wickets: st.wickets,
    legalBalls: st.legalBalls,
    overs: oversText(st.legalBalls),
    batting,
    bowling,
    strikerId: st.strikerId,
    nonStrikerId: st.nonStrikerId,
    bowlerId: st.bowlerId,
    lastBowlerId: st.lastBowlerId,
    needsBowler: st.needsBowler && !st.complete,
    needsBatsman: st.needsBatsman && !st.complete,
    loneBatsman: st.lone,
    thisOver: st.thisOver,
    oversLog: st.oversLog,
    complete: st.complete,
    ballsRemaining,
    crr: Math.round(crr * 100) / 100,
    rrr:
      ctx.target && !st.complete && ballsRemaining > 0
        ? Math.round(((ctx.target - st.teamRuns) / (ballsRemaining / BALLS_PER_OVER)) * 100) / 100
        : null,
    runsNeeded: ctx.target ? Math.max(0, ctx.target - st.teamRuns) : null,
  };
}

// Validates an event against the current derived state before it is
// appended. Returns an error string, or null when the event is legal.
export function validateEvent(derived, ev, ctx) {
  if (derived.complete) return "This innings is over";
  if (!ev || typeof ev !== "object") return "Invalid event";

  if (ev.kind === "setOpeners") {
    if (derived.strikerId || derived.nonStrikerId) return "Openers are already set";
    if (ev.striker === ev.nonStriker) return "Striker and non-striker must differ";
    return null;
  }
  if (ev.kind === "setBowler") {
    if (!derived.needsBowler) return "A bowler is already set for this over";
    if (ev.player === derived.lastBowlerId) {
      return "The same bowler can't bowl two overs in a row";
    }
    return null;
  }
  if (ev.kind === "setBatsman") {
    if (!derived.needsBatsman) return "No batsman is needed right now";
    const alreadyIn = derived.batting.find((b) => b.player === ev.player);
    if (alreadyIn && !alreadyIn.out) return "That player is already at the crease";
    if (alreadyIn && alreadyIn.out) return "That player is already out";
    return null;
  }
  if (ev.kind === "ball") {
    if (derived.needsBatsman) return "Choose the next batsman first";
    if (!derived.strikerId) return "Openers are not set";
    if (!derived.nonStrikerId && !derived.loneBatsman) return "Openers are not set";
    if (derived.needsBowler || !derived.bowlerId) return "Choose the bowler first";
    if (ev.outcome === "bat") {
      if (![0, 1, 2, 3, 4, 6].includes(ev.runs)) return "Runs must be 0, 1, 2, 3, 4 or 6";
    } else if (ev.outcome === "wide") {
      if (!(ev.runs >= 0 && ev.runs <= 6)) return "Invalid wide runs";
    } else if (ev.outcome === "noball") {
      if (![0, 1, 2, 3, 4, 6].includes(ev.runs)) return "No-ball runs off the bat must be 0, 1, 2, 3, 4 or 6";
    } else if (ev.outcome === "wicket") {
      if (!["bowled", "caught", "runout", "stumped", "hitwicket"].includes(ev.wicketType)) {
        return "Invalid wicket type";
      }
      if (ev.outId !== derived.strikerId && ev.outId !== derived.nonStrikerId) {
        return "The dismissed player must be at the crease";
      }
      if (ev.wicketType !== "runout" && ev.outId !== derived.strikerId) {
        return "Only a run out can dismiss the non-striker";
      }
      if (ev.wicketType !== "runout" && (ev.runs || 0) !== 0) {
        return "Runs can only be added on a run out";
      }
      if (!((ev.runs || 0) >= 0 && (ev.runs || 0) <= 3)) return "Invalid completed runs";
    } else {
      return "Unknown ball outcome";
    }
    return null;
  }
  return "Unknown event kind";
}

// Result text + top performers for a finished match, computed from both
// innings' derived states.
export function describeResult(teamAName, teamBName, inn1, inn2, battingFirstKey, chasingMaxWickets) {
  const firstName = battingFirstKey === "A" ? teamAName : teamBName;
  const secondName = battingFirstKey === "A" ? teamBName : teamAName;
  if (!inn2) return null;
  if (inn2.runs >= inn1.runs + 1) {
    const wktsLeft = chasingMaxWickets - inn2.wickets;
    return `${secondName} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
  }
  if (inn2.runs < inn1.runs) {
    const diff = inn1.runs - inn2.runs;
    return `${firstName} won by ${diff} run${diff === 1 ? "" : "s"}`;
  }
  return "Match tied";
}

export function topPerformers(inn1, inn2) {
  const bats = [...(inn1?.batting || []), ...(inn2?.batting || [])];
  const bowls = [...(inn1?.bowling || []), ...(inn2?.bowling || [])];
  const bestBatter = bats.length
    ? [...bats].sort((a, b) => b.runs - a.runs || a.balls - b.balls)[0]
    : null;
  const bestBowler = bowls.length
    ? [...bowls].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0]
    : null;
  return { bestBatter, bestBowler };
}
