import "dotenv/config"; // <--- ADDED: Loads your API key
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
Keep replies relatively short and conversational.
`;

const emotionPrompt = `
Analyze the tone of the text below.
Return ONLY ONE WORD from this list:
happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
`;

app.post("/nyla", async (req, res) => {
  try {
    const userMsg = req.body.message;

    // 1. Configure the model with System Instructions for better roleplay
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: nylaSystemPrompt 
    });

    // 2. Generate Nyla's Reply
    const replyResult = await model.generateContent(userMsg);
    const nylaReply = replyResult.response.text();

    // 3. Detect Emotion (Separate call)
    // We create a temp model without the Nyla persona for pure logic
    const logicModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const emotionResult = await logicModel.generateContent([
      { text: emotionPrompt },
      { text: nylaReply } // Analyze her own reply
    ]);

    // Clean up the emotion string (remove spaces/newlines)
    const emotion = emotionResult.response.text().trim().toLowerCase();

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
