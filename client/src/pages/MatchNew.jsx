import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import DriveImage from "../components/DriveImage.jsx";

// Server-computed rating lives on the player; newcomers (null) count
// at the floor weight when balancing teams.
const ratingOf = (player) => player?.rating ?? 45;

const OVER_CHIPS = [4, 5, 6, 8, 10, 12, 15, 20];

export default function MatchNew() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState("");
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [teamA, setTeamA] = useState(new Set());
  const [teamB, setTeamB] = useState(new Set());
  const [overs, setOvers] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .listPlayers()
      .then(({ players }) => setPlayers(players))
      .catch((e) => setError(e.message));
  }, []);

  const sorted = useMemo(
    () => [...(players || [])].sort((x, y) => ratingOf(y) - ratingOf(x)),
    [players]
  );

  const toggle = (set, setter) => (id) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleA = toggle(teamA, setTeamA);
  const toggleB = toggle(teamB, setTeamB);

  // Snake-draft the currently picked pool (or everyone) into two
  // rating-balanced teams.
  const autoSplit = () => {
    let pool = sorted.filter((p) => teamA.has(p._id) || teamB.has(p._id));
    if (pool.length < 6) pool = sorted;
    const a = new Set();
    const b = new Set();
    pool.forEach((p, i) => {
      const round = Math.floor(i / 2);
      const toA = i % 2 === 0 ? round % 2 === 0 : round % 2 === 1;
      (toA ? a : b).add(p._id);
    });
    setTeamA(a);
    setTeamB(b);
  };

  const teamStrength = (set) =>
    [...set].reduce((sum, id) => {
      const p = (players || []).find((x) => x._id === id);
      return sum + (p ? ratingOf(p) : 0);
    }, 0);

  const canStart =
    teamA.size >= 3 && teamB.size >= 3 && teamAName.trim() && teamBName.trim() && overs >= 1 && !creating;

  const startMatch = async () => {
    setCreating(true);
    setError("");
    try {
      const { match } = await api.createMatch({
        teamAName: teamAName.trim(),
        teamBName: teamBName.trim(),
        teamAPlayers: [...teamA],
        teamBPlayers: [...teamB],
        overs,
      });
      navigate(`/matches/${match.id}/live`);
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  };

  const teamPicker = (title, name, setName, set, onToggle, otherSet, accent) => (
    <section className="rounded-3xl border border-ink-800 bg-ink-900/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-black italic text-white">{title}</h2>
        <span className="text-sm text-ink-300">
          {set.size} players · ⚡ {teamStrength(set)}
        </span>
      </div>
      <input
        className="mt-3 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 py-2.5 text-white placeholder:text-ink-500 outline-none focus:border-flood-500"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Team name"
      />
      <div className="mt-4 grid gap-2">
        {sorted.map((p) => {
          const picked = set.has(p._id);
          const inOther = otherSet.has(p._id);
          return (
            <button
              key={p._id}
              type="button"
              disabled={inOther}
              onClick={() => onToggle(p._id)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition ${
                picked
                  ? `${accent} text-white`
                  : inOther
                    ? "bg-ink-900 text-ink-600 ring-ink-800 opacity-50"
                    : "bg-ink-950/60 text-ink-100 ring-ink-800 hover:ring-flood-500/50"
              }`}
            >
              <DriveImage
                driveId={p.photoDriveId}
                alt={p.name}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20"
                fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 font-display text-sm font-black text-flood-400"
                fallbackText={p.name.charAt(0)}
              />
              <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
              <span className="text-xs text-ink-400">{p.role}</span>
              <span className="font-display text-sm font-black italic text-flood-400">
                {p.rating ?? "NEW"}
              </span>
              <span className="text-base">{picked ? "✅" : "➕"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="font-display text-4xl font-black italic text-white">
        New <span className="text-flood-500">Match</span>
      </h1>
      <p className="mt-1.5 text-sm text-ink-300">
        Pehle squads, phir overs — toss scorer screen pe hoga, bilkul match day jaisa.
      </p>

      {error && (
        <p className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
      )}
      {players === null && !error && <div className="shimmer mt-8 h-64 rounded-3xl" />}

      {players && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={autoSplit}
              className="rounded-full bg-ink-800 px-5 py-2 text-sm font-semibold text-white ring-1 ring-ink-600 transition hover:ring-flood-500"
            >
              ⚖️ Auto-split by rating
            </button>
            <span className="text-sm text-ink-400">
              Pool choose karke split karo, ya dono teams haath se bharo. Har team mein 3–11 players.
            </span>
          </div>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
            {teamPicker("Team A", teamAName, setTeamAName, teamA, toggleA, teamB, "bg-pitch-600/80 ring-pitch-400")}
            {teamPicker("Team B", teamBName, setTeamBName, teamB, toggleB, teamA, "bg-flood-600/70 ring-flood-400")}
          </div>

          <section className="mt-6 rounded-3xl border border-ink-800 bg-ink-900/70 p-5">
            <h2 className="font-display text-lg font-black italic text-white">Overs per innings</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {OVER_CHIPS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOvers(o)}
                  className={`rounded-full px-5 py-2 font-display text-base font-black italic ring-1 transition ${
                    overs === o
                      ? "bg-flood-500 text-ink-950 ring-flood-400"
                      : "bg-ink-950 text-ink-100 ring-ink-700 hover:ring-flood-500/60"
                  }`}
                >
                  {o}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="50"
                value={overs}
                onChange={(e) => setOvers(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="w-24 rounded-full border border-ink-700 bg-ink-950 px-4 py-2 text-center text-white outline-none focus:border-flood-500"
                aria-label="Custom overs"
              />
            </div>
          </section>

          <button
            type="button"
            disabled={!canStart}
            onClick={startMatch}
            className="mt-8 w-full rounded-full bg-flood-500 py-4 font-display text-lg font-black italic text-ink-950 shadow-[0_0_24px_rgba(245,185,33,0.35)] transition hover:bg-flood-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "MATCH BAN RAHA HAI…" : "🪙 TOSS PE CHALO →"}
          </button>
          {!canStart && !creating && (
            <p className="mt-3 text-center text-sm text-ink-400">
              Dono teams mein kam se kam 3 players chahiye.
            </p>
          )}
        </>
      )}
    </div>
  );
}
