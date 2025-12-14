import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      reply: "Say something first 😭",
      emotion: "shocked",
      cooldown: false,
    });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-001",
    });

    // Nyla reply
    const replyResult = await model.generateContent(
      `${NYLA_PERSONALITY}

User message:
${message}

Reply as Nyla:`
    );

    const reply =
      replyResult.response.text()?.trim() || "Heyyy 💜";

    // Emotion
    const emotionResult = await model.generateContent(
      `${EMOTION_RULES}

User message:
${message}

Nyla reply:
${reply}

Emotion:`
    );

    const emotion =
      emotionResult.response.text()?.trim().toLowerCase() || "happy";

    res.json({
      reply,
      emotion,
      cooldown: false,
    });

  } catch (err) {
    console.error("🔥 GEMINI ERROR:", err);

    if (
      err?.status === 429 ||
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("quota")
    ) {
      return res.json({
        reply: "I’m recharging right now 🔋💜",
        emotion: "sleepy",
        cooldown: true,
      });
    }

    res.status(500).json({
      reply: "Something broke on my side 😭",
      emotion: "shocked",
      cooldown: false,
    });
  }
});

app.listen(3000, () => {
  console.log("✨ Nyla API running on Gemini 1.5 Flash");
});