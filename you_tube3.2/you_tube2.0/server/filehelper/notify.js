import notification from "../Modals/notification.js";

// Small shared helper so like/comment/subscribe controllers can all create
// notifications the same way, and so we can plug in Socket.IO emission in
// one place (see index.js) without touching every controller again later.
export const createNotification = async (io, { recipient, sender, type, videoid, message }) => {
  // Skip if recipient is missing (e.g. video has no uploader field set)
  if (!recipient || recipient === "undefined") return;
  // Don't notify people about their own actions on their own content.
  if (String(recipient) === String(sender)) return;
  const notif = await notification.create({ recipient, sender, type, videoid, message });
  if (io && typeof io.to === "function") {
    io.to(`user_${recipient}`).emit("notification", notif);
  }
  return notif;
};
