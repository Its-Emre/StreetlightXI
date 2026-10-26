import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, basePricePreview, thumbUrl } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import DriveImage from "../components/DriveImage";

export default function AuctionRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const [auction, setAuction] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [teamName, setTeamName] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const { auction } = await api.getAuction(id);
      setAuction(auction);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    api.listPlayers().then(({ players }) => setPlayers(players)).catch(() => {});
    const t = setInterval(() => {
      if (!busyRef.current) refresh();
    }, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  // Re-fetch players when sales happen so card tags stay fresh here too.
  const soldCount = auction?.results?.length || 0;
  useEffect(() => {
    if (soldCount > 0) {
      api.listPlayers().then(({ players }) => setPlayers(players)).catch(() => {});
    }
  }, [soldCount]);

  const act = async (fn, successMsg) => {
    setBusy(true);
    busyRef.current = true;
    setError("");
    try {
      const res = await fn();
      if (res?.auction) setAuction(res.auction);
      if (successMsg) {
        setNotice(successMsg);
        setTimeout(() => setNotice(""), 4000);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };

  const playerById = useMemo(
    () => Object.fromEntries(players.map((p) => [p._id, p])),
    [players]
  );

  if (!auction) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {error ? (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
        ) : (
          <div className="shimmer h-96 rounded-3xl" />
        )}
      </div>
    );
  }

  const isAuctioneer = user && auction.createdBy === user.id;
  const myTeam = auction.teams.find((t) => t.captain === user?.id);
  const lot = auction.currentLot;
  const lotPlayer = auction.currentPlayer;
  const minNext = lot ? (lot.currentBid ? lot.currentBid + 5 : lot.basePrice) : 0;
  const iLead = myTeam && lot?.leaderTeam === myTeam.id;
  const soldIds = new Set(auction.results.map((r) => String(r.player)));
  const unsoldIds = new Set((auction.unsoldIds || []).map(String));
  const lotCandidates = players.filter((p) => !soldIds.has(p._id));
  const mostExpensive = [...auction.results].sort((a, b) => b.price - a.price)[0];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Link to="/auctions" className="text-sm text-ink-300 hover:text-white">
        ← All auctions
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-black italic text-white">{auction.name}</h1>
          <p className="mt-1 text-sm text-ink-300">
            Purse 🪙{auction.purse} per team · hosted by {auction.createdByName || "the auctioneer"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {auction.status === "live" && (
            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">● LIVE</span>
          )}
          {auction.status === "setup" && (
            <span className="rounded-full bg-ink-700 px-3 py-1 text-xs font-bold text-ink-100">SETTING UP</span>
          )}
          {auction.status === "done" && (
            <span className="rounded-full bg-pitch-500/20 px-3 py-1 text-xs font-bold text-pitch-400 ring-1 ring-pitch-500/40">
              FINISHED
            </span>
          )}
          {isAuctioneer && auction.status === "live" && !lot && (
            <button
              disabled={busy}
              onClick={() => act(() => api.finishAuction(id), "Auction closed. What a night! 🔨")}
              className="rounded-full border border-ink-600 px-4 py-1.5 text-sm font-medium text-ink-100 transition hover:border-red-400 hover:text-red-300 disabled:opacity-60"
            >
              Finish auction
            </button>
          )}
        </div>
      </div>

      {notice && (
        <p className="fade-up mt-4 rounded-xl bg-pitch-500/10 px-4 py-3 text-sm font-medium text-pitch-400 ring-1 ring-pitch-500/30">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
      )}

      {/* RTM window */}
      {auction.rtmWindow && (
        <div className="fade-up mt-6 rounded-3xl border border-flood-500/60 bg-flood-500/10 px-6 py-5">
          <h2 className="font-display text-2xl font-black italic text-flood-400">⏸ RIGHT TO MATCH</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-100">
            <span className="font-semibold">{lot?.playerName}</span> was sold to{" "}
            <span className="font-semibold">{auction.rtmWindow.winnerTeamName}</span> for{" "}
            <span className="font-semibold">🪙{auction.rtmWindow.price}</span> — but{" "}
            <span className="font-semibold">{auction.rtmWindow.forTeamName}</span> held him last
            time. Their captain can match the price and take him back.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {myTeam && auction.rtmWindow.forTeam === myTeam.id && (
              <>
                <button
                  disabled={busy}
                  onClick={() => act(() => api.resolveRtm(id, "match"), "RTM matched! He's yours again. 🔙")}
                  className="rounded-xl bg-flood-500 px-5 py-2.5 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400 disabled:opacity-60"
                >
                  MATCH 🪙{auction.rtmWindow.price} — HE'S OURS
                </button>
                <button
                  disabled={busy}
                  onClick={() => act(() => api.resolveRtm(id, "pass"), "RTM passed.")}
                  className="rounded-xl border border-ink-600 px-5 py-2.5 text-sm font-medium text-ink-100 transition hover:border-ink-400 disabled:opacity-60"
                >
                  Let him go
                </button>
              </>
            )}
            {isAuctioneer && (
              <button
                disabled={busy}
                onClick={() => act(() => api.resolveRtm(id, "skip"), "RTM window skipped.")}
                className="rounded-xl border border-ink-600 px-5 py-2.5 text-sm font-medium text-ink-100 transition hover:border-ink-400 disabled:opacity-60"
              >
                Skip window (auctioneer)
              </button>
            )}
          </div>
        </div>
      )}

      {/* The stage */}
      <section className="flood-glow mt-6 overflow-hidden rounded-3xl border border-ink-800 bg-ink-900/70">
        {lot && lotPlayer ? (
          <div className="grid md:grid-cols-[300px_1fr]">
            <div className="relative min-h-64">
              <DriveImage
                driveId={lotPlayer.photoDriveId}
                src={lotPlayer.photoDriveId ? thumbUrl(lotPlayer.photoDriveId, 800) : null}
                alt={lotPlayer.name}
                size={800}
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-ink-900/40" />
              <div className="absolute left-4 top-4 rounded-lg bg-ink-950/75 px-2.5 py-1 font-display text-2xl font-black italic text-white">
                {lotPlayer.rating ?? "NEW"}
              </div>
            </div>
            <div className="p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-flood-400">
                On the block
              </p>
              <h2 className="mt-1 font-display text-4xl font-black uppercase italic text-white sm:text-5xl">
                {lot.playerName}
              </h2>
              <p className="mt-1 text-sm text-ink-300">
                {lotPlayer.role} · {lotPlayer.stats?.matches || 0} matches · {lotPlayer.stats?.runs || 0} runs ·{" "}
                {lotPlayer.stats?.wickets || 0} wickets
              </p>
              <div className="mt-5 flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">Base price</div>
                  <div className="font-display text-2xl font-bold text-ink-100">🪙{lot.basePrice}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">Current bid</div>
                  <div className="font-display text-5xl font-black italic text-flood-400">
                    {lot.currentBid ? `🪙${lot.currentBid}` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">Leading</div>
                  <div className="font-display text-2xl font-bold text-white">
                    {lot.leaderTeamName || "No bids yet"}
                  </div>
                </div>
              </div>

              {/* Bid panel */}
              {myTeam && auction.status === "live" && !auction.rtmWindow && (
                <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-950/60 p-4">
                  {iLead ? (
                    <p className="font-display text-lg font-black italic text-pitch-400">
                      🎉 Your team is leading — purse left 🪙{myTeam.purseLeft}
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {[minNext, minNext + 20, minNext + 45].map((amt) => (
                          <button
                            key={amt}
                            disabled={busy || amt > myTeam.purseLeft}
                            onClick={() => act(() => api.placeBid(id, amt), `Bid placed: 🪙${amt}`)}
                            className="rounded-xl bg-flood-500 px-4 py-2.5 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400 disabled:opacity-40"
                          >
                            BID 🪙{amt}
                          </button>
                        ))}
                        <span className="text-sm text-ink-300">
                          Purse left: <span className="font-semibold text-white">🪙{myTeam.purseLeft}</span>
                        </span>
                      </div>
                      <form
                        className="mt-3 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          act(() => api.placeBid(id, Number(bidAmount)), `Bid placed: 🪙${bidAmount}`);
                          setBidAmount("");
                        }}
                      >
                        <input
                          type="number"
                          min={minNext}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={`Custom — min 🪙${minNext}`}
                          className="w-48 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2 text-white outline-none transition focus:border-flood-500"
                        />
                        <button
                          type="submit"
                          disabled={busy || !bidAmount}
                          className="rounded-xl border border-flood-500 px-4 py-2 font-display text-sm font-black italic text-flood-400 transition hover:bg-flood-500 hover:text-ink-950 disabled:opacity-40"
                        >
                          BID
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}
              {!myTeam && auction.status === "live" && (
                <p className="mt-6 text-sm text-ink-500">
                  Join as a team below to bid — spectators watch free. 👀
                </p>
              )}

              {/* Auctioneer hammer */}
              {isAuctioneer && auction.status === "live" && !auction.rtmWindow && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    disabled={busy || !lot.currentBid}
                    onClick={() => act(() => api.sellLot(id), `SOLD! ${lot.playerName} goes for 🪙${lot.currentBid} 🔨`)}
                    className="rounded-xl bg-red-500 px-6 py-3 font-display text-base font-black italic text-white transition hover:bg-red-400 disabled:opacity-40"
                  >
                    🔨 SOLD{lot.currentBid ? ` — 🪙${lot.currentBid}` : ""}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act(() => api.unsoldLot(id), `${lot.playerName} stays unsold — for now.`)}
                    className="rounded-xl border border-ink-600 px-5 py-3 text-sm font-medium text-ink-100 transition hover:border-ink-400 disabled:opacity-60"
                  >
                    Pass as unsold
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            {auction.status === "setup" && (
              <>
                <div className="text-4xl">🛎️</div>
                <h2 className="mt-3 font-display text-2xl font-black italic text-white">The room is filling up</h2>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-300">
                  Teams join below. The auctioneer starts the night once at least two teams are in.
                </p>
                {isAuctioneer && (
                  <button
                    disabled={busy || auction.teams.length < 2}
                    onClick={() => act(() => api.startAuction(id), "The auction is LIVE! 🔴")}
                    className="mt-5 rounded-xl bg-flood-500 px-6 py-3 font-display text-base font-black italic text-ink-950 transition hover:bg-flood-400 disabled:opacity-40"
                  >
                    START THE AUCTION ({auction.teams.length} teams)
                  </button>
                )}
              </>
            )}
            {auction.status === "live" && (
              <>
                <div className="text-4xl">🔨</div>
                <h2 className="mt-3 font-display text-2xl font-black italic text-white">
                  {auction.rtmWindow ? "RTM decision pending…" : "Next lot, please…"}
                </h2>
                {isAuctioneer && !auction.rtmWindow && (
                  <button
                    disabled={busy}
                    onClick={() => act(() => api.nextLot(id))}
                    className="mt-5 rounded-xl bg-flood-500 px-6 py-3 font-display text-base font-black italic text-ink-950 transition hover:bg-flood-400 disabled:opacity-60"
                  >
                    BRING THE NEXT PLAYER (AUTO)
                  </button>
                )}
              </>
            )}
            {auction.status === "done" && (
              <>
                <div className="text-4xl">🏆</div>
                <h2 className="mt-3 font-display text-2xl font-black italic text-white">Auction night is history</h2>
                {mostExpensive && (
                  <p className="mt-1.5 text-sm text-ink-300">
                    Biggest buy: <span className="font-semibold text-flood-400">{mostExpensive.playerName}</span>{" "}
                    — 🪙{mostExpensive.price} to {mostExpensive.teamName}. The squads are below;
                    every price now lives on the player cards.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Auctioneer lot picker */}
      {isAuctioneer && auction.status === "live" && !lot && !auction.rtmWindow && lotCandidates.length > 0 && (
        <section className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ink-300">
            Or pick who's next
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {lotCandidates.map((p) => (
              <button
                key={p._id}
                disabled={busy}
                onClick={() => act(() => api.nextLot(id, p._id))}
                className="rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2 text-left text-sm transition hover:border-flood-500 disabled:opacity-60"
              >
                <span className="font-medium text-white">{p.name}</span>{" "}
                <span className="text-xs text-ink-500">base 🪙{basePricePreview(p)}</span>
                {unsoldIds.has(p._id) && (
                  <span className="ml-1.5 rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-bold text-ink-100">
                    2ND CHANCE
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Teams */}
      <section className="mt-8">
        <h3 className="font-display text-xl font-black uppercase italic text-white">
          Teams & <span className="text-flood-500">squads</span>
        </h3>
        {!myTeam && auction.status !== "done" && (
          <form
            className="mt-4 flex flex-wrap gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => api.createTeam(id, { name: teamName.trim() }), "Team joined — good luck, captain! 🧢");
              setTeamName("");
            }}
          >
            <input
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Your team name — e.g. Street Kings"
              className="w-72 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-white outline-none transition focus:border-flood-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-flood-500 px-5 py-2.5 font-display text-sm font-black italic text-ink-950 transition hover:bg-flood-400 disabled:opacity-60"
            >
              JOIN AS A TEAM
            </button>
          </form>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {auction.teams.map((t) => (
            <div key={t.id} className="rounded-2xl border border-ink-800 bg-ink-900/70 p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-display text-lg font-black italic text-white">{t.name}</h4>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    t.rtmUsed ? "bg-ink-700 text-ink-300" : "bg-flood-500/15 text-flood-400 ring-1 ring-flood-500/40"
                  }`}
                >
                  RTM {t.rtmUsed ? "USED" : "IN HAND"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">Captain: {t.captainName}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full bg-gradient-to-r from-flood-600 to-flood-400"
                  style={{ width: `${Math.max(0, (t.purseLeft / auction.purse) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-sm text-ink-300">
                Purse left <span className="font-display font-bold text-white">🪙{t.purseLeft}</span> · spent
                🪙{t.spent}
              </p>
              {t.squad.length > 0 ? (
                <ul className="mt-3 space-y-1.5 border-t border-ink-800 pt-3">
                  {t.squad.map((s) => (
                    <li key={String(s.player)} className="flex items-center justify-between text-sm">
                      <span className="text-ink-100">
                        {s.playerName}
                        {s.viaRtm && <span className="ml-1.5 text-[10px] font-bold text-flood-400">RTM</span>}
                      </span>
                      <span className="font-display font-bold text-flood-400">🪙{s.price}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 border-t border-ink-800 pt-3 text-sm text-ink-500">No players yet.</p>
              )}
            </div>
          ))}
          {auction.teams.length === 0 && (
            <p className="text-sm text-ink-500">No teams yet — be the first captain in.</p>
          )}
        </div>
      </section>

      {/* Bid feed + unsold */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900/70">
          <h3 className="border-b border-ink-800 px-4 py-3 font-display text-sm font-black uppercase italic text-white">
            📣 Bid feed
          </h3>
          {auction.bids.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-500">No bids yet — the room is holding its breath.</p>
          ) : (
            <ul className="divide-y divide-ink-800">
              {auction.bids.slice(0, 10).map((b, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-ink-100">
                    <span className="font-semibold">{b.teamName}</span> · {b.playerName}
                  </span>
                  <span className="font-display font-bold text-flood-400">🪙{b.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900/70">
          <h3 className="border-b border-ink-800 px-4 py-3 font-display text-sm font-black uppercase italic text-white">
            🧊 Unsold (so far)
          </h3>
          {(auction.unsoldIds || []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-500">Nobody has been passed over yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2 px-4 py-4">
              {(auction.unsoldIds || []).map((pid) => (
                <span key={String(pid)} className="rounded-full bg-ink-800 px-3 py-1 text-sm text-ink-100">
                  {playerById[String(pid)]?.name || "Player"}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
