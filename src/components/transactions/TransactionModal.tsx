import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Transaction, Category, PaymentMode } from '../../types';
import { db } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { CategoryIcon } from '../../utils/categoryIcons';
import { compressImage } from '../../utils/imageCompression';
import { getCurrentDateStr } from '../../utils/formatters';
import { Camera, Image as ImageIcon, Trash2, Check, AlertCircle } from 'lucide-react';

const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  editingTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  categories,
  editingTransaction,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [date, setDate] = useState<string>(getCurrentDateStr());
  const [note, setNote] = useState<string>('');
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setPaymentMode(editingTransaction.paymentMode);
      setDate(editingTransaction.date);
      setNote(editingTransaction.note || '');
      setReceiptBlob(editingTransaction.receiptBlob || null);
    } else {
      setType('expense');
      setAmount('');
      setPaymentMode('UPI');
      setDate(getCurrentDateStr());
      setNote('');
      setReceiptBlob(null);
    }
    setError('');
  }, [editingTransaction, isOpen]);

  // Set default category when type changes
  useEffect(() => {
    if (!editingTransaction && filteredCategories.length > 0) {
      if (!categoryId || !filteredCategories.find((c) => c.id === categoryId)) {
        setCategoryId(filteredCategories[0].id);
      }
    }
  }, [type, filteredCategories, categoryId, editingTransaction]);

  // Handle receipt preview URL
  useEffect(() => {
    if (receiptBlob) {
      const url = URL.createObjectURL(receiptBlob);
      setReceiptPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setReceiptPreviewUrl(null);
    }
  }, [receiptBlob]);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImage(file, 1280, 1280, 0.75);
      setReceiptBlob(compressed);
    } catch (err) {
      console.error('Image compression failed', err);
      setError('Could not process receipt image.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    if (!user || !user.id) return;

    setIsSubmitting(true);
    try {
      if (editingTransaction && editingTransaction.id) {
        await db.transactions.update(editingTransaction.id, {
          amount: numericAmount,
          type,
          categoryId,
          paymentMode,
          date,
          note: note.trim() || undefined,
          receiptBlob: receiptBlob || undefined,
        });
      } else {
        await db.transactions.add({
          userId: user.id,
          amount: numericAmount,
          type,
          categoryId,
          paymentMode,
          date,
          note: note.trim() || undefined,
          receiptBlob: receiptBlob || undefined,
          createdAt: Date.now(),
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      setError('Failed to save transaction to offline database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Edit Transaction' : 'Quick Add Entry'}
      subtitle="Fast 2-tap offline transaction entry"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Expense vs Income Toggle */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 rounded-lg transition ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 rounded-lg transition ${
              type === 'income'
                ? 'bg-emerald-500 text-slate-950 shadow font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Income
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Amount ({user?.currency || '₹'}) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
              {user?.currency || '₹'}
            </span>
            <input
              type="number"
              step="any"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus={!editingTransaction}
              required
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xl font-bold focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Category Picker (horizontal pill grid) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Category *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
            {filteredCategories.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <CategoryIcon iconName={cat.icon} color={cat.color} className="w-4 h-4 mb-1" />
                  <span className="text-[11px] truncate w-full">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Payment Mode
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition ${
                  paymentMode === mode
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Date & Note Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Swiggy lunch, groceries"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Receipt Attachment (Camera / Upload) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Receipt Attachment
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />

          {receiptPreviewUrl ? (
            <div className="flex items-center space-x-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <img
                src={receiptPreviewUrl}
                alt="Receipt preview"
                className="w-12 h-12 rounded-lg object-cover border border-slate-300 dark:border-slate-600"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Receipt attached (Compressed)
                </p>
                <p className="text-[10px] text-emerald-500 font-semibold">Ready to save</p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptBlob(null)}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                title="Remove Receipt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-600 dark:text-slate-400 hover:text-emerald-500 text-xs font-medium transition"
              >
                <Camera className="w-4 h-4" />
                <span>{isCompressing ? 'Compressing...' : 'Capture / Upload Receipt'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Submit Actions */}
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
            disabled={isSubmitting || isCompressing}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : editingTransaction ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
