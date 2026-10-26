import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PlayerCard from "../components/PlayerCard";

function StatBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/70 px-4 py-4 text-center">
      <div className="font-display text-3xl font-black italic text-white">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">{label}</div>
    </div>
  );
}

export default function PlayerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPlayer(id)
      .then(({ player }) => setPlayer(player))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
        <Link to="/players" className="mt-4 inline-block text-sm text-flood-400 hover:text-flood-300">
          ← Back to the squad
        </Link>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="shimmer aspect-[3/4] max-w-xs rounded-2xl" />
      </div>
    );
  }

  const s = player.stats || {};
  const mine = player.createdBy && user && player.createdBy.id === user.id;
  const runsPerMatch = s.matches > 0 ? (s.runs / s.matches).toFixed(1) : "—";

  const onDelete = async () => {
    if (!window.confirm(`Delete ${player.name}'s card? This cannot be undone.`)) return;
    try {
      await api.deletePlayer(player._id);
      navigate("/players");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <Link to="/players" className="text-sm text-ink-300 hover:text-white">
        ← All players
      </Link>

      <div className="fade-up mt-5 grid gap-8 md:grid-cols-[320px_1fr]">
        <div className="mx-auto w-full max-w-xs md:mx-0">
          <PlayerCard player={player} />
        </div>

        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-4xl font-black uppercase italic text-white">{player.name}</h1>
              <p className="mt-1 text-sm text-ink-300">
                {player.role} · added by {player.createdBy?.name || "the group"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/players/${player._id}/edit`}
                className="rounded-full bg-flood-500 px-4 py-2 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400"
              >
                EDIT CARD
              </Link>
              {mine && (
                <button
                  onClick={onDelete}
                  className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatBox label="Rating" value={player.rating ?? "NEW"} />
            <StatBox label="Matches" value={s.matches || 0} />
            <StatBox label="Runs" value={s.runs || 0} />
            <StatBox label="Highest score" value={s.highestScore || 0} />
            <StatBox label="Wickets" value={s.wickets || 0} />
            <StatBox label="Catches" value={s.catches || 0} />
          </div>

          <p className="mt-5 text-sm leading-relaxed text-ink-300">
            Scores <span className="font-semibold text-white">{runsPerMatch}</span> runs per match
            across his career under the lights. The rating blends runs, wickets and catches per
            match — the same number that will set his auction base price when the Auction Room
            opens.
          </p>
        </div>
      </div>
    </div>
  );
}
