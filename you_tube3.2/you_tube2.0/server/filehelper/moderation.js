// Rule-based moderation helpers -- not real ML, just pattern checks. See the
// comment controller for how these combine into flag/reject decisions.

const SUSPICIOUS_WORDS = ["spam", "scam", "kill yourself", "idiot", "stupid", "hate you"];
const LINK_REGEX = /(https?:\/\/|www\.)\S+/i;

export const containsProfanityOrAbuse = (text = "") => {
  const lower = text.toLowerCase();
  return SUSPICIOUS_WORDS.some((w) => lower.includes(w));
};

export const containsLink = (text = "") => LINK_REGEX.test(text);

// True if the comment is mostly emoji/symbols rather than actual words --
// catches "🔥🔥🔥🔥🔥🔥🔥🔥" style flooding.
export const isSymbolFlood = (text = "") => {
  const trimmed = text.trim();
  if (trimmed.length < 6) return false;
  const nonWordChars = trimmed.replace(/[a-zA-Z0-9\s]/g, "").length;
  return nonWordChars / trimmed.length > 0.7;
};

// In-memory per-user comment timestamps, used only for a soft rate limit.
// Resets on server restart -- fine for this purpose, not meant to be a
// distributed/production-grade rate limiter.
const recentComments = new Map(); // userId -> timestamps[]
const WINDOW_MS = 60 * 1000;

export const recordAndCheckRate = (userId) => {
  const now = Date.now();
  const history = (recentComments.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  history.push(now);
  recentComments.set(userId, history);
  return {
    count: history.length,
    needsCaptcha: history.length > 5, // slow down after 5 comments/min
    blocked: history.length > 12, // hard stop after 12 comments/min
  };
};
