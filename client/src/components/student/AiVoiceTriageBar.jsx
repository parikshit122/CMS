import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useToast } from "../common/Alert";

const LANGUAGES = [
  { code: "en", label: "English", speechLocale: "en-IN" },
  { code: "mr", label: "मराठी", speechLocale: "mr-IN" },
  { code: "hi", label: "हिन्दी", speechLocale: "hi-IN" },
];

const SLA_LABEL = {
  urgent: "Urgent (4h SLA)",
  high: "High (24h SLA)",
  medium: "Medium (72h SLA)",
  low: "Low (7d SLA)",
};

export default function AiVoiceTriageBar({
  form,
  language,
  onLanguageChange,
  onVoiceTranscript,
  onApplyAiSuggestions,
}) {
  const toast = useToast();
  const navigate = useNavigate();

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [endorsingId, setEndorsingId] = useState(null);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleVoiceToggle = async () => {
    if (recording) {
      stopRecording();
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    const activeLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

    // Primary path: Instant native Web Speech API (EN / MR / HI)
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = activeLang.speechLocale;
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setRecording(true);
        recognition.onerror = (event) => {
          setRecording(false);
          if (event.error !== "no-speech" && event.error !== "aborted") {
            toast.error(`Voice input error (${event.error}). You can also type directly.`);
          }
        };
        recognition.onend = () => {
          setRecording(false);
          recognitionRef.current = null;
        };
        recognition.onresult = (event) => {
          const spoken = Array.from(event.results)
            .map((r) => r[0]?.transcript || "")
            .join(" ")
            .trim();
          if (spoken) {
            onVoiceTranscript(spoken, language);
            toast.success(`Captured ${activeLang.label} voice transcript.`);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // Fall through to MediaRecorder + server Gemini audio transcription
      }
    }

    // Fallback path: MediaRecorder -> server-side gemini-3.5-transcribe
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          if (blob.size < 100) return;

          setTranscribing(true);
          try {
            const fd = new FormData();
            fd.append("audio", blob, "voice-complaint.webm");
            fd.append("language", language);
            const res = await API.post("/ai/transcribe", fd);
            if (res.data?.success && res.data.data?.transcript) {
              onVoiceTranscript(res.data.data.transcript, language);
              toast.success("Voice audio transcribed via Gemini.");
            }
          } catch (err) {
            toast.error(err?.response?.data?.message || "Server audio transcription failed.");
          } finally {
            setTranscribing(false);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setRecording(true);
        toast.info("Recording audio... Tap Stop when finished speaking.");
      } catch {
        toast.error("Microphone permission unavailable. Please type your complaint directly.");
      }
    } else {
      toast.error("Voice recording is not supported in this browser.");
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!form.title.trim() && !form.description.trim()) {
      setAiError("Enter or dictate a complaint description first so AI can classify and check duplicates.");
      return;
    }
    setAnalyzing(true);
    setAiError("");
    try {
      const res = await API.post("/ai/triage", {
        title: form.title,
        description: form.description,
        location: form.location,
        language,
      });
      if (res.data?.success) {
        setAiResult(res.data.data);
      } else {
        setAiError(res.data?.message || "AI analysis failed.");
      }
    } catch (err) {
      setAiError(
        err?.response?.data?.message ||
          "AI triage service is currently unavailable. You can still submit your complaint manually."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEndorseDuplicate = async (dup) => {
    if (endorsingId) return;
    setEndorsingId(dup.id);
    try {
      const res = await API.post(`/complaints/${dup.id}/endorse`);
      if (res.data?.success) {
        toast.success(res.data.message);
        navigate("/complaints", { replace: true });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not endorse existing ticket.");
    } finally {
      setEndorsingId(null);
    }
  };

  return (
    <div style={{ marginBottom: "18px" }}>
      {/* Language + Voice Dictation + AI Triage Bar */}
      <div className="av-intake-toolbar">
        <div className="av-lang-group" role="group" aria-label="Complaint language">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`av-lang-btn ${language === l.code ? "is-active" : ""}`}
              onClick={() => onLanguageChange(l.code)}
              aria-pressed={language === l.code}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            type="button"
            className={`av-voice-btn ${recording ? "is-recording" : ""}`}
            onClick={handleVoiceToggle}
            disabled={transcribing}
            aria-label={recording ? "Stop voice dictation" : "Start voice dictation"}
          >
            <i className={`bx ${recording ? "bx-stop-circle" : "bx-microphone"}`} aria-hidden="true" />
            {transcribing
              ? "Transcribing..."
              : recording
                ? "Stop Dictation"
                : "Voice Dictate"}
          </button>

          <button
            type="button"
            className="av-btn av-btn--primary av-btn--compact"
            onClick={handleAnalyzeWithAI}
            disabled={analyzing}
          >
            <i className="bx bx-brain" aria-hidden="true" />
            {analyzing ? "Analyzing with AI..." : "Analyze with AI"}
          </button>
        </div>
      </div>

      {aiError && (
        <p style={{ color: "var(--av-danger)", fontSize: "0.84rem", marginBottom: "10px" }} role="alert">
          {aiError}
        </p>
      )}

      {/* Structured Gemini Triage & Semantic Duplicate Detection Output */}
      {aiResult && (
        <div className="av-ai-panel" aria-live="polite">
          <div className="av-ai-panel__head">
            <div>
              <div className="av-mono" style={{ fontSize: "0.75rem", color: "var(--av-primary)", fontWeight: 700 }}>
                AI SMART TRIAGE · {aiResult.confidence}% CONFIDENCE
              </div>
              <div style={{ fontSize: "0.86rem", color: "var(--av-ink-muted)", marginTop: "2px" }}>
                {aiResult.rationale}
              </div>
            </div>

            <button
              type="button"
              className="av-btn av-btn--primary av-btn--compact"
              onClick={() => {
                onApplyAiSuggestions(aiResult);
                toast.success("Applied AI category, priority, and clean English text.");
              }}
            >
              <i className="bx bx-check" aria-hidden="true" />
              Apply AI Suggestions
            </button>
          </div>

          <div className="av-ai-metrics">
            <div>
              <div style={{ fontSize: "0.74rem", color: "var(--av-ink-muted)" }}>Predicted Category</div>
              <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{aiResult.category}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.74rem", color: "var(--av-ink-muted)" }}>Recommended Priority</div>
              <div style={{ fontWeight: 700 }}>
                {SLA_LABEL[aiResult.priority] || aiResult.priority}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.74rem", color: "var(--av-ink-muted)" }}>Detected Language</div>
              <div className="av-mono" style={{ fontWeight: 700 }}>
                {String(aiResult.detectedLanguage || language).toUpperCase()}
              </div>
            </div>
          </div>

          {aiResult.aiSummary && (
            <p style={{ fontSize: "0.85rem", color: "var(--av-ink)", marginBottom: "4px" }}>
              <strong>Executive Summary:</strong> {aiResult.aiSummary}
            </p>
          )}

          {/* Semantic Duplicate Matches */}
          {Array.isArray(aiResult.duplicates) && aiResult.duplicates.length > 0 && (
            <div className="av-dup-list">
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--av-warning)" }}>
                Similar Active Campus Report{aiResult.duplicates.length > 1 ? "s" : ""} Detected — Avoid Duplicate Filing
              </div>
              {aiResult.duplicates.map((dup) => (
                <div key={dup.complaintId} className="av-dup-card">
                  <div style={{ flex: "1 1 220px" }}>
                    <div className="av-mono" style={{ fontSize: "0.76rem", fontWeight: 700 }}>
                      {dup.complaintId} · {dup.similarityScore}% match · {dup.endorsementCount} affected
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginTop: "2px" }}>
                      {dup.title}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--av-ink-muted)" }}>
                      {dup.matchReason} · Status: {dup.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="av-btn av-btn--secondary av-btn--compact"
                    onClick={() => handleEndorseDuplicate(dup)}
                    disabled={endorsingId === dup.id}
                  >
                    <i className="bx bx-upvote" aria-hidden="true" />
                    {endorsingId === dup.id ? "Linking..." : "I Have This Issue Too (+1)"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
