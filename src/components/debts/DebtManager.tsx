import React, { useState } from 'react';
import { Debt } from '../../types';
import { db } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DebtModal } from './DebtModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ArrowLeftRight, Plus, CheckCircle, Clock, Edit2, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface DebtManagerProps {
  debts: Debt[];
  onRefresh: () => void;
}

export const DebtManager: React.FC<DebtManagerProps> = ({ debts, onRefresh }) => {
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'lent' | 'borrowed'>('all');

  const pendingDebts = debts.filter((d) => d.status === 'pending');
  const settledDebts = debts.filter((d) => d.status === 'settled');

  // Stats
  let totalLentPending = 0;
  let totalBorrowedPending = 0;

  pendingDebts.forEach((d) => {
    if (d.type === 'lent') totalLentPending += d.amount;
    else totalBorrowedPending += d.amount;
  });

  const handleToggleStatus = async (debt: Debt) => {
    if (!debt.id) return;
    const nextStatus = debt.status === 'pending' ? 'settled' : 'pending';
    await db.debts.update(debt.id, { status: nextStatus });
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    await db.debts.delete(id);
    onRefresh();
  };

  const displayedDebts = debts.filter((d) => {
    if (filterType === 'all') return true;
    return d.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
            You Lent (To Collect)
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalLentPending, user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Money others owe you</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase">
            You Borrowed (To Pay)
          </p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalBorrowedPending, user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Money you owe others</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Net Udhar Position</p>
          <p
            className={`text-xl font-bold mt-1 ${
              totalLentPending - totalBorrowedPending >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(totalLentPending - totalBorrowedPending, user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalLentPending - totalBorrowedPending >= 0 ? 'Net Receivable' : 'Net Payable'}
          </p>
        </div>
      </div>

      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Lend & Borrow (Udhar Tracker)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track loans given to or taken from friends and colleagues
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('lent')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterType === 'lent'
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              }`}
            >
              Lent
            </button>
            <button
              onClick={() => setFilterType('borrowed')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterType === 'borrowed'
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              }`}
            >
              Borrowed
            </button>
          </div>

          <button
            onClick={() => {
              setEditingDebt(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record</span>
          </button>
        </div>
      </div>

      {/* Debt Cards List */}
      {displayedDebts.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <ArrowLeftRight className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No udhar / debt entries
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Keep track of money lent to or borrowed from anyone.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayedDebts.map((debt) => {
            const isLent = debt.type === 'lent';
            const isSettled = debt.status === 'settled';

            return (
              <div
                key={debt.id}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-xs flex flex-col justify-between ${
                  isSettled
                    ? 'border-slate-200 dark:border-slate-800 opacity-60'
                    : isLent
                    ? 'border-emerald-200 dark:border-emerald-900/50'
                    : 'border-rose-200 dark:border-rose-900/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isLent
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400'
                        }`}
                      >
                        {isLent ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {debt.personName}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {isLent ? 'You lent money' : 'You borrowed money'} • {formatDate(debt.date)}
                        </p>
                      </div>
                    </div>

                    {isSettled ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Settled
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLent
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400'
                        }`}
                      >
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <span
                      className={`text-xl font-bold ${
                        isLent
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(debt.amount, user?.currency)}
                    </span>
                    {debt.dueDate && (
                      <span className="text-[11px] text-slate-400">
                        Due: {formatDate(debt.dueDate)}
                      </span>
                    )}
                  </div>

                  {debt.note && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                      "{debt.note}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingDebt(debt);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => debt.id && setDeleteId(debt.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(debt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isSettled
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-xs'
                    }`}
                  >
                    {isSettled ? 'Mark as Pending' : 'Mark Settled'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Debt Modal */}
      <DebtModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={onRefresh}
        editingDebt={editingDebt}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
        title="Delete Record?"
        message="Are you sure you want to delete this debt record?"
      />
    </div>
  );
};
