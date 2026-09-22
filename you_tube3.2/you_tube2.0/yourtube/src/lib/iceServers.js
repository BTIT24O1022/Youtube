// STUN lets two peers discover their public IP/port so they can try to
// connect directly -- free, no signup, Google runs these for anyone to use.
//
// TURN is different: it's a relay server used as a fallback when a direct
// connection isn't possible (symmetric NATs, some corporate firewalls).
// A real TURN server costs money to run at scale. The credentials below
// are the "Open Relay Project" test credentials, published publicly by
// that project specifically for open testing/demos -- they are NOT a
// secret and NOT something we're exposing by accident. For a real
// deployment beyond a class project, you'd want your own TURN server
// (e.g. via Twilio, Xirsys, or metered.ca's paid tiers) since this public
// one has no uptime/capacity guarantees.
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// Mesh topology cap -- matches the server-side limit in callSignaling.js.
// Above this, per-participant upload bandwidth (N-1 outgoing streams)
// becomes impractical without a media server (SFU).
export const MAX_CALL_PARTICIPANTS = 8;

// Data channel messages are chunked to stay well under the smallest
// commonly-supported browser limit (~256KB), so file sharing works
// consistently across Chrome/Firefox/Safari.
export const CHUNK_SIZE = 16 * 1024;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB cap for peer-to-peer file sharing
