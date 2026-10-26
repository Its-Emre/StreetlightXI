// Player rating — computed from card stats, never stored.
//
//   points    = runs + 25*wickets + 10*catches
//   perMatch  = points / matches
//   rating    = round(45 + min(perMatch, 54))   → a 45–99 band
//
// A single strong season of gully cricket lands a player in the 70s-90s;
// a ghost who never plays stays at the floor. Players with no matches
// are "NEW" (rating null) and count as the floor weight when teams are
// balanced. This same rating will set auction base prices in Sprint 2 —
// one formula, two jobs, no arguments about who is worth what.

export const UNRANKED_WEIGHT = 45;

export function computeRating(stats) {
  if (!stats || !stats.matches || stats.matches <= 0) return null;
  const points =
    (stats.runs || 0) + 25 * (stats.wickets || 0) + 10 * (stats.catches || 0);
  const perMatch = points / stats.matches;
  return Math.round(45 + Math.min(perMatch, 54));
}

export function balanceWeight(stats) {
  return computeRating(stats) ?? UNRANKED_WEIGHT;
}
