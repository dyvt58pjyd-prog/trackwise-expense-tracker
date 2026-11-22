import React, { useState } from 'react';
import { Transaction, Category } from '../../types';
import { CategoryIcon } from '../../utils/categoryIcons';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ReceiptLightbox } from '../common/ReceiptLightbox';
import { Image as ImageIcon, Edit2, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Blob | null>(null);

  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id!, c]));

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No transactions found
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Use the Quick Add button (or press ⌘N / Ctrl+N) to log an expense or income.
        </p>
      </div>
    );
  }

  // Group transactions by date
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach((t) => {
    if (!grouped[t.date]) {
      grouped[t.date] = [];
    }
    grouped[t.date].push(t);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      {sortedDates.map((date) => {
        const dayTransactions = grouped[date];
        let dayExpense = 0;
        let dayIncome = 0;
        dayTransactions.forEach((t) => {
          if (t.type === 'expense') dayExpense += t.amount;
          else dayIncome += t.amount;
        });

        return (
          <div key={date} className="space-y-2">
            {/* Date Header with Daily Total */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">
                {formatDate(date)}
              </span>
              <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-500">
                {dayExpense > 0 && (
                  <span className="text-rose-500">
                    -{formatCurrency(dayExpense, user?.currency)}
                  </span>
                )}
                {dayIncome > 0 && (
                  <span className="text-emerald-500">
                    +{formatCurrency(dayIncome, user?.currency)}
                  </span>
                )}
              </div>
            </div>

            {/* Transaction Cards for this Date */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm overflow-hidden">
              {dayTransactions.map((t) => {
                const cat = categoryMap.get(t.categoryId);
                const isExpense = t.type === 'expense';

                return (
                  <div
                    key={t.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                  >
                    {/* Left: Icon & Details */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{
                          backgroundColor: cat?.color ? `${cat.color}20` : '#64748b20',
                        }}
                      >
                        <CategoryIcon
                          iconName={cat?.icon || 'Tag'}
                          color={cat?.color || '#64748b'}
                          className="w-5 h-5"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {cat?.name || 'Uncategorized'}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                            {t.paymentMode}
                          </span>
                        </div>
                        {t.note && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {t.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Receipt Icon, Amount, Actions */}
                    <div className="flex items-center space-x-3 shrink-0">
                      {t.receiptBlob && (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(t.receiptBlob || null)}
                          className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                          title="View Receipt Photo"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="text-right">
                        <span
                          className={`text-sm font-bold tracking-tight ${
                            isExpense
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isExpense ? '-' : '+'}
                          {formatCurrency(t.amount, user?.currency)}
                        </span>
                      </div>

                      {/* Edit / Delete on Hover or focus */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => onEdit(t)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => t.id && setDeleteId(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
        }}
        title="Delete Transaction?"
        message="Are you sure you want to delete this transaction record? This cannot be undone."
      />

      {/* Receipt Lightbox */}
      <ReceiptLightbox
        receiptBlob={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};
