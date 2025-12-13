import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

// Emotion analyzer prompt
const emotionSystemPrompt = `
You are an emotion-detection module.
Given a user message and assistant reply, respond ONLY with an emotion tag:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
`;

app.post("/nyla", async (req, res) => {
  const userMsg = req.body.message;

  try {
    // Generate the assistant reply
    const nylaResult = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are Nyla, a soft, comfy, semi-real anime gamer girl. Speak warmly, playful, gen-z tone.\nUser: ${userMsg}`,
            },
          ],
        },
      ],
    });

    const nylaReply = nylaResult.response.text();

    // Analyze emotion
    const emotionResult = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${emotionSystemPrompt}\nUser: ${userMsg}\nAssistantReply: ${nylaReply}`,
            },
          ],
        },
      ],
    });

    const emotionTag = emotionResult.response.text();

    res.json({
      reply: nylaReply,
      emotion: emotionTag,
    });
  } catch (err) {
    console.error("API ERROR:", err);
    res.status(500).json({ error: "API error", details: String(err) });
  }
});

app.listen(3000, () => console.log("Nyla API running on port 3000"));