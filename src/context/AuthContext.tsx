import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { db, seedDefaultCategories } from '../db/database';
import { generateSalt, hashWithSalt } from '../utils/crypto';

interface AuthContextType {
  user: User | null;
  isLocked: boolean;
  isLoading: boolean;
  allUsers: User[];
  register: (name: string, username: string, password: string, pin?: string, currency?: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  quickLock: () => void;
  logout: () => void;
  updateUserSettings: (updates: Partial<User>) => Promise<void>;
  switchUser: (userId: number) => Promise<void>;
  refreshUsers: () => Promise<void>;
  resetPassword: (username: string, newPassword: string, newPin?: string) => Promise<{ success: boolean; error?: string }>;
  instantUnlock: (userId?: number) => Promise<boolean>;
  deleteUser: (userId: number) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_USER_ID_KEY = 'trackwise_active_user_id';
const SESSION_UNLOCKED_KEY = 'trackwise_session_unlocked';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const refreshUsers = useCallback(async () => {
    try {
      const users = await db.users.toArray();
      setAllUsers(users);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const users = await db.users.toArray();
        setAllUsers(users);

        const savedUserId = localStorage.getItem(ACTIVE_USER_ID_KEY);
        if (savedUserId && users.length > 0) {
          const matched = users.find((u) => u.id === Number(savedUserId));
          if (matched) {
            setUser(matched);
            const sessionUnlocked = sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
            setIsLocked(!sessionUnlocked);
          } else {
            setUser(users[0]);
            setIsLocked(true);
          }
        } else if (users.length > 0) {
          setUser(users[0]);
          setIsLocked(true);
        }
      } catch (err) {
        console.error('Init Auth error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Idle timer auto-lock
  useEffect(() => {
    if (!user || isLocked || user.autoLockMinutes === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('mousedown', resetActivity);
    window.addEventListener('touchstart', resetActivity);
    window.addEventListener('scroll', resetActivity);

    const checkIntervalMs = 15000; // Check every 15s
    timerRef.current = setInterval(() => {
      const lockThresholdMs = user.autoLockMinutes * 60 * 1000;
      if (Date.now() - lastActivityRef.current > lockThresholdMs) {
        setIsLocked(true);
        sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
      }
    }, checkIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('mousedown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      window.removeEventListener('scroll', resetActivity);
    };
  }, [user, isLocked]);

  const register = async (
    name: string,
    username: string,
    password: string,
    pin?: string,
    currency = '₹'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      const existing = await db.users.where('username').equalsIgnoreCase(cleanUsername).first();
      if (existing) {
        return { success: false, error: 'Username already exists. Please choose another.' };
      }

      const salt = generateSalt();
      const passwordHash = await hashWithSalt(password, salt);
      let pinHash: string | undefined = undefined;
      if (pin && pin.length === 4) {
        pinHash = await hashWithSalt(pin, salt);
      }

      const newUser: User = {
        name: name.trim(),
        username: cleanUsername,
        passwordHash,
        pinHash,
        salt,
        currency,
        theme: 'dark',
        autoLockMinutes: 15,
        createdAt: Date.now(),
      };

      const userId = await db.users.add(newUser);
      newUser.id = userId;

      // Seed starter categories
      await seedDefaultCategories(userId);

      setUser(newUser);
      setIsLocked(false);
      localStorage.setItem(ACTIVE_USER_ID_KEY, String(userId));
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      await refreshUsers();

      return { success: true };
    } catch (err: any) {
      console.error('Registration error:', err);
      return { success: false, error: err.message || 'Failed to create account.' };
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      const matched = await db.users.where('username').equalsIgnoreCase(cleanUsername).first();
      if (!matched) {
        return { success: false, error: 'User not found. Check your username.' };
      }

      const computedHash = await hashWithSalt(password, matched.salt);
      if (computedHash !== matched.passwordHash) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      setUser(matched);
      setIsLocked(false);
      localStorage.setItem(ACTIVE_USER_ID_KEY, String(matched.id));
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  };

  const unlockWithPin = async (pin: string): Promise<boolean> => {
    if (!user || !user.pinHash) return false;
    const computedHash = await hashWithSalt(pin, user.salt);
    if (computedHash === user.pinHash) {
      setIsLocked(false);
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      lastActivityRef.current = Date.now();
      return true;
    }
    return false;
  };

  const quickLock = () => {
    setIsLocked(true);
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
  };

  const logout = () => {
    setIsLocked(true);
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
  };

  const switchUser = async (userId: number) => {
    const target = allUsers.find((u) => u.id === userId);
    if (target) {
      setUser(target);
      setIsLocked(true);
      localStorage.setItem(ACTIVE_USER_ID_KEY, String(target.id));
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    }
  };

  const updateUserSettings = async (updates: Partial<User>) => {
    if (!user || !user.id) return;
    await db.users.update(user.id, updates);
    const updated = { ...user, ...updates };
    setUser(updated);
    setAllUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
  };

  const resetPassword = async (
    username: string,
    newPassword: string,
    newPin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      const matched = await db.users.where('username').equalsIgnoreCase(cleanUsername).first();
      if (!matched) {
        return { success: false, error: 'User profile not found. Check username.' };
      }

      const salt = generateSalt();
      const passwordHash = await hashWithSalt(newPassword, salt);
      let pinHash: string | undefined = undefined;
      if (newPin && newPin.length === 4) {
        pinHash = await hashWithSalt(newPin, salt);
      }

      await db.users.update(matched.id!, {
        salt,
        passwordHash,
        pinHash: newPin ? pinHash : matched.pinHash,
      });

      const updated = {
        ...matched,
        salt,
        passwordHash,
        pinHash: newPin ? pinHash : matched.pinHash,
      };
      setUser(updated);
      setIsLocked(false);
      localStorage.setItem(ACTIVE_USER_ID_KEY, String(matched.id));
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      lastActivityRef.current = Date.now();
      await refreshUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reset credentials.' };
    }
  };

  const instantUnlock = async (userId?: number): Promise<boolean> => {
    try {
      let target = user;
      if (userId) {
        target = allUsers.find((u) => u.id === userId) || null;
      } else if (!target && allUsers.length > 0) {
        target = allUsers[0];
      }

      if (!target || !target.id) return false;

      setUser(target);
      setIsLocked(false);
      localStorage.setItem(ACTIVE_USER_ID_KEY, String(target.id));
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      lastActivityRef.current = Date.now();
      return true;
    } catch {
      return false;
    }
  };

  const deleteUser = async (userId: number): Promise<boolean> => {
    try {
      await db.users.delete(userId);
      await refreshUsers();
      const remaining = allUsers.filter((u) => u.id !== userId);
      if (remaining.length > 0) {
        setUser(remaining[0]);
      } else {
        setUser(null);
      }
      setIsLocked(true);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLocked,
        isLoading,
        allUsers,
        register,
        login,
        unlockWithPin,
        quickLock,
        logout,
        updateUserSettings,
        switchUser,
        refreshUsers,
        resetPassword,
        instantUnlock,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
