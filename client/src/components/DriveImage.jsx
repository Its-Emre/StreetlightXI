import { useState } from "react";
import { mediaThumbUrl } from "../lib/api";

// Drive artwork with a safety net, in order:
//   1. Our server's cached proxy (reliable — Drive throttles browsers)
//   2. The direct Drive thumbnail URL
//   3. The direct googleusercontent form of the same thumbnail
//   4. A branded placeholder with the player's initial
export default function DriveImage({ driveId, src, alt, className, size = 800 }) {
  const [stage, setStage] = useState(0);

  const stages = [];
  if (driveId) stages.push(mediaThumbUrl(driveId, size));
  if (src) stages.push(src);
  if (driveId) stages.push(`https://lh3.googleusercontent.com/d/${driveId}=w${size}`);

  if (!driveId && !src) {
    return (
      <div className={`flex items-center justify-center bg-ink-800 ${className || ""}`}>
        <span className="font-display text-5xl font-black italic text-flood-500/40">
          {(alt || "X").charAt(0)}
        </span>
      </div>
    );
  }

  if (stage >= stages.length) {
    return (
      <div className={`flex items-center justify-center bg-ink-800 ${className || ""}`}>
        <span className="font-display text-5xl font-black italic text-flood-500/40">
          {(alt || "X").charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={stages[stage]}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setStage((s) => s + 1)}
    />
  );
}
