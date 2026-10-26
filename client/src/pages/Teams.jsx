import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ROLE_SHORT } from "../components/PlayerCard";
import { useSettings } from "../context/SettingsContext";

// Balance weight mirrors the server: unrated players count as 45.
const weight = (p) => p.rating ?? 45;
const teamTotal = (list) => list.reduce((sum, p) => sum + weight(p), 0);

// Snake order for pick i (0-based): rounds alternate direction —
// A B | B A | A B | B A … so neither captain gets two first picks.
const teamForPick = (i) => {
  const round = Math.floor(i / 2);
  const pos = i % 2;
  return round % 2 === 0 ? ["A", "B"][pos] : ["B", "A"][pos];
};

function TeamColumn({ title, captain, members, accent }) {
  const { settings } = useSettings();
  const total = teamTotal(members);
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900/70">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <h3 className="font-display text-base font-black uppercase italic text-white">
          Team <span className={accent}>{title}</span>
        </h3>
        {settings.ratings !== false && (
          <span className="text-sm text-ink-300">
            strength <span className="font-display text-lg font-bold text-white">{total}</span>
          </span>
        )}
      </div>
      <ul className="divide-y divide-ink-800">
        {members.map((p) => (
          <li key={p._id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate font-medium text-white">
              {p.name}
              {captain && p._id === captain._id && (
                <span className="ml-2 rounded bg-flood-500 px-1.5 py-0.5 text-[10px] font-black text-ink-950">C</span>
              )}
            </span>
            <span className="text-xs text-ink-500">{ROLE_SHORT[p.role] || "AR"}</span>
            {settings.ratings !== false && (
              <span className="font-display text-base font-bold text-flood-400">{p.rating ?? "NEW"}</span>
            )}
          </li>
        ))}
        {members.length === 0 && <li className="px-4 py-4 text-sm text-ink-500">No players yet.</li>}
      </ul>
    </div>
  );
}

function BalanceBanner({ a, b }) {
  const { settings } = useSettings();
  const diff = Math.abs(teamTotal(a) - teamTotal(b));
  const note =
    diff <= 6 ? "Dead even — this will go to the last over. 🔥" :
    diff <= 14 ? "Close enough. The toss might decide it." :
    "One side looks heavy — consider a swap.";
  return (
    <div className="rounded-2xl border border-pitch-500/30 bg-pitch-500/10 px-4 py-3 text-center text-sm text-pitch-400">
      {settings.ratings !== false ? (
        <>
          Strength difference: <span className="font-display text-lg font-bold">{diff}</span> — {note}
        </>
      ) : (
        <>Teams are set — may the best street win. 🏏</>
      )}
    </div>
  );
}

