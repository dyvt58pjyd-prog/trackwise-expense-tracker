import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CalendarClock,
  PieChart,
  Target,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Plus,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'transactions'
  | 'bills'
  | 'budgets'
  | 'goals'
  | 'debts'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenQuickAdd: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenQuickAdd,
}) => {
  const { user, quickLock } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as NavTab, label: 'Transactions', icon: Receipt },
    { id: 'bills' as NavTab, label: 'Recurring Bills', icon: CalendarClock },
    { id: 'budgets' as NavTab, label: 'Budgets', icon: PieChart },
    { id: 'goals' as NavTab, label: 'Savings Goals', icon: Target },
    { id: 'debts' as NavTab, label: 'Lend & Borrow', icon: ArrowLeftRight },
    { id: 'analytics' as NavTab, label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'settings' as NavTab, label: 'Settings & Backup', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 h-screen sticky top-0 shrink-0 select-none transition-colors">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 font-bold text-lg">
            ₹
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              TrackWise
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Offline Finance</p>
          </div>
        </div>
      </div>

      {/* Quick Add Action Button */}
      <div className="p-4">
        <button
          onClick={onOpenQuickAdd}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold text-sm shadow-md shadow-emerald-500/15 transition group"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span>Quick Entry</span>
          <span className="text-[10px] bg-emerald-600/30 text-emerald-950 px-1.5 py-0.5 rounded font-mono font-normal">
            ⌘N
          </span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile & Lock */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">@{user?.username}</p>
            </div>
          </div>
          <button
            onClick={quickLock}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Lock app"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
            Credits: Made by <span className="text-emerald-500 font-semibold">Anurag Bawaskar</span>
          </p>
        </div>
      </div>
    </aside>
  );
};
