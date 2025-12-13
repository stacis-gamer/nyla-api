import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Emotion analyzer prompt
const emotionSystemPrompt = `
Detect the emotion of the assistant reply ONLY.
Possible tags: happy, sad, angry, blush, shocked, smug, sleepy, excited, gamer.
Respond with JUST the tag.
`;

app.post("/nyla", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "Missing 'message' in request body" });
  }

  try {
    // 1️⃣ Generate Nyla reply
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const replyResponse = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }]
        }
      ]
    });

    const nylaReply = replyResponse.response.text();

    // 2️⃣ Generate emotion tag
    const emotionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const emotionResponse = await emotionModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `User said: ${userMessage}\nAssistant replied: ${nylaReply}\nDetect emotion:`
            }
          ]
        }
      ]
    });

    const emotionTag = emotionResponse.response.text().trim();

    // return data
    res.json({
      reply: nylaReply,
      emotion: emotionTag
    });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: "API error", details: err.message });
  }
});

app.listen(3000, () => console.log("Nyla API running with Gemini 1.5 Flash"));