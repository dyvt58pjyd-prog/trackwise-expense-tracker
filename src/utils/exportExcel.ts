import * as XLSX from 'xlsx';
import { Transaction, Category } from '../types';
import { downloadFile } from './platform';
import { formatCurrency } from './formatters';

export function exportTransactionsToExcel(
  transactions: Transaction[],
  categories: Category[],
  currency = '₹',
  filename = 'Transactions_Report.xlsx'
) {
  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id!, c]));

  // Sheet 1: Transactions
  const transactionRows = transactions.map((t, index) => {
    const cat = categoryMap.get(t.categoryId);
    return {
      'S.No': index + 1,
      'Date': t.date,
      'Type': t.type.toUpperCase(),
      'Category': cat ? cat.name : 'Unknown',
      [`Amount (${currency})`]: t.amount,
      'Payment Mode': t.paymentMode,
      'Notes': t.note || '',
      'Has Receipt': t.receiptBlob ? 'Yes' : 'No',
    };
  });

  // Sheet 2: Category Breakdown
  const categoryTotals: Record<string, { type: string; total: number; count: number }> = {};
  transactions.forEach((t) => {
    const cat = categoryMap.get(t.categoryId);
    const catName = cat ? cat.name : 'Uncategorized';
    if (!categoryTotals[catName]) {
      categoryTotals[catName] = { type: t.type, total: 0, count: 0 };
    }
    categoryTotals[catName].total += t.amount;
    categoryTotals[catName].count += 1;
  });

  const categoryRows = Object.entries(categoryTotals).map(([name, data]) => ({
    'Category': name,
    'Type': data.type.toUpperCase(),
    'Count': data.count,
    [`Total (${currency})`]: data.total,
  }));

  // Sheet 3: Monthly Overview
  let totalIncome = 0;
  let totalExpense = 0;
  const paymentModeBreakdown: Record<string, number> = {};

  transactions.forEach((t) => {
    if (t.type === 'income') totalIncome += t.amount;
    if (t.type === 'expense') {
      totalExpense += t.amount;
      paymentModeBreakdown[t.paymentMode] = (paymentModeBreakdown[t.paymentMode] || 0) + t.amount;
    }
  });

  const summaryRows = [
    { Metric: 'Total Income', [`Value (${currency})`]: totalIncome },
    { Metric: 'Total Expense', [`Value (${currency})`]: totalExpense },
    { Metric: 'Net Savings', [`Value (${currency})`]: totalIncome - totalExpense },
    {
      Metric: 'Savings Rate (%)',
      [`Value (${currency})`]: totalIncome > 0 ? Number(((totalIncome - totalExpense) / totalIncome * 100).toFixed(1)) : 0,
    },
    ...Object.entries(paymentModeBreakdown).map(([mode, amt]) => ({
      Metric: `Expense by ${mode}`,
      [`Value (${currency})`]: amt,
    })),
  ];

  const wb = XLSX.utils.book_new();

  const wsTransactions = XLSX.utils.json_to_sheet(transactionRows);
  const wsCategories = XLSX.utils.json_to_sheet(categoryRows);
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

  // Auto-width adjustment
  const wscols = [
    { wch: 6 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 30 },
    { wch: 12 },
  ];
  wsTransactions['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions');
  XLSX.utils.book_append_sheet(wb, wsCategories, 'Category Breakdown');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  downloadFile(blob, filename);
}
