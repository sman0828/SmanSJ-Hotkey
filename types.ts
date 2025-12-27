
export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  categoryGroup: string;
  amount: number;
  date: string;
  note: string;
  description?: string;
  createdAt: number;
}

export interface Diary {
  date: string;
  content: string;
}