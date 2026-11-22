import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Debt } from '../../types';
import { db } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { getCurrentDateStr } from '../../utils/formatters';
import { AlertCircle } from 'lucide-react';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingDebt?: Debt | null;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingDebt,
}) => {
  const { user } = useAuth();

  const [personName, setPersonName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [date, setDate] = useState<string>(getCurrentDateStr());
  const [dueDate, setDueDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (editingDebt) {
      setPersonName(editingDebt.personName);
      setAmount(String(editingDebt.amount));
      setType(editingDebt.type);
      setDate(editingDebt.date);
      setDueDate(editingDebt.dueDate || '');
      setNote(editingDebt.note || '');
    } else {
      setPersonName('');
      setAmount('');
      setType('lent');
      setDate(getCurrentDateStr());
      setDueDate('');
      setNote('');
    }
    setError('');
  }, [editingDebt, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(amount);
    if (!personName.trim()) {
      setError('Please enter the person’s name.');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!user || !user.id) return;

    setIsSubmitting(true);
    try {
      if (editingDebt && editingDebt.id) {
        await db.debts.update(editingDebt.id, {
          personName: personName.trim(),
          amount: numericAmount,
          type,
          date,
          dueDate: dueDate || undefined,
          note: note.trim() || undefined,
        });
      } else {
        await db.debts.add({
          userId: user.id,
          personName: personName.trim(),
          amount: numericAmount,
          type,
          date,
          dueDate: dueDate || undefined,
          status: 'pending',
          note: note.trim() || undefined,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError('Failed to save debt record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDebt ? 'Edit Lend/Borrow Record' : 'Record Money Lent / Borrowed'}
      subtitle="Keep track of personal debts, loans to friends, and split balances"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Lent vs Borrowed Toggle */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType('lent')}
            className={`py-2 rounded-lg transition ${
              type === 'lent'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            I Lent Money (They owe me)
          </button>
          <button
            type="button"
            onClick={() => setType('borrowed')}
            className={`py-2 rounded-lg transition ${
              type === 'borrowed'
                ? 'bg-rose-500 text-white font-bold shadow'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            I Borrowed Money (I owe them)
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Person Name *
          </label>
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="e.g. Rahul, Priya, Alex"
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Amount ({user?.currency || '₹'}) *
          </label>
          <input
            type="number"
            step="any"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Date Given/Taken
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Expected Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Dinner split, trip ticket expense"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-md shadow-emerald-500/20"
          >
            {isSubmitting ? 'Saving...' : editingDebt ? 'Save Changes' : 'Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
