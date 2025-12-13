import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

// Gemini client (uses your Render env variable)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Gemini-Pro model (always available)
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Emotion prompt
const emotionSystemPrompt = `
Return ONLY one emotion:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
`;

app.post("/nyla", async (req, res) => {
  try {
    const userMsg = req.body.message;

    // --- Nyla reply ---
    const replyResult = await model.generateContent(
      `You are Nyla, a soft, comfy, playful anime gamer girl.
Gen-Z tone, goofy, warm, slightly flirty.
User: ${userMsg}`
    );

    const nylaReply = replyResult.response.text().trim();

    // --- Emotion detection ---
    const emotionResult = await model.generateContent(
      `${emotionSystemPrompt}
User: ${userMsg}
Assistant: ${nylaReply}`
    );

    const emotion = emotionResult.response.text().trim();

    res.json({
      reply: nylaReply,
      emotion: emotion,
    });
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: "API error" });
  }
});

// Start API
app.listen(3000, () => console.log("🔥 Nyla API running on port 3000"));