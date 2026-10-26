import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import playerRoutes from "./routes/playerRoutes.js";
import { getThumb } from "./controllers/mediaController.js";

const app = express();

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin(origin, callback) {
      // Allow the configured client, any localhost origin (dev machines
      // and phones on the LAN), and non-browser callers (no origin).
      if (!origin || origin === clientUrl || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Streetlight XI API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/players", playerRoutes);
// Drive artwork proxy (public by design — see mediaController.js).
app.get("/api/media/:driveId/thumb", getThumb);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Streetlight XI API listening on port ${PORT}`));
});
