import express from "express";
import OpenAI from "openai";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "You are Nyla, a soft, comfy, semi-real anime gamer girl assistant. Speak warmly, Gen-Z tone, playful, gentle.",
        },
        { role: "user", content: userMsg },
      ],
    });

    const nylaReply = completion.choices[0].message.content;

    const emotion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: emotionSystemPrompt },
        {
          role: "user",
          content: `User: ${userMsg}\nAssistantReply: ${nylaReply}`,
        },
      ],
    });

    const emotionTag = emotion.choices[0].message.content;

    res.json({
      reply: nylaReply,
      emotion: emotionTag,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "API error" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Nyla API running on port", process.env.PORT || 3000);
});