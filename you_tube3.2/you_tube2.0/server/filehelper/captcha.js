import crypto from "crypto";

// A simple self-hosted CAPTCHA: no external service, no API key, no signup.
// It won't stop a determined bot, but it's exactly the kind of "prove
// you're not a script firing off 50 requests a second" speed bump the
// brief asks for after repeated posting attempts.
const pending = new Map(); // captchaId -> { answer, expiresAt }
const TTL_MS = 5 * 60 * 1000;

export const createCaptcha = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const id = crypto.randomUUID();
  pending.set(id, { answer: a + b, expiresAt: Date.now() + TTL_MS });
  return { id, question: `What is ${a} + ${b}?` };
};

export const verifyCaptcha = (id, answer) => {
  const entry = pending.get(id);
  if (!entry) return false;
  pending.delete(id); // one-time use
  if (Date.now() > entry.expiresAt) return false;
  return Number(answer) === entry.answer;
};

// Periodically clear expired/unused challenges so this Map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of pending) {
    if (now > entry.expiresAt) pending.delete(id);
  }
}, 10 * 60 * 1000);
