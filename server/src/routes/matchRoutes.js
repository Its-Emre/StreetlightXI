import { Router } from "express";
import {
  createMatch,
  listMatches,
  getMatch,
  recordToss,
  beginNextInnings,
  appendEvent,
  undoEvent,
  abandonMatch,
  deleteMatch,
} from "../controllers/matchController.js";
import auth from "../middleware/auth.js";

const router = Router();

router.use(auth);
router.get("/", listMatches);
router.post("/", createMatch);
router.get("/:id", getMatch);
router.post("/:id/toss", recordToss);
router.post("/:id/innings", beginNextInnings);
router.post("/:id/events", appendEvent);
router.post("/:id/undo", undoEvent);
router.post("/:id/abandon", abandonMatch);
router.delete("/:id", deleteMatch);

export default router;
