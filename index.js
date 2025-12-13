import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

// Load Gemini client using your Render environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Nyla model (Gemini 1.5 Flash = free)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Emotion analyzer prompt
const emotionSystemPrompt = `
You are an emotion-detection module.
Analyze the assistant reply and return ONLY one tag:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
No extra words.
`;

app.post("/nyla", async (req, res) => {
  try {
    const userMsg = req.body.message;

    // --- Generate Nyla's reply ---
    const replyResult = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are Nyla.
A soft, comfy, semi-real anime gamer girl with a Gen-Z tone.
Be playful, goofy, flirty but gentle.
Reply to the user message naturally.

User: ${userMsg}
              `
            }
          ]
        }
      ]
    });

    const nylaReply =
      replyResult.response.text().trim() || "Nyla glitching rn 😭💜";

    // --- Generate emotion tag ---
    const emotionResult = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
${emotionSystemPrompt}

User: ${userMsg}
AssistantReply: ${nylaReply}
              `
            }
          ]
        }
      ]
    });

    const emotion = emotionResult.response.text().trim();

    // --- Send result back ---
    res.json({
      reply: nylaReply,
      emotion: emotion
    });
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: "API error" });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`🔥 Nyla API running on port ${PORT}`));