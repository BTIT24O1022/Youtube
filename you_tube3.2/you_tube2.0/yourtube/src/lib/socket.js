import { io } from "socket.io-client";

// process.env.BACKEND_URL is exposed via next.config.ts's `env` block, same
// value axiosinstance.js uses for API calls. One shared socket connection is
// reused everywhere (video page joins a room, Header listens for
// notifications) instead of every component opening its own connection.
const socket = io(process.env.BACKEND_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

export default socket;
