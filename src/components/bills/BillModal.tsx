import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Bill, Category, PaymentMode } from '../../types';
import { db } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Bank Transfer', 'Card', 'Cash'];

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  editingBill?: Bill | null;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  categories,
  editingBill,
}) => {
  const { user } = useAuth();
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDay, setDueDay] = useState<number>(5);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [autoRemind, setAutoRemind] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (editingBill) {
      setTitle(editingBill.title);
      setAmount(String(editingBill.amount));
      setDueDay(editingBill.dueDay);
      setCategoryId(editingBill.categoryId);
      setPaymentMode(editingBill.paymentMode);
      setAutoRemind(editingBill.autoRemind);
    } else {
      setTitle('');
      setAmount('');
      setDueDay(5);
      setCategoryId(expenseCategories[0]?.id);
      setPaymentMode('UPI');
      setAutoRemind(true);
    }
    setError('');
  }, [editingBill, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(amount);
    if (!title.trim()) {
      setError('Please enter a bill title.');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (!user || !user.id) return;

    setIsSubmitting(true);
    try {
      if (editingBill && editingBill.id) {
        await db.bills.update(editingBill.id, {
          title: title.trim(),
          amount: numericAmount,
          dueDay,
          categoryId,
          paymentMode,
          autoRemind,
        });
      } else {
        await db.bills.add({
          userId: user.id,
          title: title.trim(),
          amount: numericAmount,
          dueDay,
          categoryId,
          paymentMode,
          autoRemind,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      setError('Failed to save bill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBill ? 'Edit Recurring Bill' : 'Add Recurring Bill / EMI'}
      subtitle="Track monthly utilities, EMIs, and subscriptions"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Bill / Subscription Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. WiFi Broadband, Home Rent, Netflix"
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Monthly Amount ({user?.currency || '₹'}) *
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Due Day of Month (1-31) *
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="autoRemind"
            checked={autoRemind}
            onChange={(e) => setAutoRemind(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-slate-300 dark:border-slate-600"
          />
          <label htmlFor="autoRemind" className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Highlight in upcoming due alerts (due within 5 days)
          </label>
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
            {isSubmitting ? 'Saving...' : editingBill ? 'Save Changes' : 'Add Bill'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
