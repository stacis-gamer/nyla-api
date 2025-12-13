import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Nyla personality
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

// Emotion rules
const EMOTION_RULES = `
Return ONLY ONE word from this list:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
No extra text.
`;

app.post("/nyla", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing 'message' in request body" });
  }

  try {
    // 1) Nyla reply
    const replyRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
${NYLA_PERSONALITY}

User message:
${message}

Reply as Nyla:
`,
    });

    const reply = replyRes.text;

    // 2) Emotion detection
    const emotionRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
${EMOTION_RULES}

User message:
${message}

Nyla reply:
${reply}

Emotion:
`,
    });

    const emotion = emotionRes.text.trim().toLowerCase();

    res.json({ reply, emotion });
  } catch (err) {
    console.error("🔥 Gemini Error:", err);
    res.status(500).json({ error: "Gemini API error", details: err.message });
  }
});

app.listen(3000, () => {
  console.log("✨ Nyla API running with emotions");
});