import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import DriveImage from "../components/DriveImage.jsx";
import { phaseLabel } from "./Matches.jsx";

// Mobile-first live scorer: sticky score header, sticky bottom pad,
// bottom-sheet pickers, zero typing. Desktop just gets more air.

function Avatar({ player, size = "h-10 w-10 text-sm" }) {
  if (!player) return <span className={`flex ${size} items-center justify-center rounded-full bg-ink-700 text-ink-300`}>?</span>;
  return (
    <DriveImage
      driveId={player.photoDriveId}
      alt={player.name}
      className={`${size} rounded-full object-cover ring-1 ring-white/25`}
      fallbackClassName={`flex ${size} items-center justify-center rounded-full bg-ink-700 font-display font-black text-flood-400`}
      fallbackText={player.name.charAt(0)}
    />
  );
}

function Sheet({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fade-up max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-ink-700 bg-ink-900 p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink-700" />
        <h3 className="font-display text-xl font-black italic text-white">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function PlayerPickList({ players, onPick, disabledIds = new Set(), commonId = null }) {
  return (
    <div className="grid gap-2">
      {players.map((p) => (
        <button
          key={p._id}
          type="button"
          disabled={disabledIds.has(p._id)}
          onClick={() => onPick(p._id)}
          className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-ink-950/70 px-4 py-2 text-left ring-1 ring-ink-700 transition enabled:active:bg-ink-800 disabled:opacity-40"
        >
          <Avatar player={p} />
          <span className="flex-1 truncate font-semibold text-white">{p.name}</span>
          {p._id === commonId && (
            <span className="rounded-full bg-flood-500/20 px-2 py-0.5 text-[10px] font-bold text-flood-300 ring-1 ring-flood-500/40">
              🌟 COMMON
            </span>
          )}
          <span className="text-xs text-ink-400">{p.role}</span>
        </button>
      ))}
    </div>
  );
}

export default function MatchLive() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null); // "wicket"|"wide"|"noball"|"batsman"|"bowler"|"openers"
  const [toast, setToast] = useState("");
  const busyRef = useRef(false);
  const sheetRef = useRef(null);
  sheetRef.current = sheet;

  const load = useCallback(async () => {
    const [{ match }, { players }] = await Promise.all([api.getMatch(id), api.listPlayers()]);
    setMatch(match);
    setPlayers(Object.fromEntries(players.map((p) => [p._id, p])));
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  // Keep spectators fresh; never yank state while the scorer is mid-tap.
  useEffect(() => {
    if (!match || match.status !== "live") return;
    const t = setInterval(() => {
      if (!busyRef.current && !sheetRef.current) {
        api.getMatch(id).then(({ match }) => setMatch(match)).catch(() => {});
      }
    }, 3000);
    return () => clearInterval(t);
  }, [id, match?.status]);

  const nameOf = (pid) => players[pid]?.name || "Player";
  const cur = match?.innings?.[match.innings.length - 1] || null;
  const battingKey = cur?.battingTeam;
  const commonId = match?.commonPlayer || null;
  const battingSquad = useMemo(() => {
    if (!battingKey) return [];
    const base = battingKey === "A" ? match.teamA.players : match.teamB.players;
    // The common player bats for both teams.
    return commonId ? [...base, commonId] : base;
  }, [match, battingKey, commonId]);
  const fieldingSquad = useMemo(
    () => (battingKey ? (battingKey === "A" ? match.teamB.players : match.teamA.players) : []),
    [match, battingKey]
  );
  // Fielder picks include the common player; bowler picks never do.
  const fielderSquad = useMemo(
    () => (commonId ? [...fieldingSquad, commonId] : fieldingSquad),
    [fieldingSquad, commonId]
  );

  const send = async (event) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const { match } = await api.matchEvent(id, event);
      setMatch(match);
      setSheet(null);
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(""), 3500);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const undo = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { match } = await api.undoEvent(id);
      setMatch(match);
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(""), 3500);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // ------- Toss -------
  const [flip, setFlip] = useState(null); // { spinning, winner }
  const doFlip = () => {
    const winner = Math.random() < 0.5 ? "A" : "B";
    setFlip({ spinning: true, winner });
    setTimeout(() => setFlip({ spinning: false, winner }), 1400);
  };
  const chooseDecision = async (decision) => {
    setBusy(true);
    try {
      const { match } = await api.recordToss(id, { winner: flip.winner, decision });
      setMatch(match);
      setFlip(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !match) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
        <Link to="/matches" className="mt-4 inline-block text-flood-400 underline">← Match Centre</Link>
      </div>
    );
  }
  if (!match) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
        <div className="shimmer h-56 rounded-3xl" />
      </div>
    );
  }

  // ================= TOSS SCREEN =================
  if (match.phase === "awaiting-toss") {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-ink-400">
          {match.teamA.name} vs {match.teamB.name} · {match.oversPerInnings} overs
        </p>
        <h1 className="mt-3 font-display text-4xl font-black italic text-white">
          🪙 The <span className="text-flood-500">Toss</span>
        </h1>
        <div
          className={`mx-auto mt-10 flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-flood-300 to-flood-600 font-display text-6xl shadow-[0_0_60px_rgba(245,185,33,0.4)] ring-4 ring-flood-200/40 ${
            flip?.spinning ? "animate-spin" : ""
          }`}
        >
          🪙
        </div>
        {!flip && (
          <button
            onClick={doFlip}
            className="mt-10 rounded-full bg-flood-500 px-10 py-4 font-display text-xl font-black italic text-ink-950 shadow-[0_0_24px_rgba(245,185,33,0.4)] transition hover:bg-flood-400"
          >
            FLIP THE COIN
          </button>
        )}
        {flip?.spinning && <p className="mt-10 text-lg text-ink-300">Coin hawa mein hai…</p>}
        {flip && !flip.spinning && (
          <div className="fade-up mt-10">
            <p className="font-display text-3xl font-black italic text-white">
              {flip.winner === "A" ? match.teamA.name : match.teamB.name}{" "}
              <span className="text-flood-500">won the toss!</span>
            </p>
            <p className="mt-2 text-sm text-ink-300">Captain, faisla sunao — pehle kya?</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                disabled={busy}
                onClick={() => chooseDecision("bat")}
                className="rounded-3xl bg-pitch-600 py-5 font-display text-xl font-black italic text-white ring-1 ring-pitch-400 transition active:scale-95 disabled:opacity-50"
              >
                🏏 BATTING
              </button>
              <button
                disabled={busy}
                onClick={() => chooseDecision("bowl")}
                className="rounded-3xl bg-ink-800 py-5 font-display text-xl font-black italic text-white ring-1 ring-ink-600 transition active:scale-95 disabled:opacity-50"
              >
                🎯 BOWLING
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const st = cur?.state;
  const battingTeamName = battingKey === "A" ? match.teamA.name : match.teamB.name;
  const openersPending = cur && cur.log.length === 0;
  const yetToBat = st ? battingSquad.filter((pid) => !st.batting.some((b) => b.player === pid)) : [];
  const availableBowlers = fieldingSquad.filter((pid) => pid !== st?.lastBowlerId);

  // ================= LIVE SCREEN =================
  return (
    <div className="mx-auto max-w-3xl px-0 pb-40 sm:px-4">
      {/* Sticky score header */}
      <div className="sticky top-16 z-30 border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <span className={match.status === "live" ? "text-red-400" : "text-ink-400"}>
            {match.status === "live" ? "● LIVE" : "■ ENDED"} · {phaseLabel(match)}
          </span>
          <span className="ml-auto normal-case tracking-normal">
            {match.teamA.name} vs {match.teamB.name}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-end gap-x-4">
          <span className="font-display text-5xl font-black italic leading-none text-white">
            {st ? `${st.runs}/${st.wickets}` : "—"}
          </span>
          <span className="pb-0.5 text-sm text-ink-300">
            {battingTeamName} · {st?.overs} ov · CRR {st?.crr ?? "—"}
          </span>
          {match.phase === "innings-2" && st && !st.complete && (
            <span className="pb-0.5 font-display text-base font-black italic text-flood-400">
              Need {st.runsNeeded} off {st.ballsRemaining} · RRR {st.rrr}
            </span>
          )}
          {match.phase === "break" && (
            <span className="pb-0.5 font-display text-base font-black italic text-flood-400">
              Target {match.target}
            </span>
          )}
        </div>
        {st && (st.thisOver.length > 0 || st.oversLog.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase text-ink-500">This over</span>
            {st.thisOver.map((chip, i) => (
              <span
                key={i}
                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold ring-1 ${
                  chip === "W"
                    ? "bg-red-500/25 text-red-300 ring-red-500/50"
                    : chip === "4"
                      ? "bg-pitch-500/25 text-pitch-300 ring-pitch-500/50"
                      : chip === "6"
                        ? "bg-flood-500/25 text-flood-300 ring-flood-500/50"
                        : "bg-ink-800 text-ink-100 ring-ink-700"
                }`}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 sm:px-0">
        {toast && (
          <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{toast}</p>
        )}

        {/* Completed */}
        {match.status === "completed" && (
          <div className="rounded-3xl border border-pitch-500/40 bg-pitch-500/10 p-6 text-center">
            <div className="text-4xl">🏆</div>
            <p className="mt-2 font-display text-2xl font-black italic text-white">{match.result}</p>
            <p className="mt-1 text-sm text-ink-300">Career stats player cards pe jud gaye hain. ✅</p>
            <Link
              to={`/matches/${match.id}`}
              className="mt-4 inline-block rounded-full bg-flood-500 px-6 py-2.5 font-display text-sm font-black italic text-ink-950"
            >
              FULL SCOREBOARD →
            </Link>
          </div>
        )}
        {match.status === "abandoned" && (
          <div className="rounded-3xl border border-ink-700 bg-ink-900 p-6 text-center">
            <p className="font-display text-2xl font-black italic text-white">🌧️ Match abandoned</p>
            <p className="mt-1 text-sm text-ink-300">Is match ke stats cards pe nahi jude.</p>
          </div>
        )}

        {/* Innings break */}
        {match.phase === "break" && (
          <div className="rounded-3xl border border-flood-500/40 bg-flood-500/10 p-6 text-center">
            <p className="font-display text-2xl font-black italic text-white">Innings Break</p>
            <p className="mt-1 text-sm text-ink-200">
              {battingKey === "A" ? match.teamB.name : match.teamA.name} ko jeet ke liye{" "}
              <span className="font-bold text-flood-400">{match.target} runs</span> chahiye.
            </p>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const { match } = await api.beginNextInnings(id);
                  setMatch(match);
                } catch (e) {
                  setToast(e.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-4 rounded-full bg-flood-500 px-6 py-3 font-display text-base font-black italic text-ink-950 disabled:opacity-50"
            >
              2ND INNINGS SHURU KARO →
            </button>
          </div>
        )}

        {/* Openers picker */}
        {match.status === "live" && openersPending && match.phase !== "break" && (
          <OpenersPicker
            battingSquad={battingSquad.map((pid) => players[pid]).filter(Boolean)}
            fieldingSquad={fieldingSquad.map((pid) => players[pid]).filter(Boolean)}
            commonId={commonId}
            busy={busy}
            onDone={(striker, nonStriker, bowler) => send({ kind: "setOpeners", striker, nonStriker, bowler })}
          />
        )}

        {/* Last man standing banner */}
        {st?.loneBatsman && !st.complete && (
          <div className="mb-3 rounded-2xl bg-flood-500/15 px-4 py-3 text-center ring-1 ring-flood-500/40">
            <span className="font-display text-lg font-black italic text-flood-300">
              ⚡ LAST MAN STANDING
            </span>
            <p className="text-sm text-ink-200">
              {nameOf(st.strikerId)} akela khelega — koi partner nahi. Out hua toh innings khatam.
            </p>
          </div>
        )}

        {/* Crease + bowler */}
        {st && !openersPending && (
          <div className="space-y-3">
            {(st.loneBatsman ? [["strikerId", true]] : [["strikerId", true], ["nonStrikerId", false]]).map(([key, onStrike]) => {
              const pid = st[key];
              const bat = st.batting.find((b) => b.player === pid);
              const p = players[pid];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
                    onStrike ? "bg-pitch-500/10 ring-pitch-500/40" : "bg-ink-900/70 ring-ink-800"
                  }`}
                >
                  <Avatar player={p} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">
                      {p?.name || "Batsman chuno"} {onStrike && <span className="text-flood-400">*</span>}
                    </div>
                    <div className="text-xs text-ink-400">{onStrike ? "Striker" : "Non-striker"}</div>
                  </div>
                  {bat && (
                    <div className="text-right">
                      <span className="font-display text-2xl font-black italic text-white">{bat.runs}</span>
                      <span className="text-sm text-ink-400"> ({bat.balls})</span>
                      <div className="text-[11px] text-ink-500">
                        4s {bat.fours} · 6s {bat.sixes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {st.bowlerId && (
              <div className="flex items-center gap-3 rounded-2xl bg-ink-900/70 px-4 py-3 ring-1 ring-ink-800">
                <Avatar player={players[st.bowlerId]} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-white">{nameOf(st.bowlerId)}</div>
                  <div className="text-xs text-ink-400">Bowling</div>
                </div>
                {(() => {
                  const bw = st.bowling.find((b) => b.player === st.bowlerId);
                  return bw ? (
                    <div className="text-right font-display text-lg font-black italic text-white">
                      {bw.wickets}/{bw.runs}
                      <span className="ml-1 text-xs font-medium not-italic text-ink-400">
                        ({Math.floor(bw.balls / 6)}.{bw.balls % 6} ov)
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* Pending choices */}
        {match.status === "live" && st?.needsBatsman && (
          <button
            onClick={() => setSheet("batsman")}
            className="mt-4 w-full rounded-2xl bg-red-500/15 py-4 font-display text-lg font-black italic text-red-300 ring-1 ring-red-500/40"
          >
            ⚡ NAYA BATSMAN CHUNO
          </button>
        )}
        {match.status === "live" && st?.needsBowler && !openersPending && (
          <button
            onClick={() => setSheet("bowler")}
            className="mt-4 w-full rounded-2xl bg-flood-500/15 py-4 font-display text-lg font-black italic text-flood-300 ring-1 ring-flood-500/40"
          >
            🎯 NAYA BOWLER CHUNO
          </button>
        )}

        <div className="mt-6 flex items-center gap-4 text-sm">
          <Link to={`/matches/${match.id}`} className="text-flood-400 underline">
            Full scoreboard
          </Link>
          {match.status === "live" && (
            <button
              className="text-ink-400 underline"
              onClick={async () => {
                if (!window.confirm("Match abandon kar dein? Stats nahi judega.")) return;
                const { match } = await api.abandonMatch(id);
                setMatch(match);
              }}
            >
              Abandon match
            </button>
          )}
        </div>
      </div>

      {/* Sticky scoring pad */}
      {match.status === "live" && st && !st.complete && match.phase !== "break" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto max-w-3xl px-3 py-3">
            {openersPending || st.needsBatsman || st.needsBowler ? (
              <p className="py-2 text-center text-sm font-semibold text-ink-300">
                {openersPending
                  ? "Pehle openers aur bowler set karo 👆"
                  : st.needsBatsman
                    ? "Naya batsman chuno 👆"
                    : "Over ke liye bowler chuno 👆"}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((r) => (
                    <PadButton key={r} label={String(r)} disabled={busy} onClick={() => send({ kind: "ball", outcome: "bat", runs: r })} />
                  ))}
                  <PadButton label="4" accent="pitch" disabled={busy} onClick={() => send({ kind: "ball", outcome: "bat", runs: 4 })} />
                  <PadButton label="6" accent="gold" disabled={busy} onClick={() => send({ kind: "ball", outcome: "bat", runs: 6 })} />
                  <PadButton label="W" accent="red" disabled={busy} onClick={() => setSheet("wicket")} />
                  <PadButton label="↩" disabled={busy} onClick={undo} />
                  <PadButton label="Wide" small disabled={busy} onClick={() => setSheet("wide")} />
                  <PadButton label="No Ball" small disabled={busy} onClick={() => setSheet("noball")} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sheets */}
      {sheet === "batsman" && (
        <Sheet title="🏏 Naya batsman" onClose={() => setSheet(null)}>
          <PlayerPickList
            players={yetToBat.map((pid) => players[pid]).filter(Boolean)}
            onPick={(pid) => send({ kind: "setBatsman", player: pid })}
            commonId={commonId}
          />
        </Sheet>
      )}
      {sheet === "bowler" && (
        <Sheet title="🎯 Is over ka bowler" onClose={() => setSheet(null)}>
          <PlayerPickList
            players={availableBowlers.map((pid) => players[pid]).filter(Boolean)}
            onPick={(pid) => send({ kind: "setBowler", player: pid })}
          />
          {st?.lastBowlerId && (
            <p className="mt-3 text-xs text-ink-500">
              {nameOf(st.lastBowlerId)} pichhla over daal chuke hain — lagatar do over nahi.
            </p>
          )}
        </Sheet>
      )}
      {sheet === "wide" && (
        <Sheet title="Wide ball" onClose={() => setSheet(null)}>
          <p className="text-sm text-ink-300">1 run pakka. Upar se aur daudhe?</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((extra) => (
              <PadButton
                key={extra}
                label={extra === 0 ? "Sirf wide" : `+${extra}`}
                small={extra === 0}
                onClick={() => send({ kind: "ball", outcome: "wide", runs: extra })}
              />
            ))}
          </div>
        </Sheet>
      )}
      {sheet === "noball" && (
        <Sheet title="No ball" onClose={() => setSheet(null)}>
          <p className="text-sm text-ink-300">1 run penalty pakka. Bat se kitne bane?</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 6].map((r) => (
              <PadButton key={r} label={String(r)} onClick={() => send({ kind: "ball", outcome: "noball", runs: r })} />
            ))}
          </div>
        </Sheet>
      )}
      {sheet === "wicket" && st && (
        <WicketSheet
          striker={players[st.strikerId]}
          nonStriker={players[st.nonStrikerId]}
          fielders={fielderSquad.map((pid) => players[pid]).filter(Boolean)}
          commonId={commonId}
          onDone={(ev) => send(ev)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function PadButton({ label, onClick, disabled, accent, small }) {
  const styles =
    accent === "red"
      ? "bg-red-500/20 text-red-300 ring-red-500/50 active:bg-red-500/40"
      : accent === "pitch"
        ? "bg-pitch-500/20 text-pitch-300 ring-pitch-500/50 active:bg-pitch-500/40"
        : accent === "gold"
          ? "bg-flood-500/20 text-flood-300 ring-flood-500/50 active:bg-flood-500/40"
          : "bg-ink-800 text-white ring-ink-600 active:bg-ink-700";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[56px] items-center justify-center rounded-2xl font-display font-black italic ring-1 transition active:scale-95 disabled:opacity-40 ${small ? "text-base" : "text-2xl"} ${styles}`}
    >
      {label}
    </button>
  );
}

function OpenersPicker({ battingSquad, fieldingSquad, commonId, onDone, busy }) {
  const [striker, setStriker] = useState(null);
  const [nonStriker, setNonStriker] = useState(null);
  const [bowler, setBowler] = useState(null);
  const pick = (role, pid) => {
    if (role === "striker") {
      setStriker(pid);
      if (nonStriker === pid) setNonStriker(null);
    } else if (role === "nonStriker") {
      setNonStriker(pid);
      if (striker === pid) setStriker(null);
    } else setBowler(pid);
  };
  const row = (p, role, selected) => (
    <button
      key={`${role}-${p._id}`}
      type="button"
      onClick={() => pick(role, p._id)}
      className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition ${
        selected ? "bg-pitch-600/70 text-white ring-pitch-400" : "bg-ink-950/60 text-ink-100 ring-ink-800"
      }`}
    >
      <Avatar player={p} size="h-8 w-8 text-xs" />
      <span className="flex-1 truncate font-semibold">{p.name}</span>
      {p._id === commonId && (
        <span className="rounded-full bg-flood-500/20 px-2 py-0.5 text-[10px] font-bold text-flood-300 ring-1 ring-flood-500/40">
          🌟 COMMON
        </span>
      )}
      {selected && <span>✅</span>}
    </button>
  );
  return (
    <div className="rounded-3xl border border-ink-800 bg-ink-900/70 p-5">
      <h2 className="font-display text-xl font-black italic text-white">🏏 Openers & pehla bowler</h2>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-pitch-400">Striker</p>
      <div className="mt-2 grid gap-2">{battingSquad.map((p) => row(p, "striker", striker === p._id))}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-pitch-400">Non-striker</p>
      <div className="mt-2 grid gap-2">{battingSquad.map((p) => row(p, "nonStriker", nonStriker === p._id))}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-flood-400">Pehla bowler</p>
      <div className="mt-2 grid gap-2">{fieldingSquad.map((p) => row(p, "bowler", bowler === p._id))}</div>
      <button
        type="button"
        disabled={!striker || !nonStriker || !bowler || busy}
        onClick={() => onDone(striker, nonStriker, bowler)}
        className="mt-5 w-full rounded-full bg-flood-500 py-3.5 font-display text-lg font-black italic text-ink-950 disabled:opacity-40"
      >
        PLAY ▶
      </button>
    </div>
  );
}

const WK_TYPES = [
  ["bowled", "Bowled"],
  ["caught", "Caught"],
  ["runout", "Run Out"],
  ["stumped", "Stumped"],
  ["hitwicket", "Hit Wicket"],
];

function WicketSheet({ striker, nonStriker, fielders, commonId, onDone, onClose }) {
  const [type, setType] = useState("bowled");
  const [outId, setOutId] = useState(striker?.id);
  const [runs, setRuns] = useState(0);
  const [fielder, setFielder] = useState(null);

  const isRunout = type === "runout";
  useEffect(() => {
    if (!isRunout) {
      setOutId(striker?._id);
      setRuns(0);
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet title="🔴 Wicket gira!" onClose={onClose}>
      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Kaise out?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {WK_TYPES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
              type === value ? "bg-red-500 text-white ring-red-400" : "bg-ink-950 text-ink-100 ring-ink-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isRunout && (
        <>
          <p className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-400">Kaun out hua?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[striker, nonStriker].filter(Boolean).map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => setOutId(p._id)}
                className={`min-h-[52px] rounded-2xl px-3 font-semibold ring-1 ${
                  outId === p._id ? "bg-red-500/80 text-white ring-red-400" : "bg-ink-950 text-ink-100 ring-ink-700"
                }`}
              >
                {p.name}
                {p._id === striker?._id ? " (striker)" : ""}
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-400">Out hone se pehle pure hue runs</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRuns(r)}
                className={`min-h-[52px] rounded-2xl font-display text-xl font-black italic ring-1 ${
                  runs === r ? "bg-flood-500 text-ink-950 ring-flood-400" : "bg-ink-950 text-white ring-ink-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}

      {(type === "caught" || type === "stumped" || isRunout) && (
        <>
          <p className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-400">
            Fielder {type === "caught" ? "(catch lene wala)" : type === "stumped" ? "(stumping)" : "(throw / fielding)"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFielder(null)}
              className={`rounded-full px-4 py-2 text-sm ring-1 ${
                fielder === null ? "bg-flood-500 font-semibold text-ink-950 ring-flood-400" : "bg-ink-950 text-ink-200 ring-ink-700"
              }`}
            >
              Pata nahi
            </button>
            {fielders.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => setFielder(p._id)}
                className={`rounded-full px-4 py-2 text-sm ring-1 ${
                  fielder === p._id ? "bg-flood-500 font-semibold text-ink-950 ring-flood-400" : "bg-ink-950 text-ink-200 ring-ink-700"
                }`}
              >
                {p.name}
                {p._id === commonId ? " 🌟" : ""}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() =>
          onDone({
            kind: "ball",
            outcome: "wicket",
            runs: isRunout ? runs : 0,
            outId: isRunout ? outId : striker?._id,
            wicketType: type,
            fielder: fielder || undefined,
          })
        }
        className="mt-6 w-full rounded-full bg-red-500 py-4 font-display text-lg font-black italic text-white transition active:scale-95"
      >
        WICKET CONFIRM 🔴
      </button>
    </Sheet>
  );
}
