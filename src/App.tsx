import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';
import { Transaction, Category, Bill, Goal, Debt, TransactionFilterOptions } from './types';
import { getCurrentMonthStr } from './utils/formatters';

// Layout Components
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';

// Auth Screen
import { AuthScreen } from './components/auth/AuthScreen';

// Feature Views
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { TransactionModal } from './components/transactions/TransactionModal';
import { TransactionList } from './components/transactions/TransactionList';
import { TransactionFilters } from './components/transactions/TransactionFilters';
import { BillList } from './components/bills/BillList';
import { BudgetManager } from './components/budgets/BudgetManager';
import { GoalManager } from './components/goals/GoalManager';
import { DebtManager } from './components/debts/DebtManager';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { SettingsModal } from './components/settings/SettingsModal';
import { Modal } from './components/common/Modal';

import {
  PieChart,
  Target,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react';

export const AppContent: React.FC = () => {
  const { user, isLocked, isLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState<boolean>(false);

  const [transactionFilters, setTransactionFilters] = useState<TransactionFilterOptions>({
    searchQuery: '',
    categoryId: undefined,
    paymentMode: 'All',
    type: 'all',
    startDate: undefined,
    endDate: undefined,
    month: undefined,
  });

  // Global Keyboard Shortcut: Cmd+N or Ctrl+N to open Quick Add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingTransaction(null);
        setIsQuickAddOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reactive IndexedDB queries scoped to current user
  const categories = useLiveQuery(
    async () => {
      if (!user || !user.id) return [];
      return await db.categories.where('userId').equals(user.id).toArray();
    },
    [user?.id],
    []
  );

  const rawTransactions = useLiveQuery(
    async () => {
      if (!user || !user.id) return [];
      return await db.transactions
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('date');
    },
    [user?.id],
    []
  );

  const bills = useLiveQuery(
    async () => {
      if (!user || !user.id) return [];
      return await db.bills.where('userId').equals(user.id).toArray();
    },
    [user?.id],
    []
  );

  const goals = useLiveQuery(
    async () => {
      if (!user || !user.id) return [];
      return await db.goals.where('userId').equals(user.id).toArray();
    },
    [user?.id],
    []
  );

  const debts = useLiveQuery(
    async () => {
      if (!user || !user.id) return [];
      return await db.debts.where('userId').equals(user.id).toArray();
    },
    [user?.id],
    []
  );

  // If loading local DB
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // If locked or no user active
  if (!user || isLocked) {
    return <AuthScreen />;
  }

  // Calculate pending / urgent bills for header notification
  const currentMonth = getCurrentMonthStr();
  const todayDay = new Date().getDate();
  const pendingBillsCount = (bills || []).filter(
    (b) => b.lastPaidMonth !== currentMonth && b.dueDay - todayDay <= 5
  ).length;

  // Filter transactions
  const filteredTransactions = (rawTransactions || []).filter((t) => {
    if (transactionFilters.type && transactionFilters.type !== 'all' && t.type !== transactionFilters.type) {
      return false;
    }
    if (transactionFilters.categoryId && t.categoryId !== transactionFilters.categoryId) {
      return false;
    }
    if (
      transactionFilters.paymentMode &&
      transactionFilters.paymentMode !== 'All' &&
      t.paymentMode !== transactionFilters.paymentMode
    ) {
      return false;
    }
    if (transactionFilters.month && !t.date.startsWith(transactionFilters.month)) {
      return false;
    }
    if (transactionFilters.searchQuery.trim()) {
      const q = transactionFilters.searchQuery.toLowerCase();
      const cat = categories.find((c) => c.id === t.categoryId);
      const catName = cat ? cat.name.toLowerCase() : '';
      const note = (t.note || '').toLowerCase();
      const amount = String(t.amount);
      if (!catName.includes(q) && !note.includes(q) && !amount.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const currentMonthTransactions = (rawTransactions || []).filter((t) =>
    t.date.startsWith(currentMonth)
  );

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsQuickAddOpen(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    await db.transactions.delete(id);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenQuickAdd={() => {
          setEditingTransaction(null);
          setIsQuickAddOpen(true);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* Top Header */}
        <Header
          onOpenQuickAdd={() => {
            setEditingTransaction(null);
            setIsQuickAddOpen(true);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNavigateToBills={() => setCurrentTab('bills')}
          pendingBillsCount={pendingBillsCount}
        />

        {/* Tab View Container */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {currentTab === 'dashboard' && (
            <DashboardOverview
              transactions={rawTransactions || []}
              categories={categories || []}
              bills={bills || []}
              goals={goals || []}
              debts={debts || []}
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenQuickAdd={() => {
                setEditingTransaction(null);
                setIsQuickAddOpen(true);
              }}
              onMarkBillPaid={(bill) => {
                // Triggered if needed from dashboard
              }}
            />
          )}

          {currentTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Transactions Ledger
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Search, filter, and review all your income and expenses
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingTransaction(null);
                    setIsQuickAddOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Entry</span>
                </button>
              </div>

              <TransactionFilters
                filters={transactionFilters}
                onFilterChange={setTransactionFilters}
                categories={categories || []}
              />

              <TransactionList
                transactions={filteredTransactions}
                categories={categories || []}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            </div>
          )}

          {currentTab === 'bills' && (
            <BillList
              bills={bills || []}
              categories={categories || []}
              onRefresh={() => {}}
            />
          )}

          {currentTab === 'budgets' && (
            <BudgetManager
              categories={categories || []}
              currentMonthTransactions={currentMonthTransactions}
              onRefresh={() => {}}
            />
          )}

          {currentTab === 'goals' && (
            <GoalManager goals={goals || []} onRefresh={() => {}} />
          )}

          {currentTab === 'debts' && (
            <DebtManager debts={debts || []} onRefresh={() => {}} />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsDashboard
              transactions={rawTransactions || []}
              categories={categories || []}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenQuickAdd={() => {
          setEditingTransaction(null);
          setIsQuickAddOpen(true);
        }}
        onOpenMoreMenu={() => setIsMobileMoreOpen(true)}
      />

      {/* Mobile "More" Sheet Modal */}
      <Modal
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        title="More Features"
        maxWidth="max-w-sm"
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setCurrentTab('budgets');
              setIsMobileMoreOpen(false);
            }}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center transition hover:border-emerald-500"
          >
            <PieChart className="w-6 h-6 text-emerald-500 mb-1.5" />
            <span className="text-xs font-semibold">Budgets</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('goals');
              setIsMobileMoreOpen(false);
            }}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center transition hover:border-emerald-500"
          >
            <Target className="w-6 h-6 text-sky-500 mb-1.5" />
            <span className="text-xs font-semibold">Savings Goals</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('debts');
              setIsMobileMoreOpen(false);
            }}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center transition hover:border-emerald-500"
          >
            <ArrowLeftRight className="w-6 h-6 text-amber-500 mb-1.5" />
            <span className="text-xs font-semibold">Lend & Borrow</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('analytics');
              setIsMobileMoreOpen(false);
            }}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center transition hover:border-emerald-500"
          >
            <BarChart3 className="w-6 h-6 text-purple-500 mb-1.5" />
            <span className="text-xs font-semibold">Analytics</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              setIsMobileMoreOpen(false);
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Backup</span>
          </button>
        </div>
      </Modal>

      {/* Quick Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditingTransaction(null);
        }}
        onSaved={() => {}}
        categories={categories || []}
        editingTransaction={editingTransaction}
      />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        categories={categories || []}
        onRefreshData={() => {}}
      />
    </div>
  );
};
