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
  const [mainQuestion, setMainQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  

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

    setMatches((prev) => {
      const newMatch = [
        ...prev,
        {
          questionId: q._id,
          explanationId: exp._id,
          isCorrect: correct,
          pairColor: baseColor,
        },
      ];

       if (newMatch.length === displayQuestions.length) {
    const total = displayQuestions.length;
    const correctCount = newMatch.filter((m) => m.isCorrect).length;
    const allCorrect = total > 0 && correctCount === total;

    setTimeout(() => {
    sendFinalResultToHost(newMatch, allCorrect);
  }, 1500);
   }

      return newMatch;
    });
    setDisabledExplanationIds((prev) => [...prev, exp._id]);
    setSelectedQuestion(null);
  };

  const isExplanationUsed = (explanationId: string) =>
    matches.some((m) => m.explanationId === explanationId);

  const isGameCompleted =
    completedMatches === displayQuestions.length && displayQuestions.length > 0;

  useEffect(() => {
    const messageHandler = (event: MessageEvent<IncomingGameMessage>) => {

      setIsLoading(true);
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
      setIsLoading(false);
    };


    window.addEventListener("message", messageHandler);

    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, []);

  if (isLoading) {
  return (
      <div className="min-h-full w-full flex justify-center items-center flex-col select-none bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100">
        {/* Animated gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Animated brain icon */}
          <div className="mb-8 text-7xl animate-pulse">
            <span
              className="inline-block animate-bounce"
              style={{ animationDelay: "0s" }}
            >
              🧠
            </span>
          </div>

          {/* Text */}
          <h1 className="text-3xl font-bold text-gray-800 mb-3 text-center">
            Pensando en una explicación...
          </h1>

          <p className="text-gray-600 text-lg mb-6 text-center max-w-xs">
            Preparando tu desafío mental
          </p>

          {/* Loading dots */}
          <div className="flex gap-2">
            <div
              className="w-3 h-3 bg-blue-300 rounded-full animate-bounce"
              style={{ animationDelay: "0s" }}
            ></div>
            <div
              className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </div>
      </div>
    );
}



  // Enviar resultados al host
  const sendFinalResultToHost = (
    finalMatches: Match[],
    answeredCorrectly: boolean,
  ) => {
    if (!mainQuestion) return;

    const mainMatch = finalMatches.find(
    (m) => m.questionId === mainQuestion._id
  );
    const mainExplanation = displayExplanations.find(
    (e) => e._id === mainMatch?.explanationId
  );

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
    </>
  );
}

export default App;
