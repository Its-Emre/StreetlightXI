import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import auth from "../middleware/auth.js";

const router = Router();

router.use(auth);
router.get("/", getSettings);
router.put("/", updateSettings);

export default router;
