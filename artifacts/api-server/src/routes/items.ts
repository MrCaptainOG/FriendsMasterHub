import { Router, type IRouter } from "express";
import axios from "axios";
import { connectMongo, ShopItem, User } from "../lib/mongodb";

const router: IRouter = Router();
const ADMIN_PASSWORD = "9897162621762";
const IMGBB_API_KEY = "7e3d3f9d6b1ce807a6c0383643a41694";

async function uploadToImgBB(base64: string): Promise<string> {
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", clean);
  const resp = await axios.post("https://api.imgbb.com/1/upload", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30000,
  });
  if (!resp.data?.data?.url) throw new Error("ImgBB upload failed");
  return resp.data.data.url;
}

// Get all shop items (public)
router.get("/items", async (_req, res) => {
  await connectMongo();
  const items = await ShopItem.find({}).sort({ createdAt: -1 }).lean();
  res.json({ items });
});

// Create item (admin)
router.post("/items", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  const { title, description, imageBase64, creditPrice } = req.body;
  if (!title || creditPrice === undefined) {
    res.status(400).json({ error: "title and creditPrice are required" });
    return;
  }
  let imageUrl: string | null = null;
  if (imageBase64) {
    try {
      imageUrl = await uploadToImgBB(imageBase64);
    } catch {
      res.status(500).json({ error: "Image upload failed" });
      return;
    }
  }
  const item = await ShopItem.create({ title, description: description ?? "", imageUrl, creditPrice: Number(creditPrice) });
  res.status(201).json(item);
});

// Edit item (admin)
router.patch("/items/:id", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  const { title, description, imageBase64, creditPrice } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (creditPrice !== undefined) update.creditPrice = Number(creditPrice);
  if (imageBase64) {
    try {
      update.imageUrl = await uploadToImgBB(imageBase64);
    } catch {
      res.status(500).json({ error: "Image upload failed" });
      return;
    }
  }
  const item = await ShopItem.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
});

// Delete item (admin)
router.delete("/items/:id", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  await ShopItem.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Buy item
router.post("/items/:id/buy", async (req, res) => {
  const { usertag, token } = req.body;
  if (!usertag || !token) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  await connectMongo();
  const user = await User.findOne({ usertag: { $regex: new RegExp(`^${usertag}$`, "i") }, token });
  if (!user) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }
  const item = await ShopItem.findById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  if (user.credits < item.creditPrice) {
    res.status(400).json({ error: `Not enough credits. Need ${item.creditPrice}, have ${user.credits}` });
    return;
  }
  user.credits -= item.creditPrice;
  await user.save();
  res.json({ success: true, message: `Purchased "${item.title}" for ${item.creditPrice} credits!`, remainingCredits: user.credits });
});

export default router;
