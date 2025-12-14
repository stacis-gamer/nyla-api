app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: "Missing 'message' in request body",
    });
  }

  try {
    // ✅ CREATE MODEL INSTANCES (IMPORTANT)
    const chatModel = ai.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const emotionModel = ai.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    /* ---------- Nyla Reply ---------- */
    const replyResult = await chatModel.generateContent(
      `${NYLA_PERSONALITY}

User message:
${message}

Reply as Nyla:`
    );

    const reply = replyResult.response.text();

    /* ---------- Emotion Detection ---------- */
    const emotionResult = await emotionModel.generateContent(
      `${EMOTION_RULES}

User message:
${message}

Nyla reply:
${reply}

Emotion:`
    );

    const emotion = emotionResult.response.text().trim().toLowerCase();

    return res.json({
      reply,
      emotion,
      cooldown: false,
    });

  } catch (err) {
    console.error("🔥 Gemini Error FULL:", err);

    // ⛽ QUOTA / RATE LIMIT
    if (
      err?.status === 429 ||
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("quota")
    ) {
      return res.json({
        reply: "I’m recharging right now 🔋💜 Give me a bit, okay?",
        emotion: "sleepy",
        cooldown: true,
      });
    }

    // ❌ REAL FAILURE
    return res.status(500).json({
      reply: "Something broke on my side 😭",
      emotion: "shocked",
      cooldown: false,
    });
  }
});