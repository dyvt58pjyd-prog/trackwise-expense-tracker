import React from 'react';
import { LayoutDashboard, Receipt, CalendarClock, BarChart3, Menu, Plus } from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenQuickAdd: () => void;
  onOpenMoreMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenQuickAdd,
  onOpenMoreMenu,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="flex items-center justify-around px-2 py-1.5 relative">
        {/* Dashboard */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
            currentTab === 'dashboard'
              ? 'text-emerald-500 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        {/* Transactions */}
        <button
          onClick={() => onTabChange('transactions')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
            currentTab === 'transactions'
              ? 'text-emerald-500 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Expenses</span>
        </button>

        {/* Floating Center Action Button */}
        <div className="relative -top-4">
          <button
            onClick={onOpenQuickAdd}
            className="w-13 h-13 p-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 shadow-lg shadow-emerald-500/40 flex items-center justify-center transition border-4 border-slate-50 dark:border-slate-950"
            aria-label="Add transaction"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Bills */}
        <button
          onClick={() => onTabChange('bills')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
            currentTab === 'bills'
              ? 'text-emerald-500 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <CalendarClock className="w-5 h-5 mb-0.5" />
          <span>Bills</span>
        </button>

        {/* More Menu (Budgets, Goals, Debts, Analytics, Settings) */}
        <button
          onClick={onOpenMoreMenu}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
            ['budgets', 'goals', 'debts', 'analytics', 'settings'].includes(currentTab)
              ? 'text-emerald-500 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>
    </div>
  );
};
