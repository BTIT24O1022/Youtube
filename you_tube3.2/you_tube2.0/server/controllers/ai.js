// Calls Anthropic's API to generate a description/tags. The API key lives
// only here on the server (in process.env), never in frontend code, so it
// can never leak into the browser bundle or be read from devtools.
const callClaude = async (prompt) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set on the server");
  }
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || "";
};

export const generatedescription = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    const text = await callClaude(
      `Write a concise, professional 2-3 sentence YouTube video description for a video titled "${title}". Return only the description text, nothing else.`
    );
    return res.status(200).json({ description: text.trim() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "AI generation failed" });
  }
};

export const generatetags = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    const text = await callClaude(
      `Suggest 5-8 relevant YouTube tags for a video titled "${title}"${description ? ` with description: "${description}"` : ""}. Return ONLY a comma-separated list of tags, nothing else.`
    );
    const tags = text.split(",").map((t) => t.trim()).filter(Boolean);
    return res.status(200).json({ tags });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "AI generation failed" });
  }
};
