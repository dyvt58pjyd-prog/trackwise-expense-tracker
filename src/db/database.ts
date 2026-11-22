import Dexie, { type Table } from 'dexie';
import { User, Category, Transaction, Bill, Goal, Debt } from '../types';
import { generateSyncId } from '../utils/crypto';

export class TrackWiseDatabase extends Dexie {
  users!: Table<User, number>;
  categories!: Table<Category, number>;
  transactions!: Table<Transaction, number>;
  bills!: Table<Bill, number>;
  goals!: Table<Goal, number>;
  debts!: Table<Debt, number>;

  constructor() {
    super('TrackWiseFinanceDB');
    this.version(1).stores({
      users: '++id, &username, name, passwordHash, pinHash, salt, currency, theme, createdAt',
      categories: '++id, userId, name, type, icon, color, budgetLimit',
      transactions: '++id, userId, amount, type, paymentMode, categoryId, date, note, receiptBlob, createdAt',
      bills: '++id, userId, title, amount, dueDay, categoryId, paymentMode, lastPaidMonth, autoRemind',
      goals: '++id, userId, title, targetAmount, currentAmount, targetDate, color',
      debts: '++id, userId, personName, amount, type, date, dueDate, status, note',
    });

    this.version(2).stores({
      categories: '++id, userId, syncId, name, type, icon, color, budgetLimit',
      transactions: '++id, userId, syncId, amount, type, paymentMode, categoryId, date, note, receiptBlob, createdAt',
      bills: '++id, userId, syncId, title, amount, dueDay, categoryId, paymentMode, lastPaidMonth, autoRemind',
      goals: '++id, userId, syncId, title, targetAmount, currentAmount, targetDate, color',
      debts: '++id, userId, syncId, personName, amount, type, date, dueDate, status, note',
    });
  }
}

export const db = new TrackWiseDatabase();

export const DEFAULT_CATEGORIES: Array<Omit<Category, 'id' | 'userId'>> = [
  { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#f97316', budgetLimit: 8000 },
  { name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#10b981', budgetLimit: 6000 },
  { name: 'Fuel & Transport', type: 'expense', icon: 'Car', color: '#06b6d4', budgetLimit: 4000 },
  { name: 'Bills & Utilities', type: 'expense', icon: 'Zap', color: '#eab308', budgetLimit: 5000 },
  { name: 'Shopping & E-Com', type: 'expense', icon: 'ShoppingBag', color: '#ec4899', budgetLimit: 5000 },
  { name: 'Health & Medical', type: 'expense', icon: 'HeartPulse', color: '#ef4444', budgetLimit: 3000 },
  { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#8b5cf6', budgetLimit: 2500 },
  { name: 'Salary', type: 'income', icon: 'Briefcase', color: '#22c55e' },
  { name: 'Freelance & Business', type: 'income', icon: 'Laptop', color: '#3b82f6' },
  { name: 'Investments & Returns', type: 'income', icon: 'TrendingUp', color: '#14b8a6' },
  { name: 'Other', type: 'expense', icon: 'Tag', color: '#64748b' },
];

export async function seedDefaultCategories(userId: number): Promise<void> {
  const count = await db.categories.where('userId').equals(userId).count();
  if (count === 0) {
    const categoriesToInsert = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      syncId: generateSyncId('cat'),
      userId,
    }));
    await db.categories.bulkAdd(categoriesToInsert as Category[]);
  }
}
