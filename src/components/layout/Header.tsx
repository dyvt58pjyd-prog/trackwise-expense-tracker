import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Lock, Sun, Moon, Bell, Plus, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenQuickAdd: () => void;
  onOpenSettings: () => void;
  onNavigateToBills: () => void;
  pendingBillsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickAdd,
  onOpenSettings,
  onNavigateToBills,
  pendingBillsCount,
}) => {
  const { user, quickLock } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between">
        {/* Left Side Info */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80">
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" />
              100% Offline
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400">
              Currency: <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.currency || '₹'}</span>
            </span>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Add Button (Desktop only, mobile has FAB) */}
          <button
            onClick={onOpenQuickAdd}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 text-xs font-semibold shadow-sm transition"
            title="Press Cmd+N or Ctrl+N to open"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
            <kbd className="hidden md:inline-block ml-1 px-1 py-0.2 bg-emerald-600/30 text-[10px] rounded text-emerald-950 font-mono">
              ⌘N
            </kbd>
          </button>

          {/* Pending Bills Alert */}
          {pendingBillsCount > 0 && (
            <button
              onClick={onNavigateToBills}
              className="relative p-2 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition"
              title={`${pendingBillsCount} upcoming or overdue bills`}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                {pendingBillsCount}
              </span>
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Quick Lock Button */}
          <button
            onClick={quickLock}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
            title="Lock app immediately"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Lock</span>
          </button>

          {/* User Profile Avatar / Trigger */}
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800"
            title="User Profile & Settings"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center shadow-sm">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
              {user?.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
