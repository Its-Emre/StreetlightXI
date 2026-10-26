import { Router } from "express";
import {
  createAuction,
  listAuctions,
  getAuction,
  createTeam,
  startAuction,
  nextLot,
  placeBid,
  sellLot,
  resolveRtm,
  unsoldLot,
  finishAuction,
} from "../controllers/auctionController.js";
import auth from "../middleware/auth.js";

const router = Router();

router.use(auth);
router.get("/", listAuctions);
router.post("/", createAuction);
router.get("/:id", getAuction);
router.post("/:id/teams", createTeam);
router.post("/:id/start", startAuction);
router.post("/:id/lots/next", nextLot);
router.post("/:id/lots/sold", sellLot);
router.post("/:id/lots/unsold", unsoldLot);
router.post("/:id/bid", placeBid);
router.post("/:id/rtm", resolveRtm);
router.post("/:id/finish", finishAuction);

export default router;
