import React from 'react';
import { Transaction, Category, Bill, Goal, Debt } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getCurrentDateStr, getCurrentMonthStr } from '../../utils/formatters';
import { CategoryIcon } from '../../utils/categoryIcons';
import { NavTab } from '../layout/Sidebar';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  Target,
  ArrowLeftRight,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts';

interface DashboardOverviewProps {
  transactions: Transaction[];
  categories: Category[];
  bills: Bill[];
  goals: Goal[];
  debts: Debt[];
  onNavigate: (tab: NavTab) => void;
  onOpenQuickAdd: () => void;
  onMarkBillPaid: (bill: Bill) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  transactions,
  categories,
  bills,
  goals,
  debts,
  onNavigate,
  onOpenQuickAdd,
  onMarkBillPaid,
}) => {
  const { user } = useAuth();
  const currentMonth = getCurrentMonthStr();
  const todayStr = getCurrentDateStr();
  const todayDay = new Date().getDate();

  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id!, c]));

  // Month transactions
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth));

  let monthIncome = 0;
  let monthExpense = 0;
  let todayExpense = 0;

  monthTransactions.forEach((t) => {
    if (t.type === 'income') {
      monthIncome += t.amount;
    } else {
      monthExpense += t.amount;
      if (t.date === todayStr) {
        todayExpense += t.amount;
      }
    }
  });

  const netBalance = monthIncome - monthExpense;

  // Upcoming / Overdue bills
  const pendingBills = bills.filter((b) => b.lastPaidMonth !== currentMonth);
  const urgentBills = pendingBills.filter((b) => {
    const diff = b.dueDay - todayDay;
    return diff <= 5; // overdue or due within 5 days
  });

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  // Daily mini chart data for this month
  const [yearStr, monthNumStr] = currentMonth.split('-');
  const daysInMonth = new Date(Number(yearStr), Number(monthNumStr), 0).getDate();
  const dailySpendMap: Record<number, number> = {};

  monthTransactions.forEach((t) => {
    if (t.type === 'expense') {
      const d = parseInt(t.date.split('-')[2], 10);
      dailySpendMap[d] = (dailySpendMap[d] || 0) + t.amount;
    }
  });

  const miniTrendData = Array.from({ length: Math.min(todayDay, daysInMonth) }, (_, i) => {
    const day = i + 1;
    return {
      day: `${day}`,
      expense: dailySpendMap[day] || 0,
    };
  });

  // Lend & Borrow summary
  const pendingDebts = debts.filter((d) => d.status === 'pending');
  const lentPending = pendingDebts
    .filter((d) => d.type === 'lent')
    .reduce((acc, d) => acc + d.amount, 0);
  const borrowedPending = pendingDebts
    .filter((d) => d.type === 'borrowed')
    .reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Income */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Month Income
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {formatCurrency(monthIncome, user?.currency)}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Earned this month</p>
          </div>
        </div>

        {/* Total Expense */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Month Expense
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {formatCurrency(monthExpense, user?.currency)}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Total outflows</p>
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Net Balance
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                netBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(netBalance, user?.currency)}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
              {monthIncome > 0
                ? `${((netBalance / monthIncome) * 100).toFixed(0)}% saved`
                : 'Net Cash Flow'}
            </p>
          </div>
        </div>

        {/* Today's Expense */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Today's Spending
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {formatCurrency(todayExpense, user?.currency)}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Spent today</p>
          </div>
        </div>
      </div>

      {/* Urgent Bills Due Alert Banner */}
      {urgentBills.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {urgentBills.length} Bill{urgentBills.length > 1 ? 's' : ''} Requiring Immediate Attention!
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {urgentBills.map((b) => `${b.title} (${formatCurrency(b.amount, user?.currency)})`).join(', ')}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('bills')}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition shadow-xs shrink-0"
          >
            <span>Review Bills</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Left Trend & Recent / Right Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Spending Trend & Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mini Month-to-Date Spend Graph */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Month-to-Date Spending
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily expense trajectory for this month
                </p>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 font-medium"
              >
                <span>Full Analytics</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={miniTrendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(val: number) => formatCurrency(val, user?.currency)}
                    labelFormatter={(l) => `Day ${l}`}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#dashTrend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Latest activity in your offline ledger
                </p>
              </div>
              <button
                onClick={() => onNavigate('transactions')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 font-medium"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No transactions recorded yet. Click "+ Add Entry" to start!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentTransactions.map((t) => {
                  const cat = categoryMap.get(t.categoryId);
                  const isExpense = t.type === 'expense';

                  return (
                    <div
                      key={t.id}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition rounded-xl px-2 -mx-2"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: cat?.color ? `${cat.color}20` : '#64748b20',
                          }}
                        >
                          <CategoryIcon
                            iconName={cat?.icon || 'Tag'}
                            color={cat?.color || '#64748b'}
                            className="w-4 h-4"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {cat?.name || 'Uncategorized'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {formatDate(t.date)} • {t.paymentMode} {t.note ? `• ${t.note}` : ''}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold shrink-0 ml-2 ${
                          isExpense
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatCurrency(t.amount, user?.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Goals, Udhar & Quick Action */}
        <div className="space-y-6">
          {/* Savings Goals Widget */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Savings Goals
                </h3>
              </div>
              <button
                onClick={() => onNavigate('goals')}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Manage
              </button>
            </div>

            {goals.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No active savings targets set.</p>
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 3).map((g) => {
                  const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {g.title}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: g.color || '#10b981',
                            width: `${pct}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lend / Borrow (Udhar) Widget */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <ArrowLeftRight className="w-4 h-4 text-sky-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Udhar / Split
                </h3>
              </div>
              <button
                onClick={() => onNavigate('debts')}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
              >
                View
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                  To Collect
                </span>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(lentPending, user?.currency)}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase">
                  To Pay
                </span>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatCurrency(borrowedPending, user?.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Offline Security & Cross-Platform Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                PWA • Offline-First
              </span>
              <h4 className="text-sm font-bold mt-1 text-white">Your Financial Privacy</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Zero third-party cloud sync. All credentials and transactions stay encrypted on this device.
              </p>
              <button
                onClick={() => onNavigate('settings')}
                className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 transition"
              >
                Backup Data Now →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
