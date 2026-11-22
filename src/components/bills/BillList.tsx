import React, { useState } from 'react';
import { Bill, Category } from '../../types';
import { db } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getCurrentMonthStr, getCurrentDateStr } from '../../utils/formatters';
import { CategoryIcon } from '../../utils/categoryIcons';
import { BillModal } from './BillModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Plus, CheckCircle, AlertCircle, Clock, Edit2, Trash2, CalendarCheck } from 'lucide-react';

interface BillListProps {
  bills: Bill[];
  categories: Category[];
  onRefresh: () => void;
}

export const BillList: React.FC<BillListProps> = ({ bills, categories, onRefresh }) => {
  const { user } = useAuth();
  const currentMonth = getCurrentMonthStr();
  const today = new Date();
  const currentDay = today.getDate();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id!, c]));

  // Monthly stats
  let totalMonthlyBills = 0;
  let paidMonthlyBills = 0;

  bills.forEach((b) => {
    totalMonthlyBills += b.amount;
    if (b.lastPaidMonth === currentMonth) {
      paidMonthlyBills += b.amount;
    }
  });

  const handleMarkPaid = async (bill: Bill, createExpenseRecord = true) => {
    if (!bill.id || !user || !user.id) return;

    try {
      // 1. Update bill's lastPaidMonth
      await db.bills.update(bill.id, { lastPaidMonth: currentMonth });

      // 2. Automatically log an expense transaction if requested
      if (createExpenseRecord) {
        await db.transactions.add({
          userId: user.id,
          amount: bill.amount,
          type: 'expense',
          paymentMode: bill.paymentMode,
          categoryId: bill.categoryId,
          date: getCurrentDateStr(),
          note: `Bill Payment: ${bill.title} (${currentMonth})`,
          createdAt: Date.now(),
        });
      }

      onRefresh();
      setPayingBill(null);
    } catch (err) {
      console.error('Failed to mark bill as paid:', err);
    }
  };

  const handleDelete = async (id: number) => {
    await db.bills.delete(id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Monthly Bills</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalMonthlyBills, user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{bills.length} active recurring items</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Paid This Month</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(paidMonthlyBills, user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalMonthlyBills > 0 ? ((paidMonthlyBills / totalMonthlyBills) * 100).toFixed(0) : 0}% completed
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Remaining Due</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(Math.max(0, totalMonthlyBills - paidMonthlyBills), user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            For {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Monthly Checklist & Subscriptions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Check off bills as you pay them each month
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBill(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Bill</span>
        </button>
      </div>

      {/* Bill Cards / Table */}
      {bills.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <CalendarCheck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No recurring bills added yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Track EMIs, rent, subscriptions, and utility bills with automatic due alerts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {bills.map((bill) => {
            const isPaid = bill.lastPaidMonth === currentMonth;
            const daysLeft = bill.dueDay - currentDay;
            const isOverdue = !isPaid && daysLeft < 0;
            const isDueSoon = !isPaid && daysLeft >= 0 && daysLeft <= 5;

            const cat = categoryMap.get(bill.categoryId);

            return (
              <div
                key={bill.id}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-xs flex flex-col justify-between ${
                  isPaid
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20'
                    : isOverdue
                    ? 'border-rose-300 dark:border-rose-900/60'
                    : isDueSoon
                    ? 'border-amber-300 dark:border-amber-800/60'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Top Bar: Category Icon & Badges */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: cat?.color ? `${cat.color}20` : '#64748b20',
                        }}
                      >
                        <CategoryIcon
                          iconName={cat?.icon || 'Zap'}
                          color={cat?.color || '#64748b'}
                          className="w-5 h-5"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {bill.title}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Due on {bill.dueDay}th of month • {bill.paymentMode}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isPaid ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Paid</span>
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Overdue ({Math.abs(daysLeft)}d ago)</span>
                      </span>
                    ) : isDueSoon ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400">
                        <Clock className="w-3 h-3" />
                        <span>Due in {daysLeft === 0 ? 'Today' : `${daysLeft}d`}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        In {daysLeft} days
                      </span>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="mt-3">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(bill.amount, user?.currency)}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingBill(bill);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Edit Bill"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => bill.id && setDeleteId(bill.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mark as Paid Action */}
                  {!isPaid ? (
                    <button
                      onClick={() => setPayingBill(bill)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 text-xs font-semibold shadow-xs transition"
                    >
                      Mark Paid
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (bill.id) {
                          await db.bills.update(bill.id, { lastPaidMonth: undefined });
                          onRefresh();
                        }
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                    >
                      Unmark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prompt to log transaction when marking bill as paid */}
      {payingBill && (
        <ConfirmDialog
          isOpen={payingBill !== null}
          onClose={() => setPayingBill(null)}
          onConfirm={() => handleMarkPaid(payingBill, true)}
          title="Mark Bill as Paid"
          message={`Would you like to log an expense of ${formatCurrency(
            payingBill.amount,
            user?.currency
          )} for "${payingBill.title}" in your transactions ledger?`}
          confirmText="Yes, Log Expense"
          isDangerous={false}
        />
      )}

      {/* Bill Add / Edit Modal */}
      <BillModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={onRefresh}
        categories={categories}
        editingBill={editingBill}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
        title="Delete Recurring Bill?"
        message="Are you sure you want to delete this bill from your recurring checklist?"
      />
    </div>
  );
};
