import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import DriveImage from "../components/DriveImage.jsx";
import { phaseLabel } from "./Matches.jsx";

function dismissalText(bat, nameOf) {
  if (!bat.out) return "not out";
  const bowler = nameOf(bat.out.bowler);
  switch (bat.out.type) {
    case "bowled":
      return `b ${bowler}`;
    case "caught":
      return bat.out.fielder ? `c ${nameOf(bat.out.fielder)} b ${bowler}` : `c & b ${bowler}`;
    case "runout":
      return bat.out.fielder ? `run out (${nameOf(bat.out.fielder)})` : "run out";
    case "stumped":
      return bat.out.fielder ? `st ${nameOf(bat.out.fielder)} b ${bowler}` : `stumped b ${bowler}`;
    case "hitwicket":
      return `hit wicket b ${bowler}`;
    default:
      return bat.out.type;
  }
}

function srOf(bat) {
  return bat.balls > 0 ? Math.round((bat.runs / bat.balls) * 100) : 0;
}

export default function MatchView() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getMatch(id), api.listPlayers()])
      .then(([{ match }, { players }]) => {
        setMatch(match);
        setPlayers(Object.fromEntries(players.map((p) => [p._id, p])));
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-10">
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
        <Link to="/matches" className="mt-4 inline-block text-flood-400 underline">← Match Centre</Link>
      </div>
    );
  }
  if (!match) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-10">
        <div className="shimmer h-64 rounded-3xl" />
      </div>
    );
  }

  const nameOf = (pid) => players[pid]?.name || "Player";
  const tops = match.tops || {};

  const perfCard = (title, entry, tiles, emoji) => {
    if (!entry) return null;
    const p = players[entry.player];
    return (
      <div className="overflow-hidden rounded-3xl border border-ink-800 bg-ink-900/70">
        <div className="relative">
          <DriveImage
            driveId={p?.photoDriveId}
            alt={p?.name || title}
            className="h-52 w-full object-cover object-top"
            fallbackClassName="flex h-52 w-full items-center justify-center bg-ink-800 font-display text-7xl font-black text-flood-500"
            fallbackText={(p?.name || "?").charAt(0)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent p-4 pt-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-flood-400">
              {emoji} {title}
            </p>
            <p className="font-display text-2xl font-black italic text-white">{p?.name || "Player"}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-ink-800 text-center">
          {tiles.map(([label, value]) => (
            <div key={label} className="py-3">
              <div className="font-display text-xl font-black italic text-white">{value}</div>
              <div className="text-[11px] uppercase tracking-wider text-ink-400">{label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Link to="/matches" className="text-sm text-ink-400 underline">← Match Centre</Link>

      {/* Result hero */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-ink-800 bg-gradient-to-br from-ink-900 via-ink-900 to-pitch-900/40 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              match.status === "live"
                ? "bg-red-500 text-white"
                : match.status === "completed"
                  ? "bg-pitch-500/20 text-pitch-300 ring-1 ring-pitch-500/40"
                  : "bg-ink-700 text-ink-100"
            }`}
          >
            {match.status === "live" ? "● LIVE" : phaseLabel(match).toUpperCase()}
          </span>
          <span className="text-sm text-ink-400">
            {match.oversPerInnings} overs a side ·{" "}
            {new Date(match.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {match.toss && (
            <span className="text-sm text-ink-400">
              · Toss: {match.toss.winner === "A" ? match.teamA.name : match.teamB.name} ({match.toss.decision === "bat" ? "batting first" : "bowling first"})
            </span>
          )}
        </div>
        <h1 className="mt-3 font-display text-3xl font-black italic leading-tight text-white sm:text-4xl">
          {match.teamA.name} <span className="text-ink-500">vs</span> {match.teamB.name}
        </h1>
        <div className="mt-3 space-y-1 font-display text-xl font-bold italic text-ink-100">
          {match.innings.map((inn) => (
            <div key={inn.battingTeam + inn.state.runs}>
              {inn.battingTeam === "A" ? match.teamA.name : match.teamB.name}{" "}
              <span className="text-flood-400">
                {inn.state.runs}/{inn.state.wickets}
              </span>{" "}
              <span className="text-base font-medium not-italic text-ink-400">({inn.state.overs} overs)</span>
            </div>
          ))}
        </div>
        {match.result && (
          <p className="mt-4 border-t border-ink-800 pt-3 font-display text-xl font-black italic text-flood-400">
            🏆 {match.result}
          </p>
        )}
        {match.status === "completed" && (
          <p className="mt-1 text-sm text-pitch-400">✅ Career stats player cards pe jud gaye</p>
        )}
        {match.status === "live" && (
          <Link
            to={`/matches/${match.id}/live`}
            className="mt-4 inline-block rounded-full bg-flood-500 px-6 py-2.5 font-display text-sm font-black italic text-ink-950"
          >
            SCORER KHOLO →
          </Link>
        )}
        {match.status === "setup" && (
          <Link
            to={`/matches/${match.id}/live`}
            className="mt-4 inline-block rounded-full bg-flood-500 px-6 py-2.5 font-display text-sm font-black italic text-ink-950"
          >
            TOSS SE SHURU KARO →
          </Link>
        )}
      </div>

      {/* Top performances */}
      {(tops.bestBatter || tops.bestBowler) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {perfCard(
            "Top Scorer",
            tops.bestBatter,
            tops.bestBatter
              ? [
                  ["Runs", tops.bestBatter.runs],
                  ["Balls", tops.bestBatter.balls],
                  ["Strike Rate", srOf(tops.bestBatter)],
                ]
              : [],
            "🏏"
          )}
          {perfCard(
            "Best Bowler",
            tops.bestBowler,
            tops.bestBowler
              ? [
                  ["Wickets", tops.bestBowler.wickets],
                  ["Runs", tops.bestBowler.runs],
                  ["Overs", `${Math.floor(tops.bestBowler.balls / 6)}.${tops.bestBowler.balls % 6}`],
                ]
              : [],
            "🎯"
          )}
        </div>
      )}

      {/* Innings scorecards */}
      {match.innings.map((inn, idx) => {
        const battingTeam = inn.battingTeam === "A" ? match.teamA : match.teamB;
        const st = inn.state;
        const yetToBat = battingTeam.players.filter((pid) => !st.batting.some((b) => b.player === pid));
        const oversAll = [...st.oversLog, ...(st.thisOver.length ? [st.thisOver] : [])];
        return (
          <section key={idx} className="mt-8">
            <h2 className="font-display text-2xl font-black italic text-white">
              {battingTeam.name} <span className="text-flood-500">innings</span>
              <span className="ml-3 text-lg text-ink-300">
                {st.runs}/{st.wickets} ({st.overs} ov)
              </span>
            </h2>

            <div className="mt-3 overflow-hidden rounded-3xl border border-ink-800 bg-ink-900/70">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-ink-800 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-500 sm:grid-cols-[1fr_120px_auto_auto_auto_auto]">
                <span>Batter</span>
                <span className="hidden sm:block">Dismissal</span>
                <span className="w-8 text-right">R</span>
                <span className="hidden w-8 text-right sm:block">B</span>
                <span className="hidden w-8 text-right sm:block">4s/6s</span>
                <span className="w-12 text-right">SR</span>
              </div>
              {st.batting.map((b) => (
                <div
                  key={b.player}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-ink-800/50 px-4 py-2.5 last:border-0 sm:grid-cols-[1fr_120px_auto_auto_auto_auto]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-white">
                      {nameOf(b.player)}
                      {st.strikerId === b.player && !b.out ? " *" : ""}
                    </span>
                    <span className="block truncate text-xs text-ink-400 sm:hidden">{dismissalText(b, nameOf)}</span>
                  </span>
                  <span className="hidden truncate text-xs text-ink-400 sm:block">{dismissalText(b, nameOf)}</span>
                  <span className="w-8 text-right font-display text-lg font-black italic text-white">{b.runs}</span>
                  <span className="hidden w-8 text-right text-ink-300 sm:block">{b.balls}</span>
                  <span className="hidden w-8 text-right text-ink-300 sm:block">
                    {b.fours}/{b.sixes}
                  </span>
                  <span className="w-12 text-right text-ink-300">{srOf(b)}</span>
                </div>
              ))}
              {yetToBat.length > 0 && (
                <p className="px-4 py-2.5 text-xs text-ink-500">
                  Yet to bat: {yetToBat.map(nameOf).join(", ")}
                </p>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-ink-800 bg-ink-900/70">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-ink-800 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <span>Bowler</span>
                <span className="w-10 text-right">O</span>
                <span className="w-10 text-right">R</span>
                <span className="w-10 text-right">W</span>
              </div>
              {st.bowling.map((bw) => (
                <div
                  key={bw.player}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-ink-800/50 px-4 py-2.5 last:border-0"
                >
                  <span className="truncate font-semibold text-white">{nameOf(bw.player)}</span>
                  <span className="w-10 text-right text-ink-300">
                    {Math.floor(bw.balls / 6)}.{bw.balls % 6}
                  </span>
                  <span className="w-10 text-right text-ink-300">{bw.runs}</span>
                  <span className="w-10 text-right font-display text-lg font-black italic text-white">{bw.wickets}</span>
                </div>
              ))}
            </div>

            {oversAll.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {oversAll.map((over, oi) => (
                  <div key={oi} className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="w-14 shrink-0 font-semibold text-ink-400">Over {oi + 1}</span>
                    {over.map((chip, ci) => (
                      <span
                        key={ci}
                        className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold ring-1 ${
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
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
