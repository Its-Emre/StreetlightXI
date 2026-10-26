import { Link } from "react-router-dom";
import DriveImage from "./DriveImage";
import { thumbUrl } from "../lib/api";
import { useSettings } from "../context/SettingsContext";

export const ROLE_SHORT = {
  Batter: "BAT",
  Bowler: "BOWL",
  "All-Rounder": "AR",
  "Wicket-Keeper": "WK",
};

// The player card — the heart of Streetlight XI. Styled like a premium
// game card: big rating, role tag, photo under a floodlight gradient,
// and a stat strip. The group's top-rated player gets the gold frame.
export default function PlayerCard({ player, golden = false }) {
  const { settings } = useSettings();
  const showGolden = golden && settings.goldenFrame !== false;
  const s = player.stats || {};
  const frame = showGolden
    ? "bg-gradient-to-b from-flood-300 via-flood-500 to-flood-600 p-[2px] shadow-[0_0_32px_rgba(245,185,33,0.25)]"
    : "bg-ink-700 p-px";

  return (
    <Link to={`/players/${player._id}`} className="group block">
      <div className={`rounded-[1.15rem] ${frame} transition duration-300 group-hover:-translate-y-1`}>
        <div className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-[1.05rem] bg-ink-900">
          {/* Photo */}
          <div className="absolute inset-0">
            <DriveImage
              driveId={player.photoDriveId}
              src={player.photoDriveId ? thumbUrl(player.photoDriveId, 800) : null}
              alt={player.name}
              size={800}
              className="h-full w-full object-cover object-top opacity-90 transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-flood-500/10 via-transparent to-pitch-500/10" />
          </div>

          {/* Rating + role */}
          <div className="relative flex items-start justify-between p-3.5">
            <div>
              {settings.ratings !== false && (
                <>
                  <div
                    className={`font-display text-4xl font-black italic leading-none ${
                      showGolden ? "text-flood-400" : "text-white"
                    }`}
                  >
                    {player.rating ?? "—"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">
                    {player.rating ? "Rating" : "New player"}
                  </div>
                </>
              )}
              <div className="mt-2 inline-block rounded-md bg-ink-950/70 px-2 py-0.5 font-display text-xs font-bold italic tracking-wide text-flood-300 ring-1 ring-flood-500/40">
                {ROLE_SHORT[player.role] || "AR"} · {player.role}
              </div>
            </div>
            {showGolden && (
              <span className="rounded-full bg-flood-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-ink-950">
                ★ Golden
              </span>
            )}
          </div>

          {/* Name + stats */}
          <div className="relative mt-auto p-3.5 pt-0">
            {player.auctionTag && settings.soldTags !== false && (
              <div className="mb-2 inline-block max-w-full truncate rounded-md bg-flood-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink-950">
                Sold 🪙{player.auctionTag.price} · {player.auctionTag.teamName}
              </div>
            )}
            <h3 className="truncate font-display text-xl font-black uppercase italic leading-tight text-white">
              {player.name}
            </h3>
            <div className="mt-2 grid grid-cols-3 divide-x divide-ink-700 rounded-lg bg-ink-950/70 py-2 text-center ring-1 ring-ink-700/60 backdrop-blur-sm">
              <div>
                <div className="font-display text-base font-bold text-white">{s.runs || 0}</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">Runs</div>
              </div>
              <div>
                <div className="font-display text-base font-bold text-white">{s.wickets || 0}</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">Wkts</div>
              </div>
              <div>
                <div className="font-display text-base font-bold text-white">{s.highestScore || 0}</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">Best</div>
              </div>
            </div>
            <div className="mt-2 text-center text-[11px] text-ink-300">
              {s.matches || 0} matches · {s.catches || 0} catches
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