export default function Teams() {
  const { settings } = useSettings();
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [mode, setMode] = useState("draft"); // "draft" | "auto"
  const [capA, setCapA] = useState("");
  const [capB, setCapB] = useState("");
  const [picks, setPicks] = useState([]); // [{ id, team }]
  const [autoTeams, setAutoTeams] = useState(null);

  useEffect(() => {
    api
      .listPlayers()
      .then(({ players }) => {
        setPlayers(players);
        setSelected(new Set(players.map((p) => p._id)));
        const rated = [...players].sort((x, y) => weight(y) - weight(x));
        if (rated[0]) setCapA(rated[0]._id);
        if (rated[1]) setCapB(rated[1]._id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const squad = useMemo(
    () => (players || []).filter((p) => selected.has(p._id)),
    [players, selected]
  );
  const byId = useMemo(
    () => Object.fromEntries((players || []).map((p) => [p._id, p])),
    [players]
  );

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPicks([]);
    setAutoTeams(null);
  };

  // --- Snake draft ---
  const captainA = byId[capA];
  const captainB = byId[capB];
  const pool = squad.filter((p) => p._id !== capA && p._id !== capB);
  const pickedIds = new Set(picks.map((pk) => pk.id));
  const remaining = pool.filter((p) => !pickedIds.has(p._id));
  const nextTeam = picks.length < pool.length ? teamForPick(picks.length) : null;
  const draftA = [captainA, ...picks.filter((pk) => pk.team === "A").map((pk) => byId[pk.id])].filter(Boolean);
  const draftB = [captainB, ...picks.filter((pk) => pk.team === "B").map((pk) => byId[pk.id])].filter(Boolean);
  const draftDone = pool.length > 0 && remaining.length === 0;

  const pick = (p) => {
    if (!nextTeam) return;
    setPicks((prev) => [...prev, { id: p._id, team: nextTeam }]);
  };
  const undo = () => setPicks((prev) => prev.slice(0, -1));

  // --- Auto-balance: sort by strength, snake-deal into two teams ---
  const autoBalance = () => {
    const sorted = [...squad].sort((x, y) => weight(y) - weight(x));
    const a = [];
    const b = [];
    sorted.forEach((p, i) => (teamForPick(i) === "A" ? a : b).push(p));
    setAutoTeams({ a, b });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="font-display text-4xl font-black italic text-white">
        Make <span className="text-flood-500">Teams</span>
      </h1>
      <p className="mt-1.5 max-w-xl text-sm text-ink-300">
        Pick who is playing today, then settle it like captains — or let the ratings
        balance both sides in one tap.
      </p>

      {error && (
        <p className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
      )}

      {players === null && !error && <div className="shimmer mt-8 h-64 rounded-3xl" />}

      {players && players.length < 4 && (
        <div className="mt-8 rounded-3xl border border-dashed border-ink-700 bg-ink-900/60 px-6 py-12 text-center">
          <p className="text-ink-300">
            You need at least 4 player cards to make two teams — the squad has {players.length}.
          </p>
          <Link
            to="/players/new"
            className="mt-4 inline-block rounded-full bg-flood-500 px-5 py-2 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400"
          >
            + ADD PLAYERS
          </Link>
        </div>
      )}

      {players && players.length >= 4 && (
        <>
          {/* Squad picker */}
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-ink-300">
              Today's squad — {squad.length} in
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {players.map((p) => {
                const on = selected.has(p._id);
                return (
                  <button
                    key={p._id}
                    onClick={() => toggle(p._id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                      on
                        ? "bg-flood-500 font-bold text-ink-950"
                        : "border border-ink-700 text-ink-500 hover:border-ink-500 hover:text-ink-300"
                    }`}
                  >
                    {p.name}{" "}
                    {settings.ratings !== false && (
                      <span className="opacity-70">{p.rating ?? "NEW"}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {squad.length < 4 && (
              <p className="mt-3 text-sm text-red-300">Select at least 4 players to make teams.</p>
            )}
          </section>

          {/* Mode tabs */}
          <div className="mt-8 flex gap-2">
            {[
              ["draft", "⚔️ Captains' Snake Draft"],
              ["auto", "⚖️ Auto-Balance"],
            ].map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-2 font-display text-sm font-bold italic transition ${
                  mode === m
                    ? "bg-ink-100 text-ink-950"
                    : "border border-ink-700 text-ink-300 hover:border-ink-500 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "draft" && squad.length >= 4 && (
            <section className="fade-up mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-ink-300">
                  Captain A{" "}
                  <select
                    value={capA}
                    onChange={(e) => { setCapA(e.target.value); setPicks([]); }}
                    className="ml-1 rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-white outline-none focus:border-flood-500"
                  >
                    {squad.filter((p) => p._id !== capB).map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-ink-300">
                  Captain B{" "}
                  <select
                    value={capB}
                    onChange={(e) => { setCapB(e.target.value); setPicks([]); }}
                    className="ml-1 rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-white outline-none focus:border-flood-500"
                  >
                    {squad.filter((p) => p._id !== capA).map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                {picks.length > 0 && (
                  <>
                    <button onClick={undo} className="rounded-full border border-ink-700 px-3.5 py-1.5 text-sm text-ink-300 transition hover:border-ink-500 hover:text-white">
                      ↩ Undo pick
                    </button>
                    <button onClick={() => setPicks([])} className="rounded-full border border-ink-700 px-3.5 py-1.5 text-sm text-ink-300 transition hover:border-red-400 hover:text-red-300">
                      Reset draft
                    </button>
                  </>
                )}
              </div>

              {!draftDone && nextTeam && (
                <p className="mt-5 font-display text-xl font-black italic text-white">
                  Team <span className="text-flood-400">{nextTeam}</span>'s pick —{" "}
                  <span className="text-ink-300">tap a player</span>
                </p>
              )}
              {draftDone && (
                <p className="mt-5 font-display text-xl font-black italic text-pitch-400">
                  Draft complete — teams are set. 🏏
                </p>
              )}

              {remaining.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {remaining.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => pick(p)}
                      className="rounded-xl border border-ink-700 bg-ink-850 px-4 py-2.5 text-left transition hover:border-flood-500 hover:bg-ink-800"
                    >
                      <span className="font-medium text-white">{p.name}</span>{" "}
                      <span className="text-xs text-ink-500">{ROLE_SHORT[p.role] || "AR"}</span>{" "}
                      {settings.ratings !== false && (
                        <span className="font-display font-bold text-flood-400">{p.rating ?? "NEW"}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <TeamColumn title="A" captain={captainA} members={draftA} accent="text-flood-400" />
                <TeamColumn title="B" captain={captainB} members={draftB} accent="text-pitch-400" />
              </div>
              {(draftDone || picks.length > 0) && (
                <div className="mt-4">
                  <BalanceBanner a={draftA} b={draftB} />
                </div>
              )}
            </section>
          )}

          {mode === "auto" && squad.length >= 4 && (
            <section className="fade-up mt-6">
              <button
                onClick={autoBalance}
                className="rounded-xl bg-flood-500 px-6 py-3 font-display text-base font-black italic text-ink-950 transition hover:bg-flood-400"
              >
                ⚖️ BALANCE THE TEAMS
              </button>
              <p className="mt-2 text-sm text-ink-500">
                Strongest player to A, next to B, then snake back — the classic fair deal.
              </p>
              {autoTeams && (
                <div className="fade-up mt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TeamColumn title="A" members={autoTeams.a} accent="text-flood-400" />
                    <TeamColumn title="B" members={autoTeams.b} accent="text-pitch-400" />
                  </div>
                  <div className="mt-4">
                    <BalanceBanner a={autoTeams.a} b={autoTeams.b} />
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
