import type { Question } from "./question.interface";
import type { UserInfoInterface } from "./userInfo.interface";

export interface IncomingGameMessage {
  // Host → Juego: lista de preguntas para el juego
  currentQuestion: Question;
  otherQuestions: Question[]; 
  userInfo?: UserInfoInterface;
  
}
export interface Match {
  questionId: string;
  explanationId: string;
  isCorrect: boolean;
  pairColor: string;
}



