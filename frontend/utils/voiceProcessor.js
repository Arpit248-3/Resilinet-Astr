export const processVoicePriority = (transcript, rmsLevel) => {
  // 1. Noise Gate
  if (rmsLevel < -40) return null;

  // 2. Priority Logic
  const criticalMap = {
    "FIRE": ["burn", "smoke", "fire"],
    "MEDICAL": ["heart", "breath", "blood", "pain"],
    "SECURITY": ["gun", "attacker", "kill"]
  };

  let detectedType = "GENERAL";
  let priority = "MEDIUM";
  const cleanTranscript = transcript.toLowerCase();

  Object.keys(criticalMap).forEach(category => {
    criticalMap[category].forEach(word => {
      if (cleanTranscript.includes(word)) {
        detectedType = category;
        priority = "CRITICAL";
      }
    });
  });

  return {
    type: detectedType,
    priority: priority,
    ai_insight: `[AI] Detected ${detectedType} emergency from voice signal.`,
    contact: "6260055671"
  };
};