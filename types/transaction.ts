export interface Transaction {
  date: string;
  deposit: number;
  withdrawal: number;
  balance: number;
  description: string;
  branch?: string;
  bank?: string;
} 