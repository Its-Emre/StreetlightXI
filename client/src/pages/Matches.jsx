import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export function scoreLine(match, idx) {
  const inn = match.innings?.[idx];
  if (!inn) return null;
  const teamName = inn.battingTeam === "A" ? match.teamA.name : match.teamB.name;
  return `${teamName} ${inn.state.runs}/${inn.state.wickets} (${inn.state.overs})`;
}

export function phaseLabel(match) {
  switch (match.phase) {
    case "awaiting-toss":
      return "Toss pending";
    case "innings-1":
      return "1st innings";
    case "break":
      return `Innings break · target ${match.target}`;
    case "innings-2":
      return "The chase";
    case "completed":
      return "Full time";
    case "abandoned":
      return "Abandoned";
    default:
      return match.status;
  }
}

export default function Matches() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listMatches()
      .then(({ matches }) => setMatches(matches))
      .catch((e) => setError(e.message));
  }, []);

  const live = (matches || []).filter((m) => m.status === "live");
  const past = (matches || []).filter((m) => m.status !== "live");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black italic text-white">
            Match <span className="text-flood-500">Centre</span>
          </h1>
          <p className="mt-1.5 text-sm text-ink-300">
            Live scoring, saved scoreboards, and the stories they leave behind.
          </p>
        </div>
        <Link
          to="/matches/new"
          className="rounded-full bg-flood-500 px-5 py-2.5 font-display text-sm font-black italic text-ink-950 shadow-[0_0_18px_rgba(245,185,33,0.35)] transition hover:bg-flood-400"
        >
          🏏 START A MATCH
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
      )}

      {matches === null && !error && (
        <div className="mt-8 space-y-4">
          <div className="shimmer h-40 rounded-3xl" />
          <div className="shimmer h-28 rounded-3xl" />
        </div>
      )}

      {/* Live now */}
      {live.map((m) => {
        const cur = m.innings[m.innings.length - 1];
        return (
          <Link
            key={m.id}
            to={`/matches/${m.id}/live`}
            className="fade-up mt-8 block overflow-hidden rounded-3xl border border-red-500/40 bg-gradient-to-br from-red-500/10 via-ink-900 to-ink-900 p-6 transition hover:border-red-400"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-bold text-white">● LIVE</span>
              <span className="text-sm font-medium text-ink-300">{phaseLabel(m)}</span>
              <span className="ml-auto text-sm text-ink-500">{m.oversPerInnings} overs a side</span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-2">
              <div>
                <div className="font-display text-5xl font-black italic text-white sm:text-6xl">
                  {cur ? `${cur.state.runs}/${cur.state.wickets}` : "—"}
                </div>
                <div className="mt-1 text-sm text-ink-300">
                  {cur
                    ? `${cur.battingTeam === "A" ? m.teamA.name : m.teamB.name} · ${cur.state.overs} overs · CRR ${cur.state.crr}`
                    : "Toss ho gaya, openers baki"}
                </div>
              </div>
              <div className="text-sm text-ink-300">
                <div>{scoreLine(m, 0)}</div>
                {m.phase === "innings-2" && cur && (
                  <div className="font-semibold text-flood-400">
                    Need {cur.state.runsNeeded} off {cur.state.ballsRemaining} balls · RRR {cur.state.rrr}
                  </div>
                )}
              </div>
              <span className="ml-auto rounded-full bg-flood-500 px-5 py-2 font-display text-sm font-black italic text-ink-950">
                SCORER KHOLO →
              </span>
            </div>
          </Link>
        );
      })}

      {/* History */}
      {past.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-black uppercase italic text-white">
            Scoreboard <span className="text-flood-500">history</span>
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((m) => (
              <Link
                key={m.id}
                to={`/matches/${m.id}`}
                className="group rounded-3xl border border-ink-800 bg-ink-900/70 p-5 transition hover:border-flood-500/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-black italic leading-tight text-white group-hover:text-flood-300">
                    {m.teamA.name} <span className="text-ink-500">vs</span> {m.teamB.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      m.status === "completed"
                        ? "bg-pitch-500/20 text-pitch-400 ring-1 ring-pitch-500/40"
                        : "bg-ink-700 text-ink-100"
                    }`}
                  >
                    {m.status === "completed" ? "FULL TIME" : m.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-ink-300">
                  <div>{scoreLine(m, 0) || "No innings yet"}</div>
                  <div>{scoreLine(m, 1) || ""}</div>
                </div>
                {m.result && (
                  <p className="mt-3 border-t border-ink-800 pt-3 text-sm font-semibold text-flood-400">
                    {m.result}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-500">
                  {new Date(m.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · {m.oversPerInnings} overs
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      {matches && matches.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-ink-700 bg-ink-900/60 px-6 py-14 text-center">
          <div className="text-5xl">🏏</div>
          <h2 className="mt-4 font-display text-2xl font-black italic text-white">No matches yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">
            The first scored match starts the history. Teams, toss, live scoring —
            and the scoreboard stays here forever.
          </p>
          <Link
            to="/matches/new"
            className="mt-6 inline-block rounded-full bg-flood-500 px-6 py-2.5 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400"
          >
            🏏 START THE FIRST MATCH
          </Link>
        </div>
      )}
    </div>
  );
}
