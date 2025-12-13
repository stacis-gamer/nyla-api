import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// SYSTEM PROMPTS
const nylaSystem = `
You are Nyla — a soft, comfy, semi-real anime gamer girl assistant.
Gen-Z tone, warm, playful, goofy.
`;

const emotionSystem = `
You detect emotions. Return only ONE word:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
`;

app.post("/nyla", async (req, res) => {
  try {
    const userMsg = req.body.message;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    // Generate Nyla's reply
    const reply = await model.generateContent({
      contents: [
        {
          role: "system",
          parts: [{ text: nylaSystem }]
        },
        {
          role: "user",
          parts: [{ text: userMsg }]
        }
      ]
    });

    const nylaReply = reply.response.text();

    // Emotion detection
    const emotion = await model.generateContent({
      contents: [
        {
          role: "system",
          parts: [{ text: emotionSystem }]
        },
        {
          role: "user",
          parts: [{ text: `User: ${userMsg}\nNyla: ${nylaReply}` }]
        }
      ]
    });

    const emotionTag = emotion.response.text();

    res.json({
      reply: nylaReply,
      emotion: emotionTag.trim()
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "API error" });
  }
});

app.listen(3000, () => console.log("Nyla API running on port 3000"));