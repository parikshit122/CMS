/**
 * Server-side Gemini AI service for ComplaintSync — Avishkar Edition.
 * Uses @google/genai exclusively on the server (GEMINI_API_KEY never touches client).
 * Models:
 *   - gemini-4-hydrogen: fast structured JSON triage, Marathi/Hindi/English normalization, semantic duplicate detection
 *   - gemini-3.5-transcribe: server-side audio transcription fallback when browser Web Speech API is unavailable
 */

const { GoogleGenAI, Type, ThinkingLevel } = require("@google/genai");
const { rankCandidateDuplicates } = require("../../src/lib/avishkar-logic.ts");

const ALLOWED_CATEGORIES = [
  "infrastructure",
  "cleanliness",
  "electrical",
  "plumbing",
  "safety",
  "it",
  "academic",
  "other",
];

const ALLOWED_PRIORITIES = ["low", "medium", "high", "urgent"];

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    const err = new Error(
      "AI service is not configured on the server (GEMINI_API_KEY missing)."
    );
    err.statusCode = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Analyzes a campus complaint (in English, Marathi, or Hindi), predicts category,
 * priority, SLA rationale, English normalization, and checks for semantic duplicates
 * against open campus complaints.
 */
async function triageComplaintWithAI({
  title = "",
  description = "",
  location = "",
  language = "en",
  openComplaints = [],
}) {
  const cleanTitle = String(title || "").trim();
  const cleanDesc = String(description || "").trim();

  if (!cleanTitle && !cleanDesc) {
    const err = new Error("Please enter or dictate a complaint description before running AI analysis.");
    err.statusCode = 400;
    throw err;
  }

  const ai = getAiClient();

  // Provide up to 25 recent open complaints for semantic duplicate detection
  const candidateContext = openComplaints.slice(0, 25).map((c) => ({
    id: c.id,
    complaintId: c.complaintId,
    title: c.title,
    category: c.category,
    location: c.location || "",
    status: c.status,
    endorsementCount: Math.max(1, Number(c.endorsementCount || 1)),
  }));

  const prompt = `You are the AI Smart Triage & Duplicate Detection Engine for Smart Campus ComplaintSync.
Analyze the incoming student complaint (which may be written or dictated in English, Marathi, or Hindi).

Incoming report:
- Language hint: ${language}
- Location: ${location || "Not specified"}
- Title: ${cleanTitle || "(none yet)"}
- Description: ${cleanDesc}

Active open campus complaints (check for semantic duplicates — same physical issue, same or nearby location, even if written in a different language):
${JSON.stringify(candidateContext)}

Return a strict JSON object with:
1. category: one of ${JSON.stringify(ALLOWED_CATEGORIES)}
2. priority: one of ${JSON.stringify(ALLOWED_PRIORITIES)} (use "urgent" for electrical/fire/safety/water hazards near wiring or urgent exam blockers; "high" for lab/projector/sanitation disruptions; "medium" for routine maintenance; "low" for minor requests)
3. confidence: integer 50-99
4. normalizedTitle: concise, clear professional English title (max 85 chars)
5. normalizedDescription: clear English translation/polishing of the complaint preserving all factual details (max 420 chars)
6. aiSummary: 1-sentence executive summary for campus staff (max 140 chars)
7. rationale: short explanation of why this category and priority were chosen (max 140 chars)
8. detectedLanguage: "en" | "mr" | "hi"
9. duplicateMatches: array (0 to 3 items) of genuinely matching active open complaints from the list above with exact complaintId, similarityScore (50-99), and short matchReason. Only include real matches.`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ALLOWED_CATEGORIES },
            priority: { type: Type.STRING, enum: ALLOWED_PRIORITIES },
            confidence: { type: Type.INTEGER },
            normalizedTitle: { type: Type.STRING },
            normalizedDescription: { type: Type.STRING },
            aiSummary: { type: Type.STRING },
            rationale: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING, enum: ["en", "mr", "hi"] },
            duplicateMatches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  complaintId: { type: Type.STRING },
                  similarityScore: { type: Type.INTEGER },
                  matchReason: { type: Type.STRING },
                },
                required: ["complaintId", "similarityScore", "matchReason"],
              },
            },
          },
          required: [
            "category",
            "priority",
            "confidence",
            "normalizedTitle",
            "normalizedDescription",
            "aiSummary",
            "rationale",
            "detectedLanguage",
            "duplicateMatches",
          ],
        },
      },
    });
  } catch (apiErr) {
    throw formatGeminiError(apiErr);
  }

  const rawText = response.text;
  if (!rawText) {
    throw new Error("AI triage returned an empty response.");
  }

  const parsed = JSON.parse(rawText);

  // Hydrate AI-matched duplicates against actual DB rows so IDs & counts are authoritative
  const byCode = new Map(openComplaints.map((c) => [c.complaintId, c]));
  const aiDuplicates = (parsed.duplicateMatches || [])
    .map((m) => {
      const row = byCode.get(m.complaintId);
      if (!row) return null;
      return {
        id: row.id,
        complaintId: row.complaintId,
        title: row.title,
        category: row.category,
        location: row.location || "Campus",
        status: row.status,
        endorsementCount: Math.max(1, Number(row.endorsementCount || 1)),
        similarityScore: Math.min(99, Math.max(50, Number(m.similarityScore || 75))),
        matchReason: String(m.matchReason || "Similar active campus report"),
      };
    })
    .filter(Boolean);

  // Merge deterministic lexical duplicates if AI returned none (adds extra safety without fabricating)
  const lexicalDuplicates = rankCandidateDuplicates(
    {
      title: parsed.normalizedTitle || cleanTitle,
      description: parsed.normalizedDescription || cleanDesc,
      category: parsed.category,
      location,
    },
    openComplaints,
    3
  );

  const mergedMap = new Map();
  for (const d of [...aiDuplicates, ...lexicalDuplicates]) {
    if (!mergedMap.has(d.complaintId)) {
      mergedMap.set(d.complaintId, d);
    }
  }

  return {
    category: ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : "other",
    priority: ALLOWED_PRIORITIES.includes(parsed.priority) ? parsed.priority : "medium",
    confidence: Math.min(99, Math.max(50, Number(parsed.confidence || 85))),
    normalizedTitle: String(parsed.normalizedTitle || cleanTitle).slice(0, 100),
    normalizedDescription: String(parsed.normalizedDescription || cleanDesc).slice(0, 500),
    aiSummary: String(parsed.aiSummary || "").slice(0, 180),
    rationale: String(parsed.rationale || "").slice(0, 180),
    detectedLanguage: ["en", "mr", "hi"].includes(parsed.detectedLanguage)
      ? parsed.detectedLanguage
      : language,
    duplicates: Array.from(mergedMap.values()).slice(0, 3),
    model: "gemini-4-hydrogen",
  };
}

/**
 * Server-side audio transcription fallback using gemini-3.5-transcribe.
 * Supports English, Marathi, and Hindi campus voice complaints.
 */
async function transcribeVoiceAudio({ buffer, mimeType = "audio/webm", language = "en" }) {
  if (!buffer || !buffer.length) {
    const err = new Error("Audio recording is empty.");
    err.statusCode = 400;
    throw err;
  }

  const ai = getAiClient();
  const langLabel =
    language === "mr" ? "Marathi" : language === "hi" ? "Hindi" : "English";

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: [
        {
          inlineData: {
            mimeType,
            data: buffer.toString("base64"),
          },
        },
        `Transcribe this campus complaint audio faithfully in ${langLabel}. Output only the spoken transcript text with no extra commentary.`,
      ],
    });
  } catch (apiErr) {
    throw formatGeminiError(apiErr);
  }

  const transcript = String(response.text || "").trim();
  if (!transcript) {
    throw new Error("Could not transcribe speech from audio. Please try speaking closer to the microphone.");
  }

  return {
    transcript,
    language,
    model: "gemini-3.5-transcribe",
  };
}

function formatGeminiError(err) {
  const raw = String(err?.message || "");
  if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(raw)) {
    const friendly = new Error(
      "AI triage could not authenticate with the server GEMINI_API_KEY. Please verify your key in Settings > Secrets, or continue submitting manually."
    );
    friendly.statusCode = 503;
    return friendly;
  }
  if (/RESOURCE_EXHAUSTED|429|quota/i.test(raw)) {
    const friendly = new Error(
      "AI triage is temporarily rate-limited. Please wait a moment or continue submitting manually."
    );
    friendly.statusCode = 429;
    return friendly;
  }
  try {
    const parsed = JSON.parse(raw);
    const cleanMsg = parsed?.error?.message;
    if (cleanMsg) {
      const friendly = new Error(`AI service error: ${cleanMsg}`);
      friendly.statusCode = parsed?.error?.code === 400 ? 502 : 503;
      return friendly;
    }
  } catch {
    // not JSON
  }
  const friendly = new Error(raw || "AI triage is temporarily unavailable. You can still submit manually.");
  friendly.statusCode = err?.statusCode || 503;
  return friendly;
}

module.exports = {
  triageComplaintWithAI,
  transcribeVoiceAudio,
};

