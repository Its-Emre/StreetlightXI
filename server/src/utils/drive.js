// Google Drive link helpers.
//
// Streetlight XI is Drive-first (same pattern as Rewind): player photos
// stay in Google Drive and the app only stores the file ID. Playback is
// not needed here — photos are served through the server's caching
// media proxy because Drive's thumbnail endpoints rate-limit (HTTP 429)
// direct browser traffic.

// Accepts the common Drive link shapes and returns the file ID, or null
// when the input is not a Drive file reference:
//   https://drive.google.com/file/d/<ID>/view?usp=sharing
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?id=<ID>&export=download
//   <ID> (a bare ID, 25+ url-safe characters)
export function parseDriveId(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();

  const fileMatch = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (fileMatch) return fileMatch[1];

  const idParam = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idParam) return idParam[1];

  if (/^[a-zA-Z0-9_-]{25,}$/.test(s)) return s;

  return null;
}

export const driveThumbUrl = (driveId, size = 1000) =>
  `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`;
