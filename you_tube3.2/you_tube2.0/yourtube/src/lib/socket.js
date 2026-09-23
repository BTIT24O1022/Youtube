import { io } from "socket.io-client";

// process.env.BACKEND_URL is exposed via next.config.ts's `env` block, same
// value axiosinstance.js uses for API calls. One shared socket connection is
// reused everywhere (video page joins a room, Header listens for
// notifications) instead of every component opening its own connection.
const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "https://youtube-backend-n2km.onrender.com", {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

export default socket;
