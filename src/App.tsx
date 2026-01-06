import { useEffect, useState } from 'react'
import './App.css'
import type { Question } from './interfaces/question.interface';
import type { IncomingGameMessage, Match, OutgoingGameMessage } from './interfaces/Types';
import type { Explanation } from './interfaces/explanation.interface';


function App() {
  //const [currentQuestion, setCurrentQuestion] = useState<Question>();
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  const [displayQuestions, setDisplayQuestions] = useState<Question[]>([]);
  const [displayExplanations, setDisplayExplanations] = useState<Explanation[]>([]);
  const [disabledExplanationIds, setDisabledExplanationIds] = useState<string[]>([]);
  
  const [matches, setMatches] = useState<Match[]>([]);
  //const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

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
  const buildAllQuestions = (currentQuestion: Question | undefined, questions: Question[]): Question[] => {
  if (!currentQuestion) return questions;
  const exists = questions.some(q => q._id === currentQuestion._id);
  return exists ? questions : [currentQuestion, ...questions];
};

  // Función para construir la pool de explicaciones
const buildExplanationPool = (allQuestions: Question[]): Explanation[] => {
  const pool = allQuestions.flatMap(q => q.explanations || []);
  return uniqById(pool);
};

// Función para seleccionar preguntas a mostrar
const pickDisplayQuestions = (all: Question[], mainId: string | undefined, count = 4): Question[] => {
 if (!mainId) return shuffle(all).slice(0, count);

  const main = all.find(q => q._id === mainId);
  const others = all.filter(q => q._id !== mainId);

  // Seleccionamos n-1 preguntas adicionales
  const pickedOthers = shuffle(others).slice(0, count - 1);

  // Mezclamos la principal con las otras seleccionadas
  return shuffle([main!, ...pickedOthers]);
};

// Función para seleccionar explicaciones a mostrar
const pickDisplayExplanations = (
  pool: Explanation[],
  mainQuestion: Question | undefined,
  count = 4
): Explanation[] => {
  if (pool.length <= count) return shuffle(pool);

  const mainExps = mainQuestion?.explanations || [];
  const mainExpsUnique = uniqById(mainExps);

  const result: Explanation[] = [];
  // Incluya siempre una explicación de la pregunta principal si está disponible.
  if (mainExpsUnique.length > 0) {
    result.push(mainExpsUnique[Math.floor(Math.random() * mainExpsUnique.length)]);
  }

  // rellene el resto desde la pool sin duplicados
  const remainingPool = pool.filter(p => !result.some(r => r._id === p._id));
  const picked = shuffle(remainingPool).slice(0, count - result.length);
  return shuffle([...result, ...picked]);
};
// Función para verificar si una explicación coincide con la pregunta seleccionada
const isCorrectMatch = (question: Question | undefined, explanation: Explanation | undefined): boolean => {
  if (!question || !explanation) return false;
  return (question.explanations || []).some(e => e._id === explanation._id);
};
// Manejar la selección de una explicación
const handleMatch = (explanationId: string) => {
  if (!selectedQuestion) return;

  // Evitar usar explicaciones ya usadas
  if (disabledExplanationIds.includes(explanationId)) return;

  const q = displayQuestions.find(q => q._id === selectedQuestion);
  const exp = displayExplanations.find(e => e._id === explanationId);

  const correct = isCorrectMatch(q, exp);

  const newMatch: Match = {
    questionId: selectedQuestion,
    explanationId,
    isCorrect: correct,
  };
  setMatches(prev => [...prev, newMatch]);
  setDisabledExplanationIds(prev => [...prev, explanationId]);

  // limpiar selección
  setSelectedQuestion(null);
};

 const getMatchResultForQuestion = (questionId: string) =>
  matches.find(m => m.questionId === questionId);

 const isExplanationUsed = (explanationId: string) =>
  matches.some(m => m.explanationId === explanationId);

// Enviar resultados al host
const sendResultsToHost = () => {
  const message: OutgoingGameMessage = {
    type: "MATCH_COMPLETED",
    payload: {
      matches,
      correctMatches: matches.filter(m => m.isCorrect).length,
      totalMatches: displayQuestions.length,
    },
  };

  window.parent.postMessage(message, "*");
};


  useEffect(() => {
    const messageHandler = (event: MessageEvent<IncomingGameMessage>) => {
      //Validar Origen (Seguridad)
      const allowedOrigins =
        import.meta.env.VITE_IFRAME_ORIGIN?.split(",").map((o: string) =>
          o.trim()
        ) || [];

      // Allow null origin for PWA standalone mode
      // When installed as PWA on Android/iOS, origin is often null
      const isAllowedOrigin =
        event.origin === "null" || allowedOrigins.includes(event.origin);

      if (!isAllowedOrigin) {
        console.error(
          "Origin not allowed:",
          event.origin,
          "Allowed origins:",
          allowedOrigins
        );
        return;
      }
       // Validar Estructura del Mensaje
      if (!event.data.currentQuestion || !event.data.questions) {
        setError("Invalid data received");
        return;
      }
      
       // Normalizamos datos que vienen del host
       const normalizedCurrent = normalizeQuestion(
        event.data.currentQuestion
      );

       const normalizedQuestions = event.data.questions.map(
         normalizeQuestion
    );

// Construimos el pool total asegurando la pregunta principal
const allQ = buildAllQuestions(
  normalizedCurrent,
  normalizedQuestions
);

      
       const qDisplay = pickDisplayQuestions(
        allQ,
        normalizedCurrent._id,
        4
      );

      const pool = buildExplanationPool(allQ);

      const expDisplay = pickDisplayExplanations(
        pool,
        normalizedCurrent,
        4
      );

      
      setDisplayQuestions(qDisplay);
      setDisplayExplanations(expDisplay);
      setError(null);


    };

    window.addEventListener("message", messageHandler);

    return () => {
      window.removeEventListener("message", messageHandler);
    };
   

  }, []);
    // UI mínima
   return (
       <>
       <div style={{ display: "flex", gap: "3rem" }}>
       {/* Preguntas */}
       <div>
         <h3>Preguntas</h3>
            {displayQuestions.map((q) => {
           const match = getMatchResultForQuestion(q._id);

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
          ? match.isCorrect
            ? "#dcfce7" // verde
            : "#fee2e2" // rojo
          : selectedQuestion === q._id
          ? "#e0e7ff" // seleccionado
          : "#fff",
        borderColor: match
          ? match.isCorrect
            ? "#22c55e"
            : "#ef4444"
          : "#d1d5db",
      }}
    >
      <strong>{q.text}</strong>

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
        backgroundColor: used ? "#e5e7eb" : "#fff",
        opacity: used ? 0.6 : 1,
      }}
    >
      {e.text}
    </div>
  );
})}
         {error && (
        <p style={{ color: "red", marginBottom: "12px" }}>
         {error}
        </p>
         )}
       </div>

     </div><button onClick={sendResultsToHost} style={{ marginTop: "20px" }}>
         Finalizar Juego
       </button>
       </>
       

  );
}

export default App;

