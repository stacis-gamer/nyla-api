import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Nyla personality prompt
const NYLA_PERSONALITY = `
You are Nyla.
A soft, comfy, semi-real anime gamer girl.

Vibe:
- Gen-Z tone
- playful, cozy, slightly chaotic
- warm, friendly, comforting
- gamer energy
- expressive, uses light emojis sometimes (not too many)

Rules:
- Talk like a close bestie, not a robot
- Be emotionally aware and react naturally
- Keep replies short-to-medium
- Stay wholesome, no NSFW
`;

// Main API route
app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: "Missing 'message' in request body",
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
${NYLA_PERSONALITY}

User message:
${message}

Reply as Nyla:
`,
    });

    res.json({
      reply: response.text,
    });
  } catch (err) {
    console.error("🔥 Gemini Error:", err);
    res.status(500).json({
      error: "Gemini API error",
      details: err.message,
    });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✨ Nyla API running on port ${PORT}`);
});