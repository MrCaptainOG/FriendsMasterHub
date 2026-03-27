import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { connectMongo, User } from "../lib/mongodb";

const router: IRouter = Router();

function generateToken(usertag: string): string {
  return crypto.createHash("sha256").update(`${usertag}:${Date.now()}:fmh_secret`).digest("hex");
}

// Register
router.post("/auth/register", async (req, res) => {
  const { usertag, password } = req.body;
  if (!usertag || !password) {
    res.status(400).json({ error: "Usertag and password are required" });
    return;
  }
  if (usertag.length < 3 || usertag.length > 24) {
    res.status(400).json({ error: "Usertag must be 3–24 characters" });
    return;
  }
  await connectMongo();
  const existing = await User.findOne({ usertag: { $regex: new RegExp(`^${usertag}$`, "i") } });
  if (existing) {
    res.status(400).json({ error: "This usertag is already taken" });
    return;
  }
  const token = generateToken(usertag);
  const user = await User.create({ usertag, password, token, credits: 0 });
  res.status(201).json({ token, usertag: user.usertag, credits: user.credits });
});

// Login
router.post("/auth/login", async (req, res) => {
  const { usertag, password } = req.body;
  if (!usertag || !password) {
    res.status(400).json({ error: "Usertag and password are required" });
    return;
  }
  await connectMongo();
  const user = await User.findOne({ usertag: { $regex: new RegExp(`^${usertag}$`, "i") } });
  if (!user || user.password !== password) {
    res.status(401).json({ error: "Invalid usertag or password" });
    return;
  }
  // Refresh token
  const token = generateToken(usertag);
  user.token = token;
  await user.save();
  res.json({ token, usertag: user.usertag, credits: user.credits });
});

// Get profile
router.get("/auth/me", async (req, res) => {
  const { usertag, token } = req.query as { usertag?: string; token?: string };
  if (!usertag || !token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await connectMongo();
  const user = await User.findOne({ usertag: { $regex: new RegExp(`^${usertag}$`, "i") }, token });
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ _id: user._id, usertag: user.usertag, credits: user.credits, createdAt: user.createdAt });
});

export default router;
