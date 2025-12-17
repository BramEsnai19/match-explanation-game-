
export interface Explanation {
  _id: string;
  text: string;
  questionId: string;
  createdBy: string | null;
  status: string;
  createdAt: Date;
  updatedAt: string;
}