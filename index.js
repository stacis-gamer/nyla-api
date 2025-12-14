import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
   EMOTION RULES
========================= */
const EMOTION_RULES = `
Return ONLY ONE word from this list:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
No extra text.
`;

/* =========================
   CHAT ROUTE
========================= */
app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: "Missing 'message' in request body",
    });
  }

  try {
    /* ---------- Nyla Reply ---------- */
    const replyRes = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `
${NYLA_PERSONALITY}

User message:
${message}

Reply as Nyla:
`,
    });

    const reply = replyRes.text?.trim() || "Heyyy 💜";

    /* ---------- Emotion Detection ---------- */
    const emotionRes = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `
${EMOTION_RULES}

User message:
${message}

Nyla reply:
${reply}

Emotion:
`,
    });

    const emotion =
      emotionRes.text?.trim().toLowerCase() || "happy";

    return res.json({
      reply,
      emotion,
      cooldown: false,
    });

  } catch (err) {
    console.error("🔥 Gemini Error:", err?.message || err);

    /* ---------- RATE LIMIT / QUOTA HANDLING ---------- */
    if (
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("rate limit") ||
      err?.status === 429
    ) {
      return res.json({
        reply: "I’m recharging right now 🔋💜 Give me a bit, okay?",
        emotion: "sleepy",
        cooldown: true,
      });
    }

    /* ---------- FALLBACK ERROR ---------- */
    return res.status(500).json({
      reply: "Something broke on my side 😭",
      emotion: "shocked",
      cooldown: false,
    });
  }
});

/* =========================
   SERVER START
========================= */
app.listen(3000, () => {
  console.log("✨ Nyla API running on Gemini 1.5 Flash");
});