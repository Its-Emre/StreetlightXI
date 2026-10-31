# Streetlight XI

**The game begins when the lights come on.**

A private web app for one gully cricket group: **player cards** with editable
career stats, **leaderboards**, a **team maker** (captains' snake draft or
one-tap auto-balance), an IPL-style **Auction Room**, and a mobile-first
**Live Match Centre** — ball-by-ball scoring whose figures land on the
career cards by themselves.

Access is invite-only: registration requires the group's code, and every card
belongs to the group.

**Live:** https://streetlight-xi.vercel.app · API: https://streetlightxi.onrender.com

**Status:** Sprint 4 — Live Match Centre built (auth, cards, team maker, Auction Room, group settings, live scoring).

## Features

### Live Match Centre (Sprint 4)

- The full match day in one flow: pick both squads (or **auto-split by
  rating**), choose the overs, run an animated **coin toss**, set the
  openers — then score ball by ball
- An **event-sourced scoring engine**: each innings is stored as a ball
  event log and everything else is derived from it — which makes
  **Undo** trivial and the scoreboard free
- Scoring pad built for one thumb on a phone: 0–3 / 4 / 6, **wicket sheet**
  (how out, bowler credit, fielder — catches feed the career stat),
  wide and no-ball flows; strike rotation, over changes and the
  no-consecutive-overs rule are handled automatically
- **Live math**: CRR always; in a chase, the target, **RRR** and
  "need X off Y balls"; the chase ends the ball the target is crossed
- At full time the result is written and every figure is applied to the
  career cards **exactly once** — matches, runs, highest score, wickets,
  catches — so ratings and the next auction's base prices move on their own
- Every match is saved as a full **scoreboard**: batting and bowling
  cards, over-by-over ball log, and a top-performances hero (best batter
  and best bowler with photo and stat tiles)

### Auction Room (Sprint 2)

- Host an auction night: name + purse per team (coins); anyone joins as a
  team captain; the host runs the room as auctioneer
- **Base prices come from the ratings** — a 99-rated legend starts at 🪙200,
  a newcomer at 🪙90 — so nobody argues about worth
- Live bidding from every phone (quick bids or custom amounts, minimum
  increment 🪙5, purse enforced server-side), a big stage view with the
  current lot, and a live bid feed
- **Right to Match (RTM):** if a player sells to a new team, his former
  team (same name, RTM unused) can match the price and take him back
- Unsold players can be re-listed for a "second chance"; every sale stamps
  the player card — **SOLD 🪙price · Team** — and the profile

### Group Settings

- One settings page (⚙️ in the navbar) with group-wide switches that apply
  to every member instantly: **SOLD tags**, **golden frame**, **ratings**,
  **leaderboards**, and **RTM** in auctions

### Core (Sprint 1)

- Invite-gated accounts (JWT auth; registration needs the group code)
- Player cards — photo (Google Drive), role, career stats — with a computed
  **rating**: `points = runs + 25·wickets + 10·catches`, scaled per match into
  a 45–99 band (players with no matches are "NEW"). The group's top-rated
  player wears the **gold frame**
- Stats can be edited directly on the card — and since Sprint 4,
  live-scored matches add their figures to the cards automatically
- Home leaderboards: most runs, most wickets, safest hands
- **Team maker**: pick today's squad, then either a captains' **snake draft**
  (alternating picks, live strength totals, undo/reset) or **auto-balance**
  (strongest-first snake deal by rating)
- Drive artwork is served through a small server-side caching proxy —
  Drive's thumbnail endpoints rate-limit direct browser traffic (HTTP 429)

## Roadmap

- Season mode, nemesis board, awards night

## Stack

- **Client:** React 18, Vite, Tailwind CSS, React Router
- **Server:** Node.js, Express, Mongoose, JWT (bcryptjs)
- **Database:** MongoDB Atlas (database `streetlightxi`)
- **Photos:** Google Drive (link-shared files; only the file ID is stored)

## Local setup

### Server

```bash
cd server
cp .env.example .env   # fill MONGO_URI, JWT_SECRET, GROUP_CODE
npm install
npm run dev            # http://localhost:5000
```

### Client

```bash
cd client
npm install
npm run dev            # http://localhost:5173 (proxies /api to the server)
```

## Environment variables (server)

| Variable     | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `MONGO_URI`  | Atlas connection string (database `streetlightxi`) |
| `JWT_SECRET` | Secret used to sign login tokens                   |
| `GROUP_CODE` | Invite code required at registration               |
| `CLIENT_URL` | Client origin allowed by CORS                      |
| `PORT`       | API port (default 5000)                            |
