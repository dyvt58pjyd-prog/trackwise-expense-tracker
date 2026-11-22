export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';

export interface User {
  id?: number;
  username: string;
  name: string;
  passwordHash: string;
  pinHash?: string;
  salt: string;
  currency: string;
  theme: 'dark' | 'light';
  autoLockMinutes: number; // 0 for Never, 5, 15, 30
  createdAt: number;
}

export interface Category {
  id?: number;
  userId: number;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  budgetLimit?: number;
}

export interface Transaction {
  id?: number;
  userId: number;
  amount: number;
  type: 'expense' | 'income';
  paymentMode: PaymentMode;
  categoryId: number;
  date: string; // YYYY-MM-DD
  note?: string;
  receiptBlob?: Blob;
  createdAt: number;
}

export interface Bill {
  id?: number;
  userId: number;
  title: string;
  amount: number;
  dueDay: number; // 1 - 31
  categoryId: number;
  paymentMode: PaymentMode;
  lastPaidMonth?: string; // YYYY-MM
  autoRemind: boolean;
}

export interface Goal {
  id?: number;
  userId: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  color: string;
}

export interface Debt {
  id?: number;
  userId: number;
  personName: string;
  amount: number;
  type: 'lent' | 'borrowed';
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  status: 'pending' | 'settled';
  note?: string;
}

export interface TransactionFilterOptions {
  searchQuery: string;
  categoryId?: number;
  paymentMode?: PaymentMode | 'All';
  type?: 'expense' | 'income' | 'all';
  startDate?: string;
  endDate?: string;
  month?: string; // YYYY-MM
}

export interface BackupData {
  version: number;
  exportedAt: string;
  user: Omit<User, 'id'>;
  categories: Omit<Category, 'id' | 'userId'>[];
  transactions: Array<Omit<Transaction, 'id' | 'userId' | 'receiptBlob'> & { receiptBase64?: string }>;
  bills: Omit<Bill, 'id' | 'userId'>[];
  goals: Omit<Goal, 'id' | 'userId'>[];
  debts: Omit<Debt, 'id' | 'userId'>[];
}
