import { Auction, AuctionTeam } from "../models/Auction.js";
import Player from "../models/Player.js";
import { basePriceFor, MIN_INCREMENT, DEFAULT_PURSE } from "../utils/pricing.js";
import { computeRating } from "../utils/rating.js";

const teamView = (auction, team) => ({
  id: team._id,
  name: team.name,
  captain: team.captain,
  captainName: team.captainName,
  spent: team.spent,
  purseLeft: auction.purse - team.spent,
  rtmUsed: team.rtmUsed,
  squad: auction.results
    .filter((r) => r.team.toString() === team._id.toString())
    .map((r) => ({ player: r.player, playerName: r.playerName, price: r.price, viaRtm: r.viaRtm })),
});

const auctionView = async (auction) => {
  const teams = await AuctionTeam.find({ auction: auction._id }).sort({ createdAt: 1 });
  let currentPlayer = null;
  if (auction.currentLot?.player) {
    const p = await Player.findById(auction.currentLot.player).lean();
    if (p) currentPlayer = { ...p, rating: computeRating(p.stats) };
  }
  const creator = auction.createdBy;
  return {
    id: auction._id,
    name: auction.name,
    purse: auction.purse,
    status: auction.status,
    createdBy: creator?._id || creator,
    createdByName: creator?.name || "",
    currentLot: auction.currentLot,
    rtmWindow: auction.rtmWindow,
    teams: teams.map((t) => teamView(auction, t)),
    bids: [...auction.bids].slice(-25).reverse(),
    results: auction.results,
    unsoldIds: auction.unsoldIds,
    createdAt: auction.createdAt,
    currentPlayer,
  };
};

const loadAuction = async (req, res) => {
  const auction = await Auction.findById(req.params.id).populate("createdBy", "name");
  if (!auction) {
    res.status(404).json({ message: "Auction not found" });
    return null;
  }
  return auction;
};

const isAuctioneer = (auction, userId) => {
  const cid = auction.createdBy?._id || auction.createdBy;
  return cid.toString() === userId;
};

// Finalises the current lot's sale to `team` at `price`: debits the
// team's purse, stamps the player's card, records the result.
async function finalizeSale(auction, team, price, viaRtm) {
  const lot = auction.currentLot;
  team.spent += price;
  await team.save();
  await Player.findByIdAndUpdate(lot.player, {
    auctionTag: {
      price,
      teamName: team.name,
      auctionName: auction.name,
      soldAt: new Date(),
    },
  });
  auction.results.push({
    player: lot.player,
    playerName: lot.playerName,
    team: team._id,
    teamName: team.name,
    price,
    viaRtm,
  });
  auction.currentLot = null;
  auction.rtmWindow = null;
  await auction.save();
}

// POST /api/auctions — any member can host an auction night.
export const createAuction = async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Give the auction a name" });
  const purse = Number(req.body.purse) || DEFAULT_PURSE;
  if (purse < 100) return res.status(400).json({ message: "Purse must be at least 100 coins" });
  const auction = await Auction.create({
    name,
    purse: Math.floor(purse),
    createdBy: req.user.id,
  });
  await auction.populate("createdBy", "name");
  res.status(201).json({ auction: await auctionView(auction) });
};

// GET /api/auctions
export const listAuctions = async (req, res) => {
  const auctions = await Auction.find().sort({ createdAt: -1 }).lean();
  const counts = await AuctionTeam.aggregate([{ $group: { _id: "$auction", n: { $sum: 1 } } }]);
  const byId = Object.fromEntries(counts.map((c) => [c._id.toString(), c.n]));
  res.json({
    auctions: auctions.map((a) => ({
      id: a._id,
      name: a.name,
      purse: a.purse,
      status: a.status,
      teamCount: byId[a._id.toString()] || 0,
      soldCount: (a.results || []).length,
      createdAt: a.createdAt,
    })),
  });
};

// GET /api/auctions/:id — full room state (the client polls this).
export const getAuction = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  res.json({ auction: await auctionView(auction) });
};

// POST /api/auctions/:id/teams — join as a team (you are its captain).
export const createTeam = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  if (auction.status === "done") return res.status(400).json({ message: "This auction is over" });
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Give your team a name" });
  const mine = await AuctionTeam.findOne({ auction: auction._id, captain: req.user.id });
  if (mine) return res.status(409).json({ message: "You already captain a team in this auction" });
  const clash = await AuctionTeam.findOne({ auction: auction._id, name });
  if (clash) return res.status(409).json({ message: "That team name is taken in this auction" });
  await AuctionTeam.create({
    auction: auction._id,
    name,
    captain: req.user.id,
    captainName: req.user.name,
  });
  res.status(201).json({ auction: await auctionView(auction) });
};

// POST /api/auctions/:id/start — auctioneer opens the room.
export const startAuction = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  if (!isAuctioneer(auction, req.user.id)) {
    return res.status(403).json({ message: "Only the auctioneer can start the auction" });
  }
  if (auction.status !== "setup") return res.status(400).json({ message: "Auction already started" });
  const teamCount = await AuctionTeam.countDocuments({ auction: auction._id });
  if (teamCount < 2) return res.status(400).json({ message: "At least 2 teams are needed" });
  auction.status = "live";
  await auction.save();
  res.json({ auction: await auctionView(auction) });
};

// POST /api/auctions/:id/lots/next — auctioneer puts a player on the
// block. Body { playerId } optional; without one, the priciest
// unauctioned player comes up automatically.
export const nextLot = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  if (!isAuctioneer(auction, req.user.id)) {
    return res.status(403).json({ message: "Only the auctioneer runs the lots" });
  }
  if (auction.status !== "live") return res.status(400).json({ message: "Auction is not live" });
  if (auction.currentLot) return res.status(400).json({ message: "A lot is already on the block" });

  const soldIds = new Set(auction.results.map((r) => r.player.toString()));
  let player = null;
  if (req.body.playerId) {
    player = await Player.findById(req.body.playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });
    if (soldIds.has(player._id.toString())) {
      return res.status(400).json({ message: "That player is already sold in this auction" });
    }
    // A second-chance lot: re-listing clears his unsold mark.
    auction.unsoldIds = auction.unsoldIds.filter((u) => u.toString() !== player._id.toString());
  } else {
    const unsold = new Set(auction.unsoldIds.map((u) => u.toString()));
    const candidates = await Player.find({
      _id: { $nin: [...soldIds, ...unsold] },
    });
    if (candidates.length === 0) {
      return res.status(400).json({ message: "No players left — finish the auction or re-list an unsold player" });
    }
    candidates.sort((a, b) => basePriceFor(b) - basePriceFor(a));
    player = candidates[0];
  }

  auction.currentLot = {
    player: player._id,
    playerName: player.name,
    basePrice: basePriceFor(player),
    currentBid: null,
    leaderTeam: null,
    leaderTeamName: "",
  };
  await auction.save();
  res.json({ auction: await auctionView(auction) });
};

// POST /api/auctions/:id/bid — a captain bids for their own team.
export const placeBid = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  if (auction.status !== "live" || !auction.currentLot) {
    return res.status(400).json({ message: "No lot is on the block right now" });
  }
  if (auction.rtmWindow) {
    return res.status(400).json({ message: "An RTM decision is pending — bidding is paused" });
  }
  const team = await AuctionTeam.findOne({ auction: auction._id, captain: req.user.id });
  if (!team) return res.status(403).json({ message: "You are not a captain in this auction" });

  const amount = Math.floor(Number(req.body.amount) || 0);
  const lot = auction.currentLot;
  const minNext = lot.currentBid ? lot.currentBid + MIN_INCREMENT : lot.basePrice;
  if (amount < minNext) {
    return res.status(400).json({ message: `Bid must be at least ${minNext} coins` });
  }
  if (lot.leaderTeam && lot.leaderTeam.toString() === team._id.toString()) {
    return res.status(400).json({ message: "You are already the highest bidder" });
  }
  const available = auction.purse - team.spent;
  if (amount > available) {
    return res.status(400).json({ message: `Your purse has only ${available} coins left` });
  }

  lot.currentBid = amount;
  lot.leaderTeam = team._id;
  lot.leaderTeamName = team.name;
  auction.bids.push({
    team: team._id,
    teamName: team.name,
    player: lot.player,
    playerName: lot.playerName,
    amount,
  });
  await auction.save();
  res.json({ auction: await auctionView(auction) });
};

