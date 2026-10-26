import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verifies the Bearer JWT and attaches req.user = { id, name, email }.
const auth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Not logged in" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("name email");
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    req.user = { id: user._id.toString(), name: user.name, email: user.email };
    next();
  } catch {
    return res.status(401).json({ message: "Session expired — please log in again" });
  }
};

export default auth;
