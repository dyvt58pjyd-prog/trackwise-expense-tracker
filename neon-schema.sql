-- ============================================================
-- TrackWise Personal Finance - Neon PostgreSQL Database Schema
-- Copy and run this in your Neon SQL Editor at https://console.neon.tech
-- ============================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categories Table
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

-- 3. Transactions Table (Includes client-compressed receipt attachments)
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

-- 4. Recurring Bills Table
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

-- 5. Savings Goals Table
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

-- 6. Lend & Borrow (Udhar) Table
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

-- 7. High-Performance Sync Indexes
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (username, updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (username, updated_at);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills (username, updated_at);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (username, updated_at);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts (username, updated_at);