// POST /api/auctions/:id/lots/sold — auctioneer drops the hammer.
// Opens an RTM window instead when an eligible former team exists.
export const sellLot = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  if (!isAuctioneer(auction, req.user.id)) {
    return res.status(403).json({ message: "Only the auctioneer drops the hammer" });
  }
  const lot = auction.currentLot;
  if (!lot) return res.status(400).json({ message: "No lot is on the block" });
  if (!lot.leaderTeam) {
    return res.status(400).json({ message: "No bids yet — pass the player as unsold instead" });
  }

  const winner = await AuctionTeam.findById(lot.leaderTeam);
  const playerDoc = await Player.findById(lot.player).select("auctionTag").lean();
  const formerName = playerDoc?.auctionTag?.teamName;
  if (formerName && formerName !== winner.name) {
    const former = await AuctionTeam.findOne({
      auction: auction._id,
      name: formerName,
      rtmUsed: false,
    });
    if (former) {
      auction.rtmWindow = {
        forTeam: former._id,
        forTeamName: former.name,
        winnerTeam: winner._id,
        winnerTeamName: winner.name,
        price: lot.currentBid,
      };
      await auction.save();
      return res.json({ auction: await auctionView(auction), rtmOpened: true });
    }
  }

  await finalizeSale(auction, winner, lot.currentBid, false);
  res.json({ auction: await auctionView(auction) });
};

// POST /api/auctions/:id/rtm — the former team's captain decides,
// or the auctioneer skips an unanswered window (decision "skip").
export const resolveRtm = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  const win = auction.rtmWindow;
  if (!win) return res.status(400).json({ message: "No RTM window is open" });
  const decision = req.body.decision;
  const former = await AuctionTeam.findById(win.forTeam);
  const winner = await AuctionTeam.findById(win.winnerTeam);

  if (decision === "match") {
    if (!former || former.captain.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the former team's captain can match" });
    }
    if (win.price > auction.purse - former.spent) {
      return res.status(400).json({ message: "Your purse can't cover the match price" });
    }
    former.rtmUsed = true;
    await former.save();
    await finalizeSale(auction, former, win.price, true);
  } else if (decision === "pass" || decision === "skip") {
    if (decision === "pass" && (!former || former.captain.toString() !== req.user.id)) {
      return res.status(403).json({ message: "Only the former team's captain can pass" });
    }
    if (decision === "skip" && !isAuctioneer(auction, req.user.id)) {
      return res.status(403).json({ message: "Only the auctioneer can skip the window" });
    }
    await finalizeSale(auction, winner, win.price, false);
  } else {
    return res.status(400).json({ message: "Decision must be match, pass or skip" });
  }
  res.json({ auction: await auctionView(auction) });
};

// POST /api/auctions/:id/lots/unsold — auctioneer passes the player.
export const unsoldLot = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  if (!isAuctioneer(auction, req.user.id)) {
    return res.status(403).json({ message: "Only the auctioneer runs the lots" });
  }
  if (!auction.currentLot) return res.status(400).json({ message: "No lot is on the block" });
  auction.unsoldIds.push(auction.currentLot.player);
  auction.currentLot = null;
  await auction.save();
  res.json({ auction: await auctionView(auction) });
};

// POST /api/auctions/:id/finish — auctioneer closes the night.
export const finishAuction = async (req, res) => {
  const auction = await loadAuction(req, res);
  if (!auction) return;
  if (!isAuctioneer(auction, req.user.id)) {
    return res.status(403).json({ message: "Only the auctioneer can finish the auction" });
  }
  if (auction.currentLot) {
    return res.status(400).json({ message: "Resolve the current lot before finishing" });
  }
  auction.status = "done";
  await auction.save();
  res.json({ auction: await auctionView(auction) });
};
