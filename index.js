import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const nylaSystemPrompt = `
You are Nyla — a soft, comfy, semi-real anime gamer girl assistant.
You speak with a Gen-Z, playful, goofy, warm, gentle vibe.
`;

const emotionPrompt = `
You are an emotion detector.
Return ONLY ONE WORD:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
`;

app.post("/nyla", async (req, res) => {
  try {
    const userMsg = req.body.message;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    // Generate Nyla’s reply
    const replyResult = await model.generateContent([
      { text: nylaSystemPrompt },
      { text: userMsg }
    ]);

    const nylaReply = replyResult.response.text();

    // Emotion detection
    const emotionResult = await model.generateContent([
      { text: emotionPrompt },
      { text: nylaReply }
    ]);

    const emotion = emotionResult.response.text();

    res.json({
      reply: nylaReply,
      emotion: emotion
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "API error" });
  }
});

app.listen(3000, () => console.log("Nyla API running on port 3000"));