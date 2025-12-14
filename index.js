import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   GEMINI CLIENT
========================= */
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
   MODEL (STABLE)
========================= */
const MODEL_NAME = "gemini-1.5-flash-001";

/* =========================
   CHAT ROUTE
========================= */
app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      reply: "Say something first 😭",
      emotion: "shocked",
      cooldown: false,
    });
  }

  try {
    /* ---------- Nyla Reply ---------- */
    const replyResult = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
${NYLA_PERSONALITY}

User message:
${message}

Reply as Nyla:
              `.trim(),
            },
          ],
        },
      ],
    });

    const reply =
      replyResult?.text?.trim() ||
      "Heyyy 💜 I’m here!";

    /* ---------- Emotion Detection ---------- */
    const emotionResult = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
${EMOTION_RULES}

User message:
${message}

Nyla reply:
${reply}

Emotion:
              `.trim(),
            },
          ],
        },
      ],
    });

    const emotion =
      emotionResult?.text?.trim().toLowerCase() || "happy";

    return res.json({
      reply,
      emotion,
      cooldown: false,
    });

  } catch (err) {
    console.error("🔥 Gemini Error:", err);

    /* ---------- QUOTA / RATE LIMIT ---------- */
    if (
      err?.status === 429 ||
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("quota")
    ) {
      return res.json({
        reply: "I’m recharging right now 🔋💜 Give me a bit, okay?",
        emotion: "sleepy",
        cooldown: true,
      });
    }

    /* ---------- FALLBACK ---------- */
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
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✨ Nyla API running on ${MODEL_NAME} at port ${PORT}`);
});