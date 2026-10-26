import { computeRating } from "./rating.js";

// Auction money — "coins". Base prices come straight from the card
// rating, so nobody can argue about who is worth what:
//
//   base = max(20, rating * 2), rounded to the nearest 5
//
// A 45-rated newcomer starts at 90, a 99-rated legend at 200. Unrated
// players price like the floor (45). With a default 1000-coin purse,
// a captain can chase 2-3 stars or build deep — real auction tension.

const round5 = (n) => Math.round(n / 5) * 5;

export function basePriceFor(player) {
  const rating = computeRating(player?.stats) ?? 45;
  return Math.max(20, round5(rating * 2));
}

export const MIN_INCREMENT = 5;
export const DEFAULT_PURSE = 1000;
