import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import PlayerCard from "../components/PlayerCard";

const ROLE_FILTERS = ["All", "Batter", "Bowler", "All-Rounder", "Wicket-Keeper"];

export default function Players() {
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All");

  useEffect(() => {
    api
      .listPlayers()
      .then(({ players }) => setPlayers(players))
      .catch((e) => setError(e.message));
  }, []);

  const goldenId = useMemo(() => {
    const rated = (players || []).filter((p) => p.rating != null);
    return rated.length ? rated[0]._id : null; // list arrives best-rated first
  }, [players]);

  const visible = (players || []).filter((p) => {
    if (role !== "All" && p.role !== role) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black italic text-white">
            The <span className="text-flood-500">Squad</span>
          </h1>
          <p className="mt-1 text-sm text-ink-300">
            Every legend of the street, on one wall. Best rated wears the gold frame.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a player…"
          className="w-full max-w-xs rounded-full border border-ink-700 bg-ink-850 px-4 py-2 text-sm text-white outline-none transition focus:border-flood-500 sm:w-64"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              role === r
                ? "bg-flood-500 font-bold text-ink-950"
                : "border border-ink-700 text-ink-300 hover:border-ink-500 hover:text-white"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
      )}

      {players === null && !error && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shimmer aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      )}

      {players && visible.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-ink-700 bg-ink-900/60 px-6 py-12 text-center">
          <p className="text-ink-300">
            {players.length === 0
              ? "No players yet."
              : "No player matches that search."}
          </p>
          {players.length === 0 && (
            <Link
              to="/players/new"
              className="mt-4 inline-block rounded-full bg-flood-500 px-5 py-2 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400"
            >
              + ADD THE FIRST PLAYER
            </Link>
          )}
        </div>
      )}

      {visible.length > 0 && (
        <div className="fade-up mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => (
            <PlayerCard key={p._id} player={p} golden={p._id === goldenId} />
          ))}
        </div>
      )}
    </div>
  );
}
