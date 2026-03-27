import { Router, type IRouter } from "express";
import { connectMongo, User } from "../lib/mongodb";

const router: IRouter = Router();
const ADMIN_PASSWORD = "9897162621762";

// Get all users (admin)
router.get("/admin/users", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  const users = await User.find({}).sort({ createdAt: -1 }).lean();
  res.json({ users });
});

// Adjust credits
router.patch("/admin/users/:id/credits", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  const { amount } = req.body;
  if (amount === undefined || isNaN(Number(amount))) {
    res.status(400).json({ error: "amount is required (positive to add, negative to remove)" });
    return;
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $inc: { credits: Number(amount) } },
    { new: true }
  );
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ _id: user._id, usertag: user.usertag, password: user.password, credits: user.credits, createdAt: user.createdAt });
});

export default router;
