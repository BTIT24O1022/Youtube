import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import video from "../Modals/video.js";

dotenv.config();

const checkMissingMedia = async () => {
  try {
    const dbUrl = process.env.DB_URL;
    if (!dbUrl) {
      console.error("DB_URL environment variable is missing.");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(dbUrl);
    console.log("Connected successfully.\n");

    const videos = await video.find({});
    console.log(`Analyzing ${videos.length} video documents in database...\n`);

    let missingCount = 0;
    let presentCount = 0;

    videos.forEach((vid) => {
      const origPath = vid.filepath || "";
      const normalized = origPath.replace(/\\/g, "/");
      const directPath = path.resolve(normalized);
      const filename = path.basename(normalized);
      const localUploadsPath = path.resolve(path.join("uploads", filename));

      const existsDirect = fs.existsSync(directPath);
      const existsInUploads = fs.existsSync(localUploadsPath);

      if (existsDirect || existsInUploads) {
        presentCount++;
      } else {
        missingCount++;
        console.log(`[MISSING] Video ID: ${vid._id}`);
        console.log(`  Title:      ${vid.videotitle}`);
        console.log(`  Channel:    ${vid.videochanel}`);
        console.log(`  Filepath:   ${vid.filepath}`);
        console.log(`  Uploaded:   ${vid.createdAt}\n`);
      }
    });

    console.log("==========================================");
    console.log(`Summary:`);
    console.log(`  Total Videos in DB: ${videos.length}`);
    console.log(`  Files Present:      ${presentCount}`);
    console.log(`  Files Missing:      ${missingCount}`);
    console.log("==========================================");

    process.exit(0);
  } catch (error) {
    console.error("Diagnostic script error:", error);
    process.exit(1);
  }
};

checkMissingMedia();
