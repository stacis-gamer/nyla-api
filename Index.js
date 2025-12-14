app.post("/nyla", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      reply: "You gotta say something 😭",
      emotion: "shocked",
      cooldown: false,
    });
  }

  try {
    /* =========================
       MODEL INSTANCE
    ========================= */
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    /* =========================
       NYLA REPLY
    ========================= */
    const replyResult = await model.generateContent(`
${NYLA_PERSONALITY}

User message:
${message}

Reply as Nyla:
`);

    const reply = replyResult.response.text().trim();

    /* =========================
       EMOTION DETECTION
    ========================= */
    const emotionResult = await model.generateContent(`
${EMOTION_RULES}

User message:
${message}

Nyla reply:
${reply}

Emotion:
`);

    let emotion = emotionResult.response.text().trim().toLowerCase();

    /* =========================
       EMOTION SANITIZER
    ========================= */
    const allowedEmotions = [
      "happy",
      "sad",
      "angry",
      "blush",
      "shocked",
      "smug",
      "sleepy",
      "excited",
      "gamer",
    ];

    if (!allowedEmotions.includes(emotion)) {
      emotion = "happy"; // safe fallback
    }

    return res.json({
      reply,
      emotion,
      cooldown: false,
    });

  } catch (err) {
    console.error("🔥 Gemini Error FULL:", err);

    /* =========================
       RATE LIMIT / QUOTA
    ========================= */
    if (
      err?.status === 429 ||
      err?.message?.includes("RESOURCE_EXHAUSTED") ||
      err?.message?.includes("quota")
    ) {
      return res.json({
        reply: "I’m recharging rn 🔋💤 Come back in a bit, okay?",
        emotion: "sleepy",
        cooldown: true,
      });
    }

    /* =========================
       HARD FAIL
    ========================= */
    return res.status(500).json({
      reply: "Something broke on my side 😭",
      emotion: "shocked",
      cooldown: false,
    });
  }
});