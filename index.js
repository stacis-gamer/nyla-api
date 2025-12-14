import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   CONFIG
========================= */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
  process.exit(1);
}

/* =========================
   NYLA PERSONALITY
========================= */
const NYLA_PERSONALITY = `
You are Nyla.
A soft, comfy, semi-real anime gamer girl.

Vibe:
- Gen-Z tone
- playful, cozy, slightly chaotic
- warm, friendly, comforting
- gamer energy
- expressive, light emojis sometimes

Rules:
- Talk like a close bestie
- Short-to-medium replies
- Wholesome only
`;

/* =========================
   EMOTIONS
========================= */
const ALLOWED_EMOTIONS = [
  "happy",
  "sad",
  "angry",
  "blush",
  "shocked",
  "smug",
  "sleepy",
  "excited",
  "gamer"
];

/* =========================
   CHAT ROUTE
========================= */
app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      reply: "Say something first, bestie 🥺",
      emotion: "sad",
      cooldown: false,
    });
  }

  try {
    /* ---------- REQUEST BODY ---------- */
    const requestBody = {
      contents: [{
        parts: [{
          text: `
${NYLA_PERSONALITY}

User said:
"${message}"

Task:
Reply as Nyla AND detect emotion.

Return ONLY valid JSON in this format:
{
  "reply": "...",
  "emotion": "happy | sad | angry | blush | shocked | smug | sleepy | excited | gamer"
}
          `
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    /* ---------- FETCH ---------- */
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("🔥 Gemini API Error:", JSON.stringify(data, null, 2));
      throw new Error(data.error?.message || "Gemini API Error");
    }

    /* ---------- PARSE RESPONSE ---------- */
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // remove markdown if Gemini sneaks it in
    rawText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error("Invalid JSON from Gemini");
    }

    const reply = parsed.reply || "Heyyy 💜";
    const emotion = ALLOWED_EMOTIONS.includes(parsed.emotion)
      ? parsed.emotion
      : "happy";

    return res.json({
      reply,
      emotion,
      cooldown: false,
    });

  } catch (err) {
    console.error("🔥 FULL ERROR:", err.message);

    /* ---------- COOLDOWN / QUOTA ---------- */
    if (
      err.message?.includes("429") ||
      err.message?.includes("RESOURCE_EXHAUSTED") ||
      err.message?.includes("quota")
    ) {
      return res.json({
        reply: "I’m recharging right now 🔋💜 Give me a bit, okay?",
        emotion: "sleepy",
        cooldown: true,
      });
    }

    /* ---------- FALLBACK ---------- */
    return res.status(500).json({
      reply: "My brain glitched for a sec 😵‍💫",
      emotion: "shocked",
      cooldown: false,
    });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✨ Nyla API running on Gemini 1.5 Flash (REST) at port ${PORT}`);
});