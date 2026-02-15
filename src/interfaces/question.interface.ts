import type { Explanation } from "./explanation.interface";

export interface Question {
  _id: string;
  questionText: string;
  explanations: Explanation[];
}
