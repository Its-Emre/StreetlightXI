import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import PlayerCard from "../components/PlayerCard";
import { useSettings } from "../context/SettingsContext";

function BoardRow({ rank, player, value, label }) {
  return (
    <Link
      to={`/players/${player._id}`}
      className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-ink-800/60"
    >
      <span
        className={`w-6 text-center font-display text-lg font-black italic ${
          rank === 1 ? "text-flood-400" : "text-ink-500"
        }`}
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-white">{player.name}</span>
      <span className="text-xs uppercase tracking-wider text-ink-500">{label}</span>
      <span className="font-display text-lg font-bold text-white">{value}</span>
    </Link>
  );
}

function Board({ title, icon, players, pick, label }) {
  const rows = [...players]
    .filter((p) => pick(p) > 0)
    .sort((a, b) => pick(b) - pick(a))
    .slice(0, 5);
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900/70">
      <h3 className="border-b border-ink-800 px-4 py-3 font-display text-sm font-black uppercase italic tracking-wide text-white">
        {icon} {title}
      </h3>
      {rows.length === 0 ? (
        <p className="px-4 py-5 text-sm text-ink-500">No stats yet — add them on a player card.</p>
      ) : (
        <div className="divide-y divide-ink-800">
          {rows.map((p, i) => (
            <BoardRow key={p._id} rank={i + 1} player={p} value={pick(p)} label={label} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { settings } = useSettings();
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listPlayers()
      .then(({ players }) => setPlayers(players))
      .catch((e) => setError(e.message));
  }, []);

  const totals = (players || []).reduce(
    (acc, p) => ({
      runs: acc.runs + (p.stats?.runs || 0),
      wickets: acc.wickets + (p.stats?.wickets || 0),
      matches: acc.matches + (p.stats?.matches || 0),
    }),
    { runs: 0, wickets: 0, matches: 0 }
  );
  const topRated = (players || []).filter((p) => p.rating != null).slice(0, 4);
  const golden = (players || []).find((p) => p.rating != null);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      {/* Hero */}
      <section className="flood-glow -mx-4 px-4 pb-8 pt-10 sm:-mx-6 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-flood-400">
          Your gully. Your league.
        </p>
        <h1 className="mt-2 font-display text-5xl font-black italic leading-[0.95] tracking-tight text-white sm:text-6xl">
          The game begins
          <br />
          when the lights <span className="text-flood-500">come on.</span>
        </h1>
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="font-display text-2xl font-black text-white">{players?.length ?? "—"}</span>{" "}
            <span className="text-ink-300">players</span>
          </div>
          <div>
            <span className="font-display text-2xl font-black text-white">{totals.runs}</span>{" "}
            <span className="text-ink-300">career runs</span>
          </div>
          <div>
            <span className="font-display text-2xl font-black text-white">{totals.wickets}</span>{" "}
            <span className="text-ink-300">wickets</span>
          </div>
          <div className="flex gap-2.5">
            <Link
              to="/teams"
              className="rounded-full bg-flood-500 px-5 py-2 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400"
            >
              MAKE TEAMS →
            </Link>
            <Link
              to="/players/new"
              className="rounded-full border border-ink-600 px-5 py-2 font-display text-sm font-bold italic text-white transition hover:border-flood-500 hover:text-flood-300"
            >
              + ADD PLAYER
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
      )}

      {players === null && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      )}

      {players && players.length === 0 && (
        <div className="fade-up rounded-3xl border border-dashed border-ink-700 bg-ink-900/60 px-6 py-14 text-center">
          <div className="text-5xl">🏏</div>
          <h2 className="mt-4 font-display text-2xl font-black italic text-white">The pitch is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">
            Add your group's first player card — name, role, a photo from Drive, and whatever
            stats you remember. The wall starts here.
          </p>
          <Link
            to="/players/new"
            className="mt-6 inline-block rounded-full bg-flood-500 px-6 py-2.5 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400"
          >
            + ADD THE FIRST PLAYER
          </Link>
        </div>
      )}

      {players && players.length > 0 && (
        <>
          {/* Auction Room banner */}
          <Link
            to="/auctions"
            className="fade-up mb-10 flex flex-wrap items-center gap-4 rounded-3xl border border-flood-500/40 bg-gradient-to-r from-flood-500/15 via-ink-900 to-ink-900 px-6 py-5 transition hover:border-flood-400"
          >
            <div className="text-4xl">🔨</div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-black italic text-white">
                The Auction Room is <span className="text-flood-400">open</span>
              </h2>
              <p className="text-sm text-ink-300">
                Equal purses, base prices set by ratings, live bidding from every phone.
                Auction night starts here.
              </p>
            </div>
            <span className="rounded-full bg-flood-500 px-5 py-2 font-display text-sm font-black italic text-ink-950">
              ENTER →
            </span>
          </Link>

          {/* Top rated cards */}
          <section className="fade-up">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-xl font-black uppercase italic text-white">
                Top of the <span className="text-flood-500">order</span>
              </h2>
              <Link to="/players" className="text-sm font-medium text-flood-400 hover:text-flood-300">
                All players →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {(topRated.length ? topRated : players.slice(0, 4)).map((p) => (
                <PlayerCard key={p._id} player={p} golden={golden && p._id === golden._id} />
              ))}
            </div>
          </section>

          {/* Leaderboards */}
          {settings.leaderboards !== false && (
            <section className="mt-10 grid gap-4 md:grid-cols-3">
              <Board title="Most Runs" icon="🏏" players={players} pick={(p) => p.stats?.runs || 0} label="runs" />
              <Board title="Most Wickets" icon="🎯" players={players} pick={(p) => p.stats?.wickets || 0} label="wkts" />
              <Board title="Safe Hands" icon="🧤" players={players} pick={(p) => p.stats?.catches || 0} label="catches" />
            </section>
          )}
        </>
      )}
    </div>
  );
}
