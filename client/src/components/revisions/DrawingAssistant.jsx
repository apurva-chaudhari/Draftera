import { useState } from "react";
import drawingService from "../../services/drawingService.js";
import { Alert } from "../ui/Feedback.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";

const SUGGESTIONS = [
  "assistant.suggest.summary",
  "assistant.suggest.changed",
  "assistant.suggest.instructions",
];

function DrawingAssistant({ revisionId }) {
  const { t } = useI18n();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(text) {
    const q = text.trim();
    if (q.length < 3 || loading) return;

    setQuestion(q);
    setAsked(q);
    setAnswer("");
    setError("");
    setLoading(true);

    try {
      const response = await drawingService.askQuestion(revisionId, q);
      setAnswer(response.answer);
    } catch (requestError) {
      setError(requestError.message || t("assistant.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <strong>{t("assistant.title")}</strong>
      </div>

      <div className="card-body">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {SUGGESTIONS.map((key) => (
            <button key={key} type="button" className="btn btn-secondary" disabled={loading} onClick={() => ask(t(key))}>
              {t(key)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 220 }}
            type="text"
            maxLength={500}
            placeholder={t("assistant.placeholder")}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            aria-label={t("assistant.questionLabel")}
          />
          <button type="button" className="btn btn-primary" disabled={loading || question.trim().length < 3} onClick={() => ask(question)}>
            {loading ? t("assistant.reading") : t("assistant.ask")}
          </button>
        </div>

        {error && <div style={{ marginTop: 12 }}><Alert kind="error">{error}</Alert></div>}

        {answer && (
          <div style={{ marginTop: 14 }}>
            <p className="muted" style={{ margin: "0 0 6px" }}>{t("assistant.asked", { question: asked })}</p>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{answer}</div>
          </div>
        )}

        <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
          {t("assistant.disclaimer")}
        </p>
      </div>
    </section>
  );
}

export default DrawingAssistant;
