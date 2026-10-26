import { Router } from "express";
import {
  listPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from "../controllers/playerController.js";
import auth from "../middleware/auth.js";

const router = Router();

router.use(auth);
router.get("/", listPlayers);
router.get("/:id", getPlayer);
router.post("/", createPlayer);
router.put("/:id", updatePlayer);
router.delete("/:id", deletePlayer);

export default router;
