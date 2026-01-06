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
  type: string;
}

export interface GameResultMessage extends OutgoingGameMessage {
  type: "GAME_COMPLETED";
  gameId: string;
  totalQuestions: number;
  correctAnswers: number;
  attempts: number;
  matches: {
    questionId: string;
    explanationId: string;
    isCorrect: boolean;
  }[];
}

