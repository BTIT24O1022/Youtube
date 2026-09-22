// Uses free, keyless LibreTranslate-compatible public instances. Same
// trade-off as the free IP geolocation used elsewhere in this project: no
// signup, no cost, but no uptime guarantee -- any single public instance
// can go down or start rate-limiting. Trying a short list in sequence
// makes this meaningfully more reliable without needing an account. For
// production use, get your own key from Google Cloud Translation or DeepL
// (both have free tiers) and replace this list with a single authenticated
// call -- the response shape returned to the frontend won't need to change.
const PUBLIC_ENDPOINTS = [
  "https://translate.astian.org/translate",
  "https://libretranslate.de/translate",
  "https://lt.vern.cc/translate",
];

const tryTranslate = async (endpoint, text, targetLang) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target: targetLang, format: "text" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${endpoint} returned ${response.status}`);
    const data = await response.json();
    if (!data.translatedText) throw new Error(`${endpoint} returned no translation`);
    return data.translatedText;
  } finally {
    clearTimeout(timeout);
  }
};

export const translatetext = async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ message: "text and targetLang are required" });
  }

  for (const endpoint of PUBLIC_ENDPOINTS) {
    try {
      const translatedText = await tryTranslate(endpoint, text, targetLang);
      return res.status(200).json({ translatedText });
    } catch (error) {
      console.warn("Translation mirror failed, trying next:", error.message);
    }
  }
  return res.status(503).json({ message: "Translation is temporarily unavailable. Please try again shortly." });
};
