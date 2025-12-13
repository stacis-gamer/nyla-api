import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Emotion classifier prompt
const emotionSystemPrompt = `
You are an emotion-detection module.
Given a user message and assistant reply, respond ONLY with an emotion tag:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
`;

app.post("/nyla", async (req, res) => {
  try {
    const userMsg = req.body.message;

    // --- NYLA MAIN RESPONSE ---
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const nylaResp = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are Nyla, an anime gamer girl assistant. 
Use warm Gen-Z tone, goofy, playful, comfy. 
Reply to the user message: "${userMsg}".`,
            },
          ],
        },
      ],
    });

    const nylaReply = nylaResp.response.text();

    // --- EMOTION DETECTION ---
    const emotionModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const emotionResp = await emotionModel.generateContent({
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

    const emotion = emotionResp.response.text();

    res.json({
      reply: nylaReply,
      emotion: emotion,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "API error" });
  }
});

app.listen(3000, () => console.log("🔥 Nyla Gemini API running on port 3000"));