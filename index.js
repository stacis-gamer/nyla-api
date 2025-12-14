import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   GROQ CLIENT (OpenAI-compatible)
========================= */
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
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
Choose ONE emotion from this list:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.

Return ONLY the emotion word.
`;

/* =========================
   CHAT ROUTE
========================= */
app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      reply: "You forgot to say something 😭",
      emotion: "shocked",
      cooldown: false
    });
  }

  try {
    /* ---------- MAIN RESPONSE ---------- */
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: NYLA_PERSONALITY },
        { role: "user", content: message }
      ],
      temperature: 0.9,
      max_tokens: 180
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Heyyy 💜";

    /* ---------- EMOTION DETECTION ---------- */
    const emotionCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: EMOTION_RULES },
        { role: "user", content: reply }
      ],
      temperature: 0,
      max_tokens: 10
    });

    const emotion =
      emotionCompletion.choices[0]?.message?.content
        ?.trim()
        .toLowerCase() || "happy";

    return res.json({
      reply,
      emotion,
      cooldown: false
    });

  } catch (err) {
    console.error("🔥 GROQ ERROR:", err?.message || err);

    // Rate limit / overload
    if (err?.status === 429) {
      return res.json({
        reply: "I’m recharging my brain rn 🔋💜",
        emotion: "sleepy",
        cooldown: true
      });
    }

    // Fallback
    return res.status(500).json({
      reply: "Something broke in my brain 😭",
      emotion: "shocked",
      cooldown: false
    });
  }
});

/* =========================
   SERVER START
========================= */
app.listen(3000, () => {
  console.log("✨ Nyla API running on Groq (LLaMA 3.1 Instant)");
});