import React, { useState } from 'react';
import { Goal } from '../../types';
import { db } from '../../db/database';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatFullDate } from '../../utils/formatters';
import { GoalModal } from './GoalModal';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Target, Plus, CheckCircle2, TrendingUp, Edit2, Trash2 } from 'lucide-react';

interface GoalManagerProps {
  goals: Goal[];
  onRefresh: () => void;
}

export const GoalManager: React.FC<GoalManagerProps> = ({ goals, onRefresh }) => {
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Contribution quick modal
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>('');

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal || !contributingGoal.id) return;
    const addAmt = parseFloat(contributionAmount);
    if (isNaN(addAmt) || addAmt <= 0) return;

    const newAmount = contributingGoal.currentAmount + addAmt;
    await db.goals.update(contributingGoal.id, { currentAmount: newAmount });
    setContributingGoal(null);
    setContributionAmount('');
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    await db.goals.delete(id);
    onRefresh();
  };

  // Overall totals
  const totalTarget = goals.reduce((a, b) => a + b.targetAmount, 0);
  const totalSaved = goals.reduce((a, b) => a + b.currentAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Target</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalTarget, user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{goals.length} active milestones</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Total Accumulated</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalSaved, user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}% achieved overall
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase">Remaining to Save</p>
          <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
            {formatCurrency(Math.max(0, totalTarget - totalSaved), user?.currency)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all goals</p>
        </div>
      </div>

      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Savings Goals & Milestones
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track your progress toward dream purchases and emergency cushions
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goal Cards Grid */}
      {goals.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Target className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No savings goals yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Set a target for an Emergency Fund, a new laptop, or vacation travel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

            // Calculate monthly savings required
            const targetD = new Date(goal.targetDate);
            const now = new Date();
            const monthsDiff =
              (targetD.getFullYear() - now.getFullYear()) * 12 +
              (targetD.getMonth() - now.getMonth());
            const monthlyRequired = monthsDiff > 0 ? remaining / monthsDiff : remaining;

            return (
              <div
                key={goal.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {goal.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Target Date: {formatFullDate(goal.targetDate)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingGoal(goal);
                          setIsModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => goal.id && setDeleteId(goal.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(goal.currentAmount, user?.currency)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      of {formatCurrency(goal.targetAmount, user?.currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: goal.color || '#10b981',
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {percentage.toFixed(1)}% Saved
                    </span>
                    <span className="text-slate-400">
                      {remaining === 0 ? 'Goal Completed 🎉' : `${formatCurrency(remaining, user?.currency)} left`}
                    </span>
                  </div>

                  {/* Monthly target insight */}
                  {remaining > 0 && monthsDiff > 0 && (
                    <div className="mt-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                      Save <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(monthlyRequired, user?.currency)}/mo</span> for {monthsDiff} months to reach target
                    </div>
                  )}
                </div>

                {/* Add Contribution Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setContributingGoal(goal);
                      setContributionAmount('');
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Contribution</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Contribution Modal */}
      {contributingGoal && (
        <Modal
          isOpen={contributingGoal !== null}
          onClose={() => setContributingGoal(null)}
          title={`Contribute to: ${contributingGoal.title}`}
          maxWidth="max-w-sm"
        >
          <form onSubmit={handleAddContribution} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Contribution Amount ({user?.currency || '₹'})
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="5000"
                autoFocus
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setContributingGoal(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition shadow-sm"
              >
                Add Amount
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Goal Add/Edit Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={onRefresh}
        editingGoal={editingGoal}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
        title="Delete Savings Goal?"
        message="Are you sure you want to delete this goal and stop tracking its progress?"
      />
    </div>
  );
};
