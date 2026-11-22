import React, { useState } from 'react';
import { Category, Transaction } from '../../types';
import { db } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { CategoryIcon } from '../../utils/categoryIcons';
import { Modal } from '../common/Modal';
import { AlertTriangle, CheckCircle, Edit3, PieChart, ShieldAlert } from 'lucide-react';

interface BudgetManagerProps {
  categories: Category[];
  currentMonthTransactions: Transaction[];
  onRefresh: () => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  categories,
  currentMonthTransactions,
  onRefresh,
}) => {
  const { user } = useAuth();
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [budgetLimitInput, setBudgetLimitInput] = useState<string>('');

  // Calculate spending per category for this month
  const categorySpentMap: Record<number, number> = {};
  let totalExpenseThisMonth = 0;

  currentMonthTransactions.forEach((t) => {
    if (t.type === 'expense') {
      totalExpenseThisMonth += t.amount;
      categorySpentMap[t.categoryId] = (categorySpentMap[t.categoryId] || 0) + t.amount;
    }
  });

  // Calculate total budget set across all categories
  const totalBudgeted = expenseCategories.reduce((acc, cat) => acc + (cat.budgetLimit || 0), 0);
  const overallPercentage = totalBudgeted > 0 ? (totalExpenseThisMonth / totalBudgeted) * 100 : 0;

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setBudgetLimitInput(cat.budgetLimit ? String(cat.budgetLimit) : '');
  };

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.id) return;

    const limit = budgetLimitInput.trim() ? parseFloat(budgetLimitInput) : undefined;
    await db.categories.update(editingCategory.id, { budgetLimit: limit });
    setEditingCategory(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-emerald-500" />
              <span>Monthly Budget Tracker</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live spending progress against your defined limits
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Spent</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalExpenseThisMonth, user?.currency)}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Budget</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {totalBudgeted > 0 ? formatCurrency(totalBudgeted, user?.currency) : 'Not Set'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        {totalBudgeted > 0 && (
          <div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallPercentage >= 95
                    ? 'bg-rose-500'
                    : overallPercentage >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs mt-1.5 font-medium">
              <span
                className={
                  overallPercentage >= 95
                    ? 'text-rose-500 font-bold'
                    : overallPercentage >= 75
                    ? 'text-amber-500 font-semibold'
                    : 'text-emerald-500'
                }
              >
                {overallPercentage.toFixed(1)}% of total budget used
              </span>
              <span className="text-slate-400">
                {totalBudgeted - totalExpenseThisMonth >= 0
                  ? `${formatCurrency(totalBudgeted - totalExpenseThisMonth, user?.currency)} remaining`
                  : `${formatCurrency(Math.abs(totalBudgeted - totalExpenseThisMonth), user?.currency)} over budget`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Category Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenseCategories.map((cat) => {
          const spent = categorySpentMap[cat.id!] || 0;
          const limit = cat.budgetLimit || 0;
          const pct = limit > 0 ? (spent / limit) * 100 : 0;
          const isExceeded = limit > 0 && spent > limit;
          const isNearLimit = limit > 0 && pct >= 75 && pct < 100;

          return (
            <div
              key={cat.id}
              className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-xs flex flex-col justify-between ${
                isExceeded
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/10'
                  : isNearLimit
                  ? 'border-amber-300 dark:border-amber-800/60'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <CategoryIcon iconName={cat.icon} color={cat.color} className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{cat.name}</h4>
                      <p className="text-[10px] text-slate-400">
                        {limit > 0 ? `Limit: ${formatCurrency(limit, user?.currency)}` : 'No limit set'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Set Budget Limit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress Bar */}
                {limit > 0 ? (
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct >= 95
                            ? 'bg-rose-500'
                            : pct >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(spent, user?.currency)} spent
                      </span>
                      <span
                        className={`font-bold ${
                          pct >= 95
                            ? 'text-rose-500'
                            : pct >= 75
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-[11px] text-slate-400">
                    Spent: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(spent, user?.currency)}</span>
                  </div>
                )}
              </div>

              {/* Status Alert Footer */}
              {isExceeded && (
                <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-900/50 flex items-center space-x-1.5 text-[11px] font-bold text-rose-500">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Exceeded by {formatCurrency(spent - limit, user?.currency)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Limit Modal */}
      {editingCategory && (
        <Modal
          isOpen={editingCategory !== null}
          onClose={() => setEditingCategory(null)}
          title={`Set Budget: ${editingCategory.name}`}
          maxWidth="max-w-sm"
        >
          <form onSubmit={handleSaveLimit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Monthly Limit ({user?.currency || '₹'})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={budgetLimitInput}
                onChange={(e) => setBudgetLimitInput(e.target.value)}
                placeholder="Leave empty to remove limit"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Set to 0 or leave empty to disable budget limit for this category.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-sm"
              >
                Save Limit
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
