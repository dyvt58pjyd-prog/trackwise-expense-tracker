import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Goal } from '../../types';
import { db } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const GOAL_COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // yellow
];

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingGoal?: Goal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingGoal,
}) => {
  const { user } = useAuth();

  const [title, setTitle] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [currentAmount, setCurrentAmount] = useState<string>('0');
  const [targetDate, setTargetDate] = useState<string>('');
  const [color, setColor] = useState<string>('#10b981');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setTargetAmount(String(editingGoal.targetAmount));
      setCurrentAmount(String(editingGoal.currentAmount));
      setTargetDate(editingGoal.targetDate);
      setColor(editingGoal.color || '#10b981');
    } else {
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('0');
      // Default target date to 6 months in future
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setTargetDate(d.toISOString().split('T')[0]);
      setColor('#10b981');
    }
    setError('');
  }, [editingGoal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetNum = parseFloat(targetAmount);
    const currentNum = parseFloat(currentAmount) || 0;

    if (!title.trim()) {
      setError('Please enter a goal title.');
      return;
    }
    if (isNaN(targetNum) || targetNum <= 0) {
      setError('Please enter a valid target amount.');
      return;
    }
    if (!targetDate) {
      setError('Please select a target completion date.');
      return;
    }
    if (!user || !user.id) return;

    setIsSubmitting(true);
    try {
      if (editingGoal && editingGoal.id) {
        await db.goals.update(editingGoal.id, {
          title: title.trim(),
          targetAmount: targetNum,
          currentAmount: currentNum,
          targetDate,
          color,
        });
      } else {
        await db.goals.add({
          userId: user.id,
          title: title.trim(),
          targetAmount: targetNum,
          currentAmount: currentNum,
          targetDate,
          color,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError('Failed to save savings goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingGoal ? 'Edit Savings Goal' : 'Create New Savings Goal'}
      subtitle="Track milestones like Emergency Fund, Vacation, or Gadgets"
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
            Goal Name *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Emergency Fund (6 Months), New MacBook"
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Target Amount ({user?.currency || '₹'}) *
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="100000"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Current Saved ({user?.currency || '₹'})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Target Completion Date *
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Color picker pills */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Color Accent
          </label>
          <div className="flex items-center space-x-2">
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
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
            {isSubmitting ? 'Saving...' : editingGoal ? 'Save Goal' : 'Create Goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
