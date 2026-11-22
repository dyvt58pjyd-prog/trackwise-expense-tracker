import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { db } from '../../db/database';
import { Category, BackupData } from '../../types';
import { CategoryIcon, AVAILABLE_ICONS } from '../../utils/categoryIcons';
import { blobToBase64, base64ToBlob } from '../../utils/imageCompression';
import { encryptBackup, decryptBackup, hashWithSalt } from '../../utils/crypto';
import { downloadFile, isCapacitor } from '../../utils/platform';
import { getCurrentDateStr } from '../../utils/formatters';
import {
  User,
  Shield,
  Download,
  Upload,
  Plus,
  Trash2,
  Lock,
  Database,
  Check,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';

const CURRENCIES = [
  { symbol: '₹', name: 'INR (Indian Rupee)' },
  { symbol: '$', name: 'USD (US Dollar)' },
  { symbol: '€', name: 'EUR (Euro)' },
  { symbol: '£', name: 'GBP (British Pound)' },
  { symbol: 'AED', name: 'AED (Emirati Dirham)' },
  { symbol: 'C$', name: 'CAD (Canadian Dollar)' },
  { symbol: 'A$', name: 'AUD (Australian Dollar)' },
  { symbol: '¥', name: 'JPY (Japanese Yen)' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRefreshData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRefreshData,
}) => {
  const { user, updateUserSettings } = useAuth();
  const { syncStatus, lastSyncedAt, serverUrl, triggerSync, updateServerUrl, testConnection } = useSync();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'categories' | 'neon' | 'backup'>('profile');

  // Profile fields
  const [name, setName] = useState<string>(user?.name || '');
  const [currency, setCurrency] = useState<string>(user?.currency || '₹');
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(user?.autoLockMinutes ?? 15);
  const [newPin, setNewPin] = useState<string>('');

  // Category creation fields
  const [catName, setCatName] = useState<string>('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catIcon, setCatIcon] = useState<string>('Tag');
  const [catColor, setCatColor] = useState<string>('#10b981');

  // Neon Sync fields
  const [customServerUrl, setCustomServerUrl] = useState<string>(serverUrl);
  const [isTestingNeon, setIsTestingNeon] = useState<boolean>(false);
  const [neonTestResult, setNeonTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isCopiedSql, setIsCopiedSql] = useState<boolean>(false);

  // Backup fields
  const [exportPassphrase, setExportPassphrase] = useState<string>('');
  const [importPassphrase, setImportPassphrase] = useState<string>('');
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!user) return;

    try {
      const updates: any = {
        name: name.trim(),
        currency,
        autoLockMinutes: Number(autoLockMinutes),
      };

      if (newPin.trim()) {
        if (!/^\d{4}$/.test(newPin.trim())) {
          setFeedback({ type: 'error', message: 'PIN must be exactly 4 numeric digits.' });
          return;
        }
        const pinHash = await hashWithSalt(newPin.trim(), user.salt);
        updates.pinHash = pinHash;
      }

      await updateUserSettings(updates);
      setNewPin('');
      setFeedback({ type: 'success', message: 'Profile settings updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update settings.' });
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!user || !user.id) return;
    if (!catName.trim()) {
      setFeedback({ type: 'error', message: 'Category name is required.' });
      return;
    }

    try {
      await db.categories.add({
        userId: user.id,
        name: catName.trim(),
        type: catType,
        icon: catIcon,
        color: catColor,
      });

      setCatName('');
      setFeedback({ type: 'success', message: `Category "${catName}" added.` });
      onRefreshData();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to create category.' });
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    setFeedback(null);
    try {
      await db.categories.delete(catId);
      onRefreshData();
      setFeedback({ type: 'success', message: 'Category removed.' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to delete category.' });
    }
  };

  const handleTestNeon = async () => {
    setIsTestingNeon(true);
    setNeonTestResult(null);

    const res = await testConnection(customServerUrl);
    setIsTestingNeon(false);

    if (res.success && res.connected) {
      setNeonTestResult({ success: true, message: 'Connected to Neon Serverless Postgres via /api/sync!' });
      await updateServerUrl(customServerUrl);
    } else {
      setNeonTestResult({
        success: false,
        message: res.error || 'Connection failed. Check Vercel deployment and DATABASE_URL variable.',
      });
    }
  };

  const handleSaveNeonUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateServerUrl(customServerUrl);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Neon server URL saved and verified!' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Saved, but could not reach server.' });
    }
  };

  const handleCopySql = () => {
    const sqlText = `-- TrackWise Neon PostgreSQL Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  budget_limit NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  category_name TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  receipt_base64 TEXT,
  created_at BIGINT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_day INTEGER NOT NULL,
  category_name TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  last_paid_month TEXT,
  auto_remind BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL,
  target_date TEXT NOT NULL,
  color TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  person_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL,
  note TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (username, updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (username, updated_at);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills (username, updated_at);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (username, updated_at);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts (username, updated_at);`;

    navigator.clipboard.writeText(sqlText);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2500);
  };

  const handleExportBackup = async () => {
    if (!user || !user.id) return;
    setFeedback(null);
    setIsExporting(true);

    try {
      const userTransactions = await db.transactions.where('userId').equals(user.id).toArray();
      const userCategories = await db.categories.where('userId').equals(user.id).toArray();
      const userBills = await db.bills.where('userId').equals(user.id).toArray();
      const userGoals = await db.goals.where('userId').equals(user.id).toArray();
      const userDebts = await db.debts.where('userId').equals(user.id).toArray();

      const serializedTransactions = await Promise.all(
        userTransactions.map(async (t) => {
          let receiptBase64: string | undefined = undefined;
          if (t.receiptBlob) {
            try {
              receiptBase64 = await blobToBase64(t.receiptBlob);
            } catch (err) {
              console.warn('Could not encode receipt blob for export', err);
            }
          }
          return {
            amount: t.amount,
            type: t.type,
            paymentMode: t.paymentMode,
            categoryId: t.categoryId,
            date: t.date,
            note: t.note,
            receiptBase64,
            createdAt: t.createdAt,
          };
        })
      );

      const backupData: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        user: {
          username: user.username,
          name: user.name,
          passwordHash: user.passwordHash,
          pinHash: user.pinHash,
          salt: user.salt,
          currency: user.currency,
          theme: user.theme,
          autoLockMinutes: user.autoLockMinutes,
          createdAt: user.createdAt,
        },
        categories: userCategories.map((c) => ({
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          budgetLimit: c.budgetLimit,
        })),
        transactions: serializedTransactions,
        bills: userBills.map((b) => ({
          title: b.title,
          amount: b.amount,
          dueDay: b.dueDay,
          categoryId: b.categoryId,
          paymentMode: b.paymentMode,
          lastPaidMonth: b.lastPaidMonth,
          autoRemind: b.autoRemind,
        })),
        goals: userGoals.map((g) => ({
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          targetDate: g.targetDate,
          color: g.color,
        })),
        debts: userDebts.map((d) => ({
          personName: d.personName,
          amount: d.amount,
          type: d.type,
          date: d.date,
          dueDate: d.dueDate,
          status: d.status,
          note: d.note,
        })),
      };

      const plainJson = JSON.stringify(backupData, null, 2);
      let outputContent = plainJson;

      if (exportPassphrase.trim()) {
        outputContent = await encryptBackup(plainJson, exportPassphrase.trim());
      }

      const blob = new Blob([outputContent], { type: 'application/json' });
      downloadFile(blob, `TrackWise_Backup_${getCurrentDateStr()}.json`);
      setFeedback({ type: 'success', message: 'Encrypted backup downloaded safely.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to create backup: ' + err.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPendingImportData(content);
      try {
        const parsed = JSON.parse(content);
        if (parsed.version === 1 && parsed.ciphertext && parsed.iv) {
          setImportPassphrase('');
        } else {
          executeRestore(content);
        }
      } catch (err) {
        setFeedback({ type: 'error', message: 'Invalid backup file format.' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDecryptAndRestore = async () => {
    if (!pendingImportData || !importPassphrase) {
      setFeedback({ type: 'error', message: 'Please enter your backup passphrase.' });
      return;
    }

    try {
      const decrypted = await decryptBackup(pendingImportData, importPassphrase);
      await executeRestore(decrypted);
      setPendingImportData(null);
      setImportPassphrase('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Decryption failed.' });
    }
  };

  const executeRestore = async (jsonString: string) => {
    if (!user || !user.id) return;
    setIsImporting(true);

    try {
      const data: BackupData = JSON.parse(jsonString);
      if (!data.categories || !data.transactions) {
        throw new Error('Incompatible backup format.');
      }

      for (const cat of data.categories) {
        const existing = await db.categories
          .where({ userId: user.id, name: cat.name })
          .first();

        if (!existing) {
          await db.categories.add({
            ...cat,
            userId: user.id,
          });
        }
      }

      for (const t of data.transactions) {
        let receiptBlob: Blob | undefined = undefined;
        if (t.receiptBase64) {
          try {
            receiptBlob = base64ToBlob(t.receiptBase64);
          } catch (err) {
            console.warn('Failed to decode receipt blob', err);
          }
        }

        await db.transactions.add({
          userId: user.id,
          amount: t.amount,
          type: t.type,
          paymentMode: t.paymentMode,
          categoryId: t.categoryId,
          date: t.date,
          note: t.note,
          receiptBlob,
          createdAt: t.createdAt || Date.now(),
        });
      }

      if (data.bills) {
        for (const b of data.bills) {
          await db.bills.add({
            ...b,
            userId: user.id,
          });
        }
      }

      if (data.goals) {
        for (const g of data.goals) {
          await db.goals.add({
            ...g,
            userId: user.id,
          });
        }
      }

      if (data.debts) {
        for (const d of data.debts) {
          await db.debts.add({
            ...d,
            userId: user.id,
          });
        }
      }

      setFeedback({
        type: 'success',
        message: 'Restore complete! Successfully imported data.',
      });
      onRefreshData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Restore failed: ' + err.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings, Security & Cloud Sync"
      subtitle="Manage profile, categories, Neon Postgres cloud sync, and offline backups"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Nav Tabs */}
        <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] sm:text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-1.5 rounded-lg transition ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('neon')}
            className={`py-1.5 rounded-lg transition ${
              activeTab === 'neon'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Neon Sync
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`py-1.5 rounded-lg transition ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-1.5 rounded-lg transition ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Backup
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Auto-Lock Timeout
                </label>
                <select
                  value={autoLockMinutes}
                  onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value={0}>Never Auto-Lock</option>
                  <option value={5}>5 Minutes Inactivity</option>
                  <option value={15}>15 Minutes Inactivity</option>
                  <option value={30}>30 Minutes Inactivity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Set / Change 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={user?.pinHash ? '•••• (Leave blank to keep)' : 'Set 4-digit PIN'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold transition shadow-sm"
              >
                Save Profile
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: NEON CLOUD SYNC */}
        {activeTab === 'neon' && (
          <div className="space-y-4 pt-1">
            {/* Status Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Neon Serverless PostgreSQL
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{syncStatus}</span> {lastSyncedAt ? `(Last synced: ${lastSyncedAt})` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => triggerSync()}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Now</span>
              </button>
            </div>

            {/* Server Endpoint URL (Needed for Android APK to connect to Vercel) */}
            <form onSubmit={handleSaveNeonUrl} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sync Server URL (Vercel Deployment)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="https://your-expense-tracker.vercel.app"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTestNeon}
                  disabled={isTestingNeon}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs transition"
                >
                  {isTestingNeon ? 'Testing...' : 'Test'}
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition"
                >
                  Save
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                {isCapacitor()
                  ? 'On Android, set this to your deployed Vercel domain (e.g. https://my-app.vercel.app).'
                  : 'On Web, leaving this blank automatically uses your current domain.'}
              </p>
            </form>

            {neonTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
                  neonTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}
              >
                {neonTestResult.success ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{neonTestResult.message}</span>
              </div>
            )}

            {/* Neon Setup Guide & 1-Click SQL Copy */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Neon 3-Step Quick Setup
                </span>
                <button
                  onClick={handleCopySql}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition"
                >
                  {isCopiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <ol className="list-decimal list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <li>
                  Create a free project at{' '}
                  <a
                    href="https://neon.tech"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-500 underline inline-flex items-center"
                  >
                    neon.tech <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                </li>
                <li>Open the <strong>SQL Editor</strong> in Neon, paste the copied SQL script, and click <strong>Run</strong>.</li>
                <li>In your <strong>Vercel Project Settings → Environment Variables</strong>, add:
                  <div className="mt-1 font-mono text-[10px] bg-slate-200 dark:bg-slate-900 p-1.5 rounded-lg select-all">
                    DATABASE_URL = postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-4 pt-1">
            <form
              onSubmit={handleAddCategory}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Create Custom Category
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Category Name"
                  required
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                />

                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 mb-1">Pick Icon</label>
                  <select
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    {AVAILABLE_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Color</label>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                </div>

                <div className="pt-3.5">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <CategoryIcon iconName={c.icon} color={c.color} className="w-4 h-4" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      ({c.type})
                    </span>
                  </div>

                  <button
                    onClick={() => c.id && handleDeleteCategory(c.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP */}
        {activeTab === 'backup' && (
          <div className="space-y-5 pt-1">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Export Encrypted JSON Backup
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Download an offline backup file encrypted with Web Crypto AES-GCM.
              </p>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Passphrase (Optional)
                </label>
                <input
                  type="password"
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="Enter a passphrase to encrypt"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold text-xs transition shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Packaging...' : 'Export Backup JSON'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-sky-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Restore / Import Data
                </h4>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileSelected}
                className="hidden"
              />

              {pendingImportData ? (
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Enter Passphrase to Decrypt File:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      value={importPassphrase}
                      onChange={(e) => setImportPassphrase(e.target.value)}
                      placeholder="Passphrase used during export"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleDecryptAndRestore}
                      disabled={isImporting}
                      className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs transition"
                    >
                      {isImporting ? 'Restoring...' : 'Decrypt & Restore'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Backup File (.json)</span>
                </button>
              )}
            </div>
          </div>
        )}
        {/* Settings Footer Attribution */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            TrackWise • Credits: Made by <span className="text-emerald-500 font-semibold">Anurag Bawaskar</span>
          </p>
        </div>
      </div>
    </Modal>
  );
};
