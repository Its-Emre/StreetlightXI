import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, parseDriveIdClient, thumbUrl } from "../lib/api";
import DriveImage from "../components/DriveImage";
import { useSettings } from "../context/SettingsContext";

const ROLES = ["Batter", "Bowler", "All-Rounder", "Wicket-Keeper"];

// Client mirror of the server rating formula, for the live preview.
function ratingPreview(stats) {
  const matches = Number(stats.matches) || 0;
  if (matches <= 0) return null;
  const points =
    (Number(stats.runs) || 0) +
    25 * (Number(stats.wickets) || 0) +
    10 * (Number(stats.catches) || 0);
  return Math.round(45 + Math.min(points / matches, 54));
}

const inputCls =
  "mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-white outline-none transition focus:border-flood-500";
const labelCls = "text-xs font-semibold uppercase tracking-wider text-ink-300";

export default function PlayerForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [name, setName] = useState("");
  const [role, setRole] = useState("All-Rounder");
  const [photoLink, setPhotoLink] = useState("");
  const [existingPhotoId, setExistingPhotoId] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [stats, setStats] = useState({
    matches: "",
    runs: "",
    highestScore: "",
    wickets: "",
    catches: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    api
      .getPlayer(id)
      .then(({ player }) => {
        setName(player.name);
        setRole(player.role);
        setExistingPhotoId(player.photoDriveId || "");
        const s = player.stats || {};
        setStats({
          matches: s.matches ?? "",
          runs: s.runs ?? "",
          highestScore: s.highestScore ?? "",
          wickets: s.wickets ?? "",
          catches: s.catches ?? "",
        });
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, [id, editing]);

  const newPhotoId = useMemo(() => parseDriveIdClient(photoLink), [photoLink]);
  const linkTypedButInvalid = photoLink.trim() !== "" && !newPhotoId;
  const previewPhotoId = newPhotoId || (!removePhoto ? existingPhotoId : "");
  const rating = useMemo(() => ratingPreview(stats), [stats]);

  const setStat = (key) => (e) => setStats((s) => ({ ...s, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (linkTypedButInvalid) {
      setError("That photo link doesn't look like a Google Drive link.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const payload = { name: name.trim(), role, stats };
      if (newPhotoId) payload.photoLink = photoLink.trim();
      else if (removePhoto) payload.photoLink = "";
      if (editing) {
        await api.updatePlayer(id, payload);
        navigate(`/players/${id}`);
      } else {
        const { player } = await api.createPlayer(payload);
        navigate(`/players/${player._id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="shimmer h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Link to="/players" className="text-sm text-ink-300 hover:text-white">
        ← All players
      </Link>
      <h1 className="mt-3 font-display text-4xl font-black italic text-white">
        {editing ? "Edit" : "Add"} <span className="text-flood-500">Player</span>
      </h1>
      <p className="mt-1.5 max-w-xl text-sm text-ink-300">
        Stats live right on the card — update them whenever the group agrees the numbers
        moved. Anyone in the group can edit any card.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>Player name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="EMRE" />
          </div>

          <div>
            <label className={labelCls}>Role</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
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
          </div>

          <div>
            <label className={labelCls}>Photo — Google Drive link</label>
            <input
              value={photoLink}
              onChange={(e) => setPhotoLink(e.target.value)}
              className={inputCls}
              placeholder="https://drive.google.com/file/d/…/view"
            />
            {linkTypedButInvalid && (
              <p className="mt-1.5 text-xs text-red-300">
                That link isn't recognised — paste the file's Drive link, or leave it empty.
              </p>
            )}
            <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
              In Drive, set the photo to <span className="text-ink-300">"Anyone with the link"</span>,
              copy its link and paste it here.
              {editing && existingPhotoId && !removePhoto && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setRemovePhoto(true)}
                    className="font-medium text-red-300 hover:text-red-200"
                  >
                    Remove current photo
                  </button>
                </>
              )}
              {removePhoto && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setRemovePhoto(false)}
                    className="font-medium text-flood-400 hover:text-flood-300"
                  >
                    Keep the photo instead
                  </button>
                </>
              )}
            </p>
          </div>

          <fieldset>
            <legend className={labelCls}>Career stats</legend>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["matches", "Matches"],
                ["runs", "Runs"],
                ["highestScore", "Highest score"],
                ["wickets", "Wickets"],
                ["catches", "Catches"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-ink-300">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={stats[key]}
                    onChange={setStat(key)}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
              ))}
              {settings.ratings !== false && (
                <div className="flex items-end pb-1">
                  <p className="text-sm text-ink-300">
                    Rating preview:{" "}
                    <span className="font-display text-xl font-black italic text-flood-400">
                      {rating ?? "NEW"}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </fieldset>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300 ring-1 ring-red-500/30">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-flood-500 px-8 py-3 font-display text-base font-black italic text-ink-950 transition hover:bg-flood-400 disabled:opacity-60"
          >
            {busy ? "Saving..." : editing ? "SAVE THE CARD" : "PUT HIM ON THE WALL"}
          </button>
        </form>

        {/* Live preview */}
        <div>
          <p className={labelCls}>Card preview</p>
          <div className="relative mt-2 aspect-[3/4] overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
            <DriveImage
              driveId={previewPhotoId}
              src={previewPhotoId ? thumbUrl(previewPhotoId, 800) : null}
              alt={name || "Player"}
              size={800}
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
            {settings.ratings !== false && (
              <div className="absolute left-3.5 top-3.5">
                <div className="font-display text-4xl font-black italic text-white">{rating ?? "—"}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">
                  {rating ? "Rating" : "New player"}
                </div>
              </div>
            )}
            <div className="absolute inset-x-3.5 bottom-3.5">
              <div className="truncate font-display text-xl font-black uppercase italic text-white">
                {name || "Player name"}
              </div>
              <div className="text-xs text-ink-300">{role}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            The rating is computed from the stats — runs, wickets and catches, per match.
          </p>
        </div>
      </div>
    </div>
  );
}
