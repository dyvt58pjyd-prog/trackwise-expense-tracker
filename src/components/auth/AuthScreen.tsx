import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PinPad } from './PinPad';
import { Lock, UserCheck, KeyRound, UserPlus, Shield, ChevronDown, CheckCircle2 } from 'lucide-react';

const CURRENCY_OPTIONS = [
  { symbol: '₹', name: 'INR (Indian Rupee)' },
  { symbol: '$', name: 'USD (US Dollar)' },
  { symbol: '€', name: 'EUR (Euro)' },
  { symbol: '£', name: 'GBP (British Pound)' },
  { symbol: 'AED', name: 'AED (Emirati Dirham)' },
  { symbol: 'C$', name: 'CAD (Canadian Dollar)' },
  { symbol: 'A$', name: 'AUD (Australian Dollar)' },
  { symbol: '¥', name: 'JPY (Japanese Yen)' },
];

export const AuthScreen: React.FC = () => {
  const { user, allUsers, login, register, unlockWithPin, switchUser } = useAuth();

  const [mode, setMode] = useState<'pin' | 'password' | 'register'>(() => {
    if (allUsers.length === 0 && !user) return 'register';
    if (user?.pinHash) return 'pin';
    return 'password';
  });

  // Login Form
  const [username, setUsername] = useState<string>(user?.username || '');
  const [password, setPassword] = useState<string>('');

  // Register Form
  const [regName, setRegName] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regPin, setRegPin] = useState<string>('');
  const [regCurrency, setRegCurrency] = useState<string>('₹');

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    const res = await login(username, password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Login failed.');
    } else {
      setPassword('');
    }
  };

  const handlePinComplete = async (pin: string) => {
    setErrorMessage('');
    const success = await unlockWithPin(pin);
    if (!success) {
      setErrorMessage('Incorrect PIN. Please try again or use password.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (regPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (regPin && !/^\d{4}$/.test(regPin)) {
      setErrorMessage('PIN must be exactly 4 digits.');
      return;
    }

    setIsSubmitting(true);
    const res = await register(regName, regUsername, regPassword, regPin, regCurrency);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* App Logo & Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <Lock className="w-7 h-7 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TrackWise</h1>
          <p className="text-xs text-slate-400 mt-1">
            Offline Personal Finance, Expense & Bill Tracker
          </p>
        </div>

        {/* User Switcher Dropdown (if multiple accounts exist) */}
        {allUsers.length > 1 && mode !== 'register' && (
          <div className="mb-6 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 px-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200">{user?.name}</p>
                <p className="text-[10px] text-slate-400">@{user?.username}</p>
              </div>
            </div>
            <select
              value={user?.id}
              onChange={(e) => {
                switchUser(Number(e.target.value));
                setErrorMessage('');
              }}
              className="bg-slate-900 text-xs text-slate-300 border border-slate-700 rounded-lg px-2 py-1 outline-none cursor-pointer"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (@{u.username})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* PIN MODE */}
        {mode === 'pin' && user && user.pinHash && (
          <div>
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-slate-200">Welcome back, {user.name}!</p>
            </div>

            <PinPad onComplete={handlePinComplete} error={errorMessage} />

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setMode('password');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                Use Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setMode('register');
                }}
                className="text-slate-400 hover:text-slate-200 font-medium"
              >
                + New Profile
              </button>
            </div>
          </div>
        )}

        {/* PASSWORD LOGIN MODE */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {allUsers.length > 0 && user && (
              <div className="text-center mb-2">
                <p className="text-sm font-medium text-slate-200">
                  Unlock for <span className="text-emerald-400">{user.name}</span>
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Unlock Account'}
            </button>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              {user?.pinHash ? (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setMode('pin');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Use 4-Digit PIN
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setMode('register');
                }}
                className="text-slate-400 hover:text-slate-200 font-medium"
              >
                + Register New Profile
              </button>
            </div>
          </form>
        )}

        {/* REGISTER MODE */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="text-center mb-1">
              <h2 className="text-base font-bold text-white">Create Offline Account</h2>
              <p className="text-xs text-slate-400">All data stays 100% on this local device</p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Anurag"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username *</label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="e.g. anurag"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 4 chars"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  4-Digit PIN <span className="text-slate-400 font-normal">(Opt)</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition text-center tracking-widest font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Default Currency</label>
              <select
                value={regCurrency}
                onChange={(e) => setRegCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.symbol} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Profile...' : 'Complete Registration'}
            </button>

            {allUsers.length > 0 && (
              <div className="pt-3 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setMode(user?.pinHash ? 'pin' : 'password');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  ← Back to Unlock Screen
                </button>
              </div>
            )}
          </form>
        )}

        {/* Security Trust Badge & Creator Credit */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col items-center justify-center space-y-1 text-center">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Web Crypto SHA-256 Salted • Zero Cloud Transmission</span>
          </div>
          <p className="text-[10px] text-slate-500 pt-0.5">
            Credits: Made by <span className="text-emerald-400 font-medium">Anurag Bawaskar</span>
          </p>
        </div>
      </div>
    </div>
  );
};
