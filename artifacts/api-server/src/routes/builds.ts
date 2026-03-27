import { Router, type IRouter } from "express";
import axios from "axios";
import { connectMongo, ImageInfo } from "../lib/mongodb";
import { queueAward } from "../lib/bot";

const router: IRouter = Router();
const ADMIN_PASSWORD = "9897162621762";
const IMGBB_API_KEY = "7e3d3f9d6b1ce807a6c0383643a41694";

async function uploadToImgBB(base64: string): Promise<string> {
  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY);
  // Strip data URL prefix if present
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  formData.append("image", clean);

  const resp = await axios.post("https://api.imgbb.com/1/upload", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30000,
  });

  if (!resp.data?.data?.url) {
    throw new Error("ImgBB upload failed");
  }
  return resp.data.data.url;
}

// Public gallery
router.get("/builds", async (_req, res) => {
  await connectMongo();
  const builds = await ImageInfo.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ builds });
});

// Admin - all builds
router.get("/builds/admin", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  const builds = await ImageInfo.find({}).sort({ createdAt: -1 }).lean();
  res.json({ builds });
});

// Submit build
router.post("/builds", async (req, res) => {
  const { title, description, imageBase64, uploaderName } = req.body;
  if (!title || !description || !imageBase64 || !uploaderName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  await connectMongo();
  try {
    const imageUrl = await uploadToImgBB(imageBase64);
    const build = await ImageInfo.create({
      title,
      description,
      imageUrl,
      uploaderName,
      status: "unchecked",
    });
    res.status(201).json(build);
  } catch (err) {
    res.status(500).json({ error: "Failed to upload image or save build" });
  }
});

// Update status
router.patch("/builds/:id/status", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  const { status } = req.body;
  const valid = ["unchecked", "approved", "rejected", "awarded"];
  if (!valid.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const update: Record<string, unknown> = { status };
  if (status === "rejected") {
    update.rejectedAt = new Date();
  }
  const build = await ImageInfo.findByIdAndUpdate(req.params.id, update, {
    new: true,
  });
  if (!build) {
    res.status(404).json({ error: "Build not found" });
    return;
  }
  res.json(build);
});

// Award build
router.post("/builds/:id/award", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  const { item, quantity } = req.body;
  if (!item || !quantity) {
    res.status(400).json({ error: "item and quantity required" });
    return;
  }

  const build = await ImageInfo.findById(req.params.id);
  if (!build) {
    res.status(404).json({ error: "Build not found" });
    return;
  }

  // Update status to awarded
  await ImageInfo.findByIdAndUpdate(req.params.id, { status: "awarded" });

  // Queue award through bot (non-blocking)
  queueAward(build.uploaderName, item, Number(quantity))
    .then((result) => {
      // logged internally
    })
    .catch(() => {});

  res.json({
    success: true,
    message: `Award queued: /give ${build.uploaderName} ${item} ${quantity}`,
    queued: true,
  });
});

// Auto-delete rejected builds older than 24 hours
async function cleanupRejected() {
  try {
    await connectMongo();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await ImageInfo.deleteMany({
      status: "rejected",
      rejectedAt: { $lt: cutoff },
    });
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} rejected builds`);
    }
  } catch {}
}

// Run cleanup every hour
setInterval(cleanupRejected, 60 * 60 * 1000);
cleanupRejected();

export default router;
