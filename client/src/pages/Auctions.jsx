import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const STATUS = {
  setup: { label: "Setting up", cls: "bg-ink-700 text-ink-100" },
  live: { label: "● LIVE", cls: "bg-red-500 text-white" },
  done: { label: "Finished", cls: "bg-pitch-500/20 text-pitch-400 ring-1 ring-pitch-500/40" },
};

export default function Auctions() {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [purse, setPurse] = useState(1000);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .listAuctions()
      .then(({ auctions }) => setAuctions(auctions))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { auction } = await api.createAuction({ name: name.trim(), purse: Number(purse) });
      navigate(`/auctions/${auction.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="font-display text-4xl font-black italic text-white">
        Auction <span className="text-flood-500">Room</span> 🔨
      </h1>
      <p className="mt-1.5 max-w-xl text-sm text-ink-300">
        One purse each, base prices set by the cards' ratings, and the hammer in the
        auctioneer's hand. Host a night, invite the captains, sell the street.
      </p>

      {/* Create */}
      <form
        onSubmit={create}
        className="fade-up mt-8 flex flex-wrap items-end gap-3 rounded-3xl border border-ink-800 bg-ink-900/70 p-5"
      >
        <div className="min-w-52 flex-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-300">
            Auction name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Season 1 Mega Auction"
            className="mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-white outline-none transition focus:border-flood-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-300">
            Purse per team (coins)
          </label>
          <div className="mt-1.5 flex gap-2">
            {[500, 1000, 2000].map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPurse(p)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  Number(purse) === p
                    ? "bg-flood-500 font-bold text-ink-950"
                    : "border border-ink-700 text-ink-300 hover:border-ink-500 hover:text-white"
                }`}
              >
                🪙{p}
              </button>
            ))}
            <input
              type="number"
              min="100"
              step="50"
              value={purse}
              onChange={(e) => setPurse(e.target.value)}
              className="w-24 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2 text-white outline-none transition focus:border-flood-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-flood-500 px-6 py-2.5 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400 disabled:opacity-60"
        >
          {busy ? "Creating..." : "HOST AUCTION"}
        </button>
      </form>

      {error && (
        <p className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
      )}

      {/* List */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {auctions === null &&
          !error &&
          [0, 1, 2].map((i) => <div key={i} className="shimmer h-36 rounded-3xl" />)}
        {auctions &&
          auctions.map((a) => {
            const st = STATUS[a.status] || STATUS.setup;
            return (
              <Link
                key={a.id}
                to={`/auctions/${a.id}`}
                className="group rounded-3xl border border-ink-800 bg-ink-900/70 p-5 transition hover:border-flood-500/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-black italic leading-tight text-white group-hover:text-flood-300">
                    {a.name}
                  </h2>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-300">
                  Purse 🪙{a.purse} · {a.teamCount} teams · {a.soldCount} sold
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {new Date(a.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </Link>
            );
          })}
      </div>

      {auctions && auctions.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-ink-700 bg-ink-900/60 px-6 py-12 text-center">
          <div className="text-4xl">🔨</div>
          <p className="mt-3 text-ink-300">
            No auction night yet. Host the first one above — the group will lose its mind.
          </p>
        </div>
      )}
    </div>
  );
}
