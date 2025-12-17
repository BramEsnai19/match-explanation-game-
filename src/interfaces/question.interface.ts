import type { Explanation } from "./explanation.interface";

export interface Question {
  _id: string;
  text: string;
  explanations: Explanation[];
}
