# Streetlight XI

**The game begins when the lights come on.**

A private web app for one gully cricket group: **player cards** with editable
career stats, **leaderboards**, and a **team maker** (captains' snake draft or
one-tap auto-balance). An IPL-style **Auction Room** arrives in Sprint 2.

Access is invite-only: registration requires the group's code, and every card
belongs to the group.

**Status:** Sprint 1 — core app (auth, player cards, leaderboards, team maker).

## Features (Sprint 1)

- Invite-gated accounts (JWT auth; registration needs the group code)
- Player cards — photo (Google Drive), role, career stats — with a computed
  **rating**: `points = runs + 25·wickets + 10·catches`, scaled per match into
  a 45–99 band (players with no matches are "NEW"). The group's top-rated
  player wears the **gold frame**
- Stats are edited directly on the card — deliberately **no match-record
  entry**: the group shouldn't do homework after a game
- Home leaderboards: most runs, most wickets, safest hands
- **Team maker**: pick today's squad, then either a captains' **snake draft**
  (alternating picks, live strength totals, undo/reset) or **auto-balance**
  (strongest-first snake deal by rating)
- Drive artwork is served through a small server-side caching proxy —
  Drive's thumbnail endpoints rate-limit direct browser traffic (HTTP 429)

## Roadmap

- **Sprint 2 — Auction Room:** equal purses, base prices set by card ratings,
  live bidding on phones, Big Screen Mode, Right-to-Match cards; sold prices
  land on the player cards
- **Sprint 3 — Deploy + story layer:** Render/Vercel launch; season mode,
  nemesis board, awards night

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
