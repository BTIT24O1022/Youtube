import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import dislikeroutes from "./routes/dislike.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import subscriptionroutes from "./routes/subscription.js";
import playlistroutes from "./routes/playlist.js";
import notificationroutes from "./routes/notification.js";
import reportroutes from "./routes/report.js";
import adminroutes from "./routes/admin.js";
import airoutes from "./routes/ai.js";
import billingroutes from "./routes/billing.js";
import securityroutes from "./routes/security.js";
import { registerCallSignaling } from "./filehelper/callSignaling.js";
import downloadroutes from "./routes/download.js";
import translateroutes from "./routes/translate.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

// Real-time layer: video-watch rooms for live comments, and a per-user
// room for live notifications (bell icon updates without a page refresh).
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

io.on("connection", (socket) => {
  socket.on("join_video", (videoId) => socket.join(`video_${videoId}`));
  socket.on("leave_video", (videoId) => socket.leave(`video_${videoId}`));
  socket.on("join_user", (userId) => socket.join(`user_${userId}`));
  socket.on("disconnect", () => {});
});
registerCallSignaling(io);

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/dislike", dislikeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/subscription", subscriptionroutes);
app.use("/playlist", playlistroutes);
app.use("/notification", notificationroutes);
app.use("/report", reportroutes);
app.use("/admin", adminroutes);
app.use("/ai", airoutes);
app.use("/billing", billingroutes);
app.use("/security", securityroutes);
app.use("/download", downloadroutes);
app.use("/translate", translateroutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const DBURL = process.env.DB_URL;
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
