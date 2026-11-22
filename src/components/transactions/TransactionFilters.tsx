import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Category, PaymentMode, TransactionFilterOptions } from '../../types';

interface TransactionFiltersProps {
  filters: TransactionFilterOptions;
  onFilterChange: (filters: TransactionFilterOptions) => void;
  categories: Category[];
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFilterChange,
  categories,
}) => {
  const handleReset = () => {
    onFilterChange({
      searchQuery: '',
      categoryId: undefined,
      paymentMode: 'All',
      type: 'all',
      startDate: undefined,
      endDate: undefined,
      month: undefined,
    });
  };

  const isFiltered =
    Boolean(filters.searchQuery) ||
    Boolean(filters.categoryId) ||
    (filters.paymentMode && filters.paymentMode !== 'All') ||
    (filters.type && filters.type !== 'all') ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
          placeholder="Search by note, category, or amount..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Type Selector */}
        <select
          value={filters.type || 'all'}
          onChange={(e) =>
            onFilterChange({ ...filters, type: e.target.value as any })
          }
          className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Types</option>
          <option value="expense">Expenses Only</option>
          <option value="income">Income Only</option>
        </select>

        {/* Category Selector */}
        <select
          value={filters.categoryId || ''}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              categoryId: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Payment Mode Selector */}
        <select
          value={filters.paymentMode || 'All'}
          onChange={(e) =>
            onFilterChange({ ...filters, paymentMode: e.target.value as any })
          }
          className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="All">All Modes</option>
          <option value="UPI">UPI</option>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>

        {/* Date Filter: Month */}
        <input
          type="month"
          value={filters.month || ''}
          onChange={(e) => onFilterChange({ ...filters, month: e.target.value || undefined })}
          className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {isFiltered && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
