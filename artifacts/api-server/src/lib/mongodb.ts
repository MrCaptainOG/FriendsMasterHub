import mongoose from "mongoose";
import { logger } from "./logger";

const MONGODB_URI =
  "mongodb+srv://DBJAVAGAMER:C5dncanVWVx9OIqs@javagamerop.2rruqhw.mongodb.net/FriendsSMP/?appName=JAVAGAMEROP";

let connected = false;

export async function connectMongo() {
  if (connected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "FriendsSMP",
    });
    connected = true;
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    throw err;
  }
}

const imageInfoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    uploaderName: { type: String, required: true },
    status: {
      type: String,
      enum: ["unchecked", "approved", "rejected", "awarded"],
      default: "unchecked",
    },
    rejectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ImageInfo =
  mongoose.models.imageinfos ||
  mongoose.model("imageinfos", imageInfoSchema, "imageinfos");
