import { Router, type IRouter } from "express";
import axios from "axios";
import { connectMongo, ImageInfo, User } from "../lib/mongodb";

const router: IRouter = Router();
const ADMIN_PASSWORD = "9897162621762";
const IMGBB_API_KEY = "7e3d3f9d6b1ce807a6c0383643a41694";

async function uploadToImgBB(base64: string): Promise<string> {
  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY);
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  formData.append("image", clean);
  const resp = await axios.post("https://api.imgbb.com/1/upload", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30000,
  });
  if (!resp.data?.data?.url) throw new Error("ImgBB upload failed");
  return resp.data.data.url;
}

// Public gallery
router.get("/builds", async (_req, res) => {
  await connectMongo();
  const builds = await ImageInfo.find({ status: "approved" }).sort({ createdAt: -1 }).lean();
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
    const build = await ImageInfo.create({ title, description, imageUrl, uploaderName, status: "unchecked" });
    res.status(201).json(build);
  } catch {
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
  if (status === "rejected") update.rejectedAt = new Date();
  const build = await ImageInfo.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!build) {
    res.status(404).json({ error: "Build not found" });
    return;
  }
  res.json(build);
});

// Award credits to build uploader
router.post("/builds/:id/award", async (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  await connectMongo();
  const { credits } = req.body;
  if (!credits || isNaN(Number(credits)) || Number(credits) <= 0) {
    res.status(400).json({ error: "credits must be a positive number" });
    return;
  }

  const build = await ImageInfo.findById(req.params.id);
  if (!build) {
    res.status(404).json({ error: "Build not found" });
    return;
  }

  // Update build status
  await ImageInfo.findByIdAndUpdate(req.params.id, { status: "awarded" });

  // Find user by usertag (uploaderName) and add credits
  const user = await User.findOneAndUpdate(
    { usertag: { $regex: new RegExp(`^${build.uploaderName}$`, "i") } },
    { $inc: { credits: Number(credits) } },
    { new: true }
  );

  const newCredits = user?.credits ?? null;
  res.json({
    success: true,
    message: user
      ? `Awarded ${credits} credits to ${build.uploaderName}! They now have ${newCredits} credits.`
      : `Build marked as awarded, but user "${build.uploaderName}" has no account yet.`,
    newCredits,
  });
});

// Auto-delete rejected builds older than 24 hours
async function cleanupRejected() {
  try {
    await connectMongo();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await ImageInfo.deleteMany({ status: "rejected", rejectedAt: { $lt: cutoff } });
    if (result.deletedCount > 0) console.log(`Cleaned up ${result.deletedCount} rejected builds`);
  } catch {}
}
setInterval(cleanupRejected, 60 * 60 * 1000);
cleanupRejected();

export default router;
