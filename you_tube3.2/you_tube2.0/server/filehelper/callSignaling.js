import crypto from "crypto";

// In-memory only -- calls are ephemeral, there's no reason to persist a
// video call's roster to MongoDB. Resets if the server restarts, which is
// fine (any active call would be disrupted by a restart anyway).
const rooms = new Map(); // roomId -> { hostId, coHosts:Set<socketId>, locked:bool, participants: Map<socketId,{userId,name,image}> }

const MAX_PARTICIPANTS = 8; // mesh topology (everyone connects to everyone)
// gets expensive fast -- each participant uploads N-1 video streams. Past
// ~8 people a real product would need a media server (SFU) instead of mesh.

const roomState = (roomId) => rooms.get(roomId);
const isHostOrCoHost = (room, socketId) => room.hostId === socketId || room.coHosts.has(socketId);

const publicParticipantList = (room) =>
  Array.from(room.participants.entries()).map(([socketId, info]) => ({
    socketId,
    ...info,
    isHost: room.hostId === socketId,
    isCoHost: room.coHosts.has(socketId),
  }));

export const registerCallSignaling = (io) => {
  io.on("connection", (socket) => {
    socket.on("call:create-room", (_, callback) => {
      const roomId = crypto.randomBytes(4).toString("hex");
      rooms.set(roomId, { hostId: null, coHosts: new Set(), locked: false, participants: new Map() });
      callback?.({ roomId });
    });

    socket.on("call:join", ({ roomId, name, image, userId }, callback) => {
      let room = roomState(roomId);
      if (!room) {
        // Allow joining a roomId that wasn't created via create-room (e.g.
        // someone typed/shared a link directly) -- first person becomes host.
        room = { hostId: null, coHosts: new Set(), locked: false, participants: new Map() };
        rooms.set(roomId, room);
      }
      if (room.locked) {
        return callback?.({ error: "This meeting is locked and not accepting new participants." });
      }
      if (room.participants.size >= MAX_PARTICIPANTS) {
        return callback?.({ error: `This meeting is full (max ${MAX_PARTICIPANTS} participants).` });
      }

      const isFirst = room.participants.size === 0;
      if (isFirst) room.hostId = socket.id;

      room.participants.set(socket.id, { userId, name: name || "Guest", image, muted: false, cameraOff: false, raisedHand: false });
      socket.join(`call_${roomId}`);
      socket.data.roomId = roomId;

      // Tell the newcomer who's already here -- convention: the NEW joiner
      // initiates the WebRTC offer to each existing participant. Existing
      // participants just wait to receive an offer.
      const existing = publicParticipantList(room).filter((p) => p.socketId !== socket.id);
      callback?.({ roomId, selfId: socket.id, isHost: room.hostId === socket.id, participants: existing });

      socket.to(`call_${roomId}`).emit("call:participant-joined", {
        socketId: socket.id, userId, name, image, isHost: room.hostId === socket.id,
      });
    });

    // Opaque relay for WebRTC offers/answers/ICE candidates -- the server
    // never inspects or stores this, it just forwards it to the intended peer.
    socket.on("call:signal", ({ to, data }) => {
      io.to(to).emit("call:signal", { from: socket.id, data });
    });

    socket.on("call:toggle-mute", ({ muted }) => {
      const room = roomState(socket.data.roomId);
      if (!room?.participants.has(socket.id)) return;
      room.participants.get(socket.id).muted = muted;
      socket.to(`call_${socket.data.roomId}`).emit("call:participant-updated", { socketId: socket.id, muted });
    });

    socket.on("call:toggle-camera", ({ cameraOff }) => {
      const room = roomState(socket.data.roomId);
      if (!room?.participants.has(socket.id)) return;
      room.participants.get(socket.id).cameraOff = cameraOff;
      socket.to(`call_${socket.data.roomId}`).emit("call:participant-updated", { socketId: socket.id, cameraOff });
    });

    socket.on("call:raise-hand", ({ raised }) => {
      const room = roomState(socket.data.roomId);
      if (!room?.participants.has(socket.id)) return;
      room.participants.get(socket.id).raisedHand = raised;
      socket.to(`call_${socket.data.roomId}`).emit("call:participant-updated", { socketId: socket.id, raisedHand: raised });
    });

    socket.on("call:chat-message", ({ text, name }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      io.to(`call_${roomId}`).emit("call:chat-message", { from: socket.id, name, text, at: Date.now() });
    });

    // Host asks a participant to mute themselves. We can't forcibly kill
    // someone else's microphone in a peer-to-peer mesh -- their browser
    // owns that hardware -- so this asks their client to do it, same as
    // how Zoom/Meet "mute" requests actually work under the hood.
    socket.on("call:request-mute", ({ targetSocketId }) => {
      const room = roomState(socket.data.roomId);
      if (!room || !isHostOrCoHost(room, socket.id)) return;
      io.to(targetSocketId).emit("call:force-mute");
    });

    socket.on("call:remove-participant", ({ targetSocketId }) => {
      const room = roomState(socket.data.roomId);
      if (!room || !isHostOrCoHost(room, socket.id)) return;
      room.participants.delete(targetSocketId);
      room.coHosts.delete(targetSocketId);
      io.to(targetSocketId).emit("call:removed");
      io.sockets.sockets.get(targetSocketId)?.leave(`call_${socket.data.roomId}`);
      socket.to(`call_${socket.data.roomId}`).emit("call:participant-left", { socketId: targetSocketId });
    });

    socket.on("call:lock", ({ locked }) => {
      const room = roomState(socket.data.roomId);
      if (!room || !isHostOrCoHost(room, socket.id)) return;
      room.locked = locked;
      io.to(`call_${socket.data.roomId}`).emit("call:room-locked", { locked });
    });

    socket.on("call:assign-cohost", ({ targetSocketId }) => {
      const room = roomState(socket.data.roomId);
      if (!room || room.hostId !== socket.id) return; // only the host, not co-hosts, can promote others
      room.coHosts.add(targetSocketId);
      io.to(`call_${socket.data.roomId}`).emit("call:participant-updated", { socketId: targetSocketId, isCoHost: true });
    });

    const leaveCall = () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const room = roomState(roomId);
      if (!room) return;
      room.participants.delete(socket.id);
      room.coHosts.delete(socket.id);

      if (room.participants.size === 0) {
        rooms.delete(roomId); // last one out, clean up the room entirely
        return;
      }
      // Simple host failover: if the host left, hand it to whoever's next.
      if (room.hostId === socket.id) {
        room.hostId = room.participants.keys().next().value;
      }
      socket.to(`call_${roomId}`).emit("call:participant-left", { socketId: socket.id });
    };

    socket.on("call:leave", leaveCall);
    socket.on("disconnect", leaveCall);
  });
};
