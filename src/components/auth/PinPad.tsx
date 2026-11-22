import React, { useState } from 'react';
import { Delete, Check } from 'lucide-react';

interface PinPadProps {
  onComplete: (pin: string) => void;
  error?: string;
  title?: string;
}

export const PinPad: React.FC<PinPadProps> = ({
  onComplete,
  error,
  title = 'Enter 4-Digit Quick PIN',
}) => {
  const [pin, setPin] = useState<string>('');

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        onComplete(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-4">{title}</p>

      {/* PIN Dots Display */}
      <div className="flex items-center space-x-4 mb-6">
        {[0, 1, 2, 3].map((index) => {
          const filled = index < pin.length;
          return (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                filled
                  ? 'bg-emerald-500 scale-110 shadow-sm shadow-emerald-500/50'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          );
        })}
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 mb-4 animate-shake text-center">
          {error}
        </p>
      )}

      {/* Numeric Keypad Grid */}
      <div className="grid grid-cols-3 gap-3.5 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xl active:scale-95 transition shadow-sm"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          className="h-14 rounded-2xl text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition flex items-center justify-center"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xl active:scale-95 transition shadow-sm"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          className="h-14 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition flex items-center justify-center active:scale-95"
          title="Backspace"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
