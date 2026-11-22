import React, { useState } from 'react';
import { Transaction, Category } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatMonthYear, getCurrentMonthStr } from '../../utils/formatters';
import { exportTransactionsToExcel } from '../../utils/exportExcel';
import { exportMonthlyPdfStatement } from '../../utils/exportPdf';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowUpDown,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  transactions: Transaction[];
  categories: Category[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  transactions,
  categories,
}) => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());

  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id!, c]));

  // 1. Filter transactions for the selected month
  const monthTransactions = transactions.filter((t) => t.date.startsWith(selectedMonth));

  // 2. Summary stats for selected month
  let monthIncome = 0;
  let monthExpense = 0;
  let cashExpense = 0;
  let digitalExpense = 0;

  const categoryExpenseMap: Record<string, { name: string; value: number; color: string }> = {};

  monthTransactions.forEach((t) => {
    if (t.type === 'income') {
      monthIncome += t.amount;
    } else {
      monthExpense += t.amount;
      if (t.paymentMode === 'Cash') {
        cashExpense += t.amount;
      } else {
        digitalExpense += t.amount;
      }

      const cat = categoryMap.get(t.categoryId);
      const catName = cat ? cat.name : 'Other';
      const catColor = cat?.color || '#64748b';

      if (!categoryExpenseMap[catName]) {
        categoryExpenseMap[catName] = { name: catName, value: 0, color: catColor };
      }
      categoryExpenseMap[catName].value += t.amount;
    }
  });

  const categoryData = Object.values(categoryExpenseMap).sort((a, b) => b.value - a.value);

  // 3. Daily Spending Trend (1..daysInMonth)
  const [yearStr, monthNumStr] = selectedMonth.split('-');
  const daysInMonth = new Date(Number(yearStr), Number(monthNumStr), 0).getDate();
  const dailyDataMap: Record<number, number> = {};

  monthTransactions.forEach((t) => {
    if (t.type === 'expense') {
      const day = parseInt(t.date.split('-')[2], 10);
      dailyDataMap[day] = (dailyDataMap[day] || 0) + t.amount;
    }
  });

  const dailyTrendData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      day: `${day}`,
      expense: dailyDataMap[day] || 0,
    };
  });

  // 4. 6-Month Income vs Expense Trend
  const past6Months: string[] = [];
  const baseDate = new Date(Number(yearStr), Number(monthNumStr) - 1, 1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setMonth(baseDate.getMonth() - i);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    past6Months.push(mStr);
  }

  const multiMonthData = past6Months.map((m) => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((t) => {
      if (t.date.startsWith(m)) {
        if (t.type === 'income') inc += t.amount;
        else exp += t.amount;
      }
    });

    const [y, mn] = m.split('-').map(Number);
    const label = new Date(y, mn - 1, 1).toLocaleDateString('en-US', { month: 'short' });

    return {
      month: label,
      income: inc,
      expense: exp,
    };
  });

  const handleExportExcel = () => {
    exportTransactionsToExcel(
      monthTransactions.length > 0 ? monthTransactions : transactions,
      categories,
      user?.currency || '₹',
      `TrackWise_Report_${selectedMonth}.xlsx`
    );
  };

  const handleExportPdf = () => {
    exportMonthlyPdfStatement(
      selectedMonth,
      user?.name || 'User',
      monthTransactions,
      categories,
      user?.currency || '₹'
    );
  };

  return (
    <div className="space-y-6">
      {/* Month Selector & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-emerald-500" />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Selected Statement Period
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-base text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition"
            title="Download full spreadsheet with category breakdowns"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition shadow-sm"
            title="Generate printable monthly statement"
          >
            <FileText className="w-4 h-4" />
            <span>PDF Statement</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Total Income
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(monthIncome, user?.currency)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Earned this month</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Total Expense
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(monthExpense, user?.currency)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Spent this month</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Net Savings
          </span>
          <p
            className={`text-xl font-bold mt-1 ${
              monthIncome - monthExpense >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(monthIncome - monthExpense, user?.currency)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {monthIncome > 0
              ? `${(((monthIncome - monthExpense) / monthIncome) * 100).toFixed(1)}% savings rate`
              : '0% savings rate'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Digital vs Cash
          </span>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
            UPI/Card: {formatCurrency(digitalExpense, user?.currency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Cash: {formatCurrency(cashExpense, user?.currency)}
          </p>
        </div>
      </div>

      {/* Row 1: Category Donut & Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category-wise Spending Donut */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Category Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Where your money went in {formatMonthYear(selectedMonth)}
            </p>
          </div>

          {categoryData.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No expense records logged for this month.
            </div>
          ) : (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-56 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => formatCurrency(val, user?.currency)}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="flex-1 max-h-48 overflow-y-auto space-y-1.5 w-full pr-1">
                {categoryData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="truncate text-slate-700 dark:text-slate-300">{c.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0 ml-2">
                      {formatCurrency(c.value, user?.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Spending Trend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Daily Spending Trend
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily expense fluctuations across {formatMonthYear(selectedMonth)}
            </p>
          </div>

          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: number) => formatCurrency(val, user?.currency)}
                  labelFormatter={(l) => `Day ${l}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: 6-Month Income vs Expense Bar Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            6-Month Income vs. Expense Comparison
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Evaluating long-term cash flow and savings consistency
          </p>
        </div>

        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={multiMonthData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                formatter={(val: number) => formatCurrency(val, user?.currency)}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
