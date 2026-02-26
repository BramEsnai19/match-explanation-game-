import { useEffect, useState } from "react";
import "./App.css";
import type { Question } from "./interfaces/question.interface";
import type { IncomingGameMessage, Match } from "./interfaces/Types";
import type { Explanation } from "./interfaces/explanation.interface";

function App() {
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  const [displayQuestions, setDisplayQuestions] = useState<Question[]>([]);
  const [displayExplanations, setDisplayExplanations] = useState<Explanation[]>(
    [],
  );
  const [disabledExplanationIds, setDisabledExplanationIds] = useState<
    string[]
  >([]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const totalMatches = displayQuestions.length;
  const completedMatches = matches.length;
  const correctMatches = matches.filter((m) => m.isCorrect).length;
  const answeredCorrectly = totalMatches > 0 && correctMatches === totalMatches;
  const [mainQuestion, setMainQuestion] = useState<Question | null>(null);
  const mainMatch = matches.find((m) => m.questionId === mainQuestion?._id);

  const mainExplanation = displayExplanations.find(
    (e) => e._id === mainMatch?.explanationId,
  );

  const matchColors = [
    "#BFDBFE", // azul pastel
    "#FDE68A", // amarillo pastel
    "#C4B5FD", // lila pastel
    "#FBCFE8", // rosa pastel
    "#BBF7D0", // verde pastel
    "#FED7AA", // naranja pastel
  ];

  // Función para mezclar un array
  const shuffle = <T,>(arr: T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  // Función para eliminar duplicados por _id
  const uniqById = <T extends { _id: string }>(arr: T[]): T[] => {
    const map = new Map<string, T>();
    for (const it of arr) map.set(it._id, it);
    return Array.from(map.values());
  };

  const normalizeExplanation = (e: any): Explanation => ({
    ...e,
    text: e.text ?? e.explanationText,
  });

  const normalizeQuestion = (q: any): Question => ({
    ...q,
    text: q.text ?? q.questionText,
    explanations: (q.explanations || []).map(normalizeExplanation),
  });

  // Función para construir la lista completa de preguntas
  const buildAllQuestions = (
    currentQuestion: Question | undefined,
    questions: Question[],
  ): Question[] => {
    if (!currentQuestion) return questions;
    const exists = questions.some((q) => q._id === currentQuestion._id);
    return exists ? questions : [currentQuestion, ...questions];
  };

  // Función para seleccionar preguntas a mostrar
  const pickDisplayQuestions = (
    all: Question[],
    mainId: string | undefined,
    count = 4,
  ): Question[] => {
    if (!mainId) return shuffle(all).slice(0, count);

    const main = all.find((q) => q._id === mainId);
    const others = all.filter((q) => q._id !== mainId);

    const pickedOthers = shuffle(others).slice(0, count - 1);

    return shuffle([main!, ...pickedOthers]);
  };

  // Función para seleccionar explicaciones a mostrar
  const pickDisplayExplanations = (
    questions: Question[],
    count = 4,
  ): Explanation[] => {
    const correctExplanations: Explanation[] = [];

    questions.forEach((q) => {
      if (q.explanations && q.explanations.length > 0) {
        const unique = uniqById(q.explanations);
        const randomCorrect = unique[Math.floor(Math.random() * unique.length)];
        correctExplanations.push(randomCorrect);
      }
    });

    const pool = uniqById(questions.flatMap((q) => q.explanations || []));
    const remaining = pool.filter(
      (e) => !correctExplanations.some((c) => c._id === e._id),
    );
    const needed = Math.max(count - correctExplanations.length, 0);
    const fillers = shuffle(remaining).slice(0, needed);

    return shuffle([...correctExplanations, ...fillers]);
  };
  // Función para verificar si una explicación coincide con la pregunta seleccionada
  const isCorrectMatch = (
    question: Question | undefined,
    explanation: Explanation | undefined,
  ): boolean => {
    if (!question || !explanation) return false;
    return (question.explanations || []).some((e) => e._id === explanation._id);
  };

  const handleMatch = (explanationId: string) => {
    if (!selectedQuestion) return;

    // Evitar usar explicaciones ya usadas
    if (disabledExplanationIds.includes(explanationId)) return;

    const q = displayQuestions.find((q) => q._id === selectedQuestion);
    const exp = displayExplanations.find((e) => e._id === explanationId);

    if (!q || !exp) return;

    const correct = isCorrectMatch(q, exp);

    const colorIndex = matches.length % matchColors.length;
    const baseColor = matchColors[colorIndex];

    setMatches((prev) => [
      ...prev,
      {
        questionId: q._id,
        explanationId: exp._id,
        isCorrect: correct,
        pairColor: baseColor,
      },
    ]);
    setDisabledExplanationIds((prev) => [...prev, exp._id]);
    setSelectedQuestion(null);
  };

  const isExplanationUsed = (explanationId: string) =>
    matches.some((m) => m.explanationId === explanationId);

  const isGameCompleted =
    completedMatches === displayQuestions.length && displayQuestions.length > 0;

  useEffect(() => {
    const messageHandler = (event: MessageEvent<IncomingGameMessage>) => {
      //Validar Origen (Seguridad)
      const allowedOrigins =
        import.meta.env.VITE_IFRAME_ORIGIN?.split(",").map((o: string) =>
          o.trim(),
        ) || [];

      const isAllowedOrigin =
        event.origin === "null" || allowedOrigins.includes(event.origin);

      if (!isAllowedOrigin) {
        console.error(
          "Origin not allowed:",
          event.origin,
          "Allowed origins:",
          allowedOrigins,
        );
        return;
      }
      // Validar Estructura del Mensaje
      if (!event.data.currentQuestion || !event.data.otherQuestions) {
        console.error("Invalid data received", event.data);
        return;
      }

      const normalizedCurrent = normalizeQuestion(event.data.currentQuestion);

      const normalizedQuestions =
        event.data.otherQuestions.map(normalizeQuestion);
      setMainQuestion(normalizedCurrent);

      // Construimos el pool total asegurando la pregunta principal
      const allQ = buildAllQuestions(normalizedCurrent, normalizedQuestions);

      const qDisplay = pickDisplayQuestions(allQ, normalizedCurrent._id, 4);

      const expDisplay = pickDisplayExplanations(qDisplay, 4);

      setDisplayQuestions(qDisplay);
      setDisplayExplanations(expDisplay);
      setError(null);
    };

    window.addEventListener("message", messageHandler);

    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, []);
  // Enviar resultados al host
  const sendFinalResultToHost = () => {
    if (!mainQuestion) return;

    const answerData = {
      answeredCorrectly,
      questionId: mainQuestion._id,
      questionText: mainQuestion.questionText,
      userAnswer: mainExplanation?.explanationText || "",
    };

    const origins = import.meta.env.VITE_IFRAME_ORIGIN
      ? import.meta.env.VITE_IFRAME_ORIGIN.split(",").map((o: string) =>
          o.trim(),
        )
      : [];

    origins.forEach((origin: string) => {
      window.parent.postMessage(answerData, origin);
    });

    console.log("📤 Resultado FINAL enviado al host:", answerData);
  };

  // UI mínima
  return (
    <>
      <div style={{ display: "flex", gap: "3rem" }}>
        {/* Preguntas */}
        <div>
          <h3>Preguntas</h3>

          {displayQuestions.map((q) => {
            const match = matches.find((m) => m.questionId === q._id);

            return (
              <div
                key={q._id}
                onClick={() => {
                  if (!match) setSelectedQuestion(q._id);
                }}
                style={{
                  padding: "12px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  border: "2px solid",
                  cursor: match ? "default" : "pointer",
                  backgroundColor: match
                    ? match.pairColor
                    : selectedQuestion === q._id
                      ? "#e0e7ff"
                      : "#fff",
                  borderColor: match
                    ? match.isCorrect
                      ? "#22c55e"
                      : "#ef4444"
                    : "#d1d5db",

                  // 🔴 AGREGA ESTO
                  color: "#111827",
                }}
              >
                <strong>{q.questionText}</strong>

                {match && (
                  <div style={{ marginTop: "6px", fontSize: "20px" }}>
                    {match.isCorrect ? "✅" : "❌"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Explicaciones */}
        <div>
          <h3>Explicaciones</h3>

          {displayExplanations.map((e) => {
            const used = isExplanationUsed(e._id);

            const matchForExplanation = matches.find(
              (m) => m.explanationId === e._id,
            );

            return (
              <div
                key={e._id}
                onClick={() => {
                  if (!used && selectedQuestion) {
                    handleMatch(e._id);
                  }
                }}
                style={{
                  padding: "12px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  border: "2px solid #d1d5db",
                  cursor: used ? "not-allowed" : "pointer",
                  backgroundColor: matchForExplanation
                    ? matchForExplanation.pairColor
                    : "#fff",
                  opacity: used ? 0.6 : 1,

                  color: "#111827",
                }}
              >
                {e.explanationText}
              </div>
            );
          })}
          {error && (
            <p style={{ color: "red", marginBottom: "12px" }}>{error}</p>
          )}
        </div>
      </div>

      {isGameCompleted && (
        <div
          style={{
            marginTop: "24px",
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "#ecfeff",
            textAlign: "center",
            fontWeight: 600,
            color: "#0f172a",
            border: "2px solid #06b6d4",
          }}
        >
          Resultado final: {totalMatches} / {correctMatches} correctas
        </div>
      )}
      <button
        onClick={sendFinalResultToHost}
        style={{
          marginTop: "16px",
          padding: "10px 16px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#2563eb",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Enviar resultado
      </button>
    </>
  );
}

export default App;
