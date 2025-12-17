import type { Question } from "./question.interface";
import type { UserInfoInterface } from "./userInfo.interface";

export interface IncomingGameMessage {
  // Host → Juego: lista de preguntas para el juego
  currentQuestion: Question;
 // otherQuestions: Question[]; 
  questions: Question[];
  userInfo?: UserInfoInterface;
  
}
export interface Match {
  questionId: string;
  explanationId: string;
  isCorrect: boolean;
}


export interface OutgoingGameMessage {
  // Juego → Host: resultado
  type: "MATCH_COMPLETED" | "ANSWER_SELECTED" | "GAME_READY" | "GAME_ERROR";
  payload:{
    matches: Array<{
      questionId: string;
      explanationId: string;
      isCorrect: boolean;
    }>;
    correctMatches?: number;
    totalMatches?: number;
    error?: string;
  };
}