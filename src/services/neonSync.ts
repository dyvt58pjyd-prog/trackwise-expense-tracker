import { db } from '../db/database';
import { User, Category, Transaction, Bill, Goal, Debt } from '../types';
import { generateSyncId } from '../utils/crypto';
import { blobToBase64, base64ToBlob } from '../utils/imageCompression';
import { isCapacitor, isElectron } from '../utils/platform';
import { neon } from '@neondatabase/serverless';

export const DEFAULT_NEON_DATABASE_URL =
  import.meta.env.VITE_DATABASE_URL ||
  'postgresql://neondb_owner:npg_9mo7esCPuTLg@ep-aged-field-befka0w6-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require';

const STORAGE_SERVER_URL_KEY = 'trackwise_sync_server_url';

export function getSyncServerUrl(): string {
  const customUrl = localStorage.getItem(STORAGE_SERVER_URL_KEY);
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // If in Electron, we connect directly via native bridge or direct Neon driver
  if (isElectron()) {
    return DEFAULT_NEON_DATABASE_URL;
  }

  // If in standard web browser
  if (typeof window !== 'undefined' && window.location.origin && !isCapacitor() && !window.location.protocol.startsWith('file')) {
    return window.location.origin;
  }

  return DEFAULT_NEON_DATABASE_URL;
}

export function saveSyncServerUrl(url: string): void {
  localStorage.setItem(STORAGE_SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
}

/**
 * Tests connection to Neon Serverless Postgres
 */
export async function testNeonServerConnection(targetUrl?: string): Promise<{
  success: boolean;
  connected?: boolean;
  engine?: string;
  error?: string;
}> {
  // 1. Electron Native Desktop IPC
  if (typeof window !== 'undefined' && window.electronAPI?.neonTest) {
    try {
      return await window.electronAPI.neonTest(targetUrl);
    } catch (err: any) {
      return { success: false, connected: false, error: err.message };
    }
  }

  const effectiveUrl = targetUrl !== undefined && targetUrl.trim() ? targetUrl.trim() : getSyncServerUrl();

  // 2. Direct Neon Postgres connection (via SQL HTTP API)
  if (effectiveUrl.startsWith('postgres://') || effectiveUrl.startsWith('postgresql://')) {
    try {
      const sql = neon(effectiveUrl);
      const res = await sql`SELECT 1 as connected, current_database() as db`;
      return {
        success: true,
        connected: Boolean(res?.[0]?.connected),
        engine: 'Neon Serverless PostgreSQL (Direct Driver)',
      };
    } catch (err: any) {
      return { success: false, connected: false, error: err.message };
    }
  }

  // 3. Fallback to /api/sync endpoint (e.g. Vercel deployment)
  const endpoint = `${effectiveUrl.replace(/\/+$/, '')}/api/sync`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, connected: data.connected, engine: data.engine };
    }
    return { success: false, error: data.error || `HTTP ${res.status}: Failed connection test.` };
  } catch (err: any) {
    return {
      success: false,
      error:
        err.message === 'Failed to fetch'
          ? 'Cannot reach sync server. Check your internet connection or server URL.'
          : err.message,
    };
  }
}

/**
 * Full 2-way sync with Neon Serverless Postgres
 */
export async function syncWithNeonServer(
  user: User,
  targetUrl?: string
): Promise<{ success: boolean; timestamp: string }> {
  if (!user || !user.id || !user.username) {
    throw new Error('User not logged in for sync.');
  }

  // 1. Prepare local push payload
  const localCats = await db.categories.where('userId').equals(user.id).toArray();
  const catMap = new Map<number, Category>(localCats.map((c) => [c.id!, c]));

  // Ensure categories have syncIds
  for (const c of localCats) {
    if (!c.syncId) {
      c.syncId = generateSyncId('cat');
      await db.categories.update(c.id!, { syncId: c.syncId });
    }
  }

  const pushCategories = localCats.map((c) => ({
    syncId: c.syncId,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    budgetLimit: c.budgetLimit,
  }));

  // Ensure transactions have syncIds & category names
  const localTxs = await db.transactions.where('userId').equals(user.id).toArray();
  const pushTransactions = await Promise.all(
    localTxs.map(async (t) => {
      if (!t.syncId) {
        t.syncId = generateSyncId('tx');
        await db.transactions.update(t.id!, { syncId: t.syncId });
      }

      let receiptBase64: string | undefined = undefined;
      if (t.receiptBlob) {
        try {
          receiptBase64 = await blobToBase64(t.receiptBlob);
        } catch (e) {
          console.warn('Could not encode receipt for push', e);
        }
      }

      const cat = catMap.get(t.categoryId);
      return {
        syncId: t.syncId,
        amount: t.amount,
        type: t.type,
        paymentMode: t.paymentMode,
        categoryName: cat ? cat.name : 'Other',
        date: t.date,
        note: t.note,
        receiptBase64,
        createdAt: t.createdAt,
      };
    })
  );

  // Bills
  const localBills = await db.bills.where('userId').equals(user.id).toArray();
  for (const b of localBills) {
    if (!b.syncId) {
      b.syncId = generateSyncId('bill');
      await db.bills.update(b.id!, { syncId: b.syncId });
    }
  }

  const pushBills = localBills.map((b) => {
    const cat = catMap.get(b.categoryId);
    return {
      syncId: b.syncId,
      title: b.title,
      amount: b.amount,
      dueDay: b.dueDay,
      categoryName: cat ? cat.name : 'Bills & Utilities',
      paymentMode: b.paymentMode,
      lastPaidMonth: b.lastPaidMonth,
      autoRemind: b.autoRemind,
    };
  });

  // Goals
  const localGoals = await db.goals.where('userId').equals(user.id).toArray();
  for (const g of localGoals) {
    if (!g.syncId) {
      g.syncId = generateSyncId('goal');
      await db.goals.update(g.id!, { syncId: g.syncId });
    }
  }

  const pushGoals = localGoals.map((g) => ({
    syncId: g.syncId,
    title: g.title,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    targetDate: g.targetDate,
    color: g.color,
  }));

  // Debts
  const localDebts = await db.debts.where('userId').equals(user.id).toArray();
  for (const d of localDebts) {
    if (!d.syncId) {
      d.syncId = generateSyncId('debt');
      await db.debts.update(d.id!, { syncId: d.syncId });
    }
  }

  const pushDebts = localDebts.map((d) => ({
    syncId: d.syncId,
    personName: d.personName,
    amount: d.amount,
    type: d.type,
    date: d.date,
    dueDate: d.dueDate,
    status: d.status,
    note: d.note,
  }));

  const lastSyncedAt = localStorage.getItem('trackwise_last_synced_at');

  let resData: {
    success: boolean;
    timestamp: string;
    pull?: {
      categories?: any[];
      transactions?: any[];
      bills?: any[];
      goals?: any[];
      debts?: any[];
    };
    error?: string;
  };

  // 2. Dispatch Sync
  // Method A: Native Electron Bridge
  if (typeof window !== 'undefined' && window.electronAPI?.neonSync) {
    resData = await window.electronAPI.neonSync({
      username: user.username,
      lastSyncedAt,
      connectionString: targetUrl || DEFAULT_NEON_DATABASE_URL,
      push: {
        categories: pushCategories,
        transactions: pushTransactions,
        bills: pushBills,
        goals: pushGoals,
        debts: pushDebts,
      },
    });
  } else {
    const effectiveUrl = targetUrl !== undefined && targetUrl.trim() ? targetUrl.trim() : getSyncServerUrl();

    // Method B: Direct Neon Driver (Web / PWA / Capacitor)
    if (effectiveUrl.startsWith('postgres://') || effectiveUrl.startsWith('postgresql://')) {
      const sql = neon(effectiveUrl);
      const cleanUser = user.username.trim().toLowerCase();
      const nowIso = new Date().toISOString();

      // Push categories
      for (const cat of pushCategories) {
        if (!cat.syncId) continue;
        await sql`
          INSERT INTO categories (sync_id, username, name, type, icon, color, budget_limit, updated_at)
          VALUES (${cat.syncId}, ${cleanUser}, ${cat.name}, ${cat.type}, ${cat.icon}, ${cat.color}, ${cat.budgetLimit || null}, ${nowIso})
          ON CONFLICT (sync_id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            icon = EXCLUDED.icon,
            color = EXCLUDED.color,
            budget_limit = EXCLUDED.budget_limit,
            updated_at = ${nowIso};
        `;
      }

      // Push transactions
      for (const tx of pushTransactions) {
        if (!tx.syncId) continue;
        await sql`
          INSERT INTO transactions (sync_id, username, amount, type, payment_mode, category_name, date, note, receipt_base64, created_at, updated_at)
          VALUES (${tx.syncId}, ${cleanUser}, ${tx.amount}, ${tx.type}, ${tx.paymentMode}, ${tx.categoryName}, ${tx.date}, ${tx.note || null}, ${tx.receiptBase64 || null}, ${tx.createdAt || Date.now()}, ${nowIso})
          ON CONFLICT (sync_id) DO UPDATE SET
            amount = EXCLUDED.amount,
            type = EXCLUDED.type,
            payment_mode = EXCLUDED.payment_mode,
            category_name = EXCLUDED.category_name,
            date = EXCLUDED.date,
            note = EXCLUDED.note,
            receipt_base64 = COALESCE(EXCLUDED.receipt_base64, transactions.receipt_base64),
            updated_at = ${nowIso};
        `;
      }

      // Push bills
      for (const bill of pushBills) {
        if (!bill.syncId) continue;
        await sql`
          INSERT INTO bills (sync_id, username, title, amount, due_day, category_name, payment_mode, last_paid_month, auto_remind, updated_at)
          VALUES (${bill.syncId}, ${cleanUser}, ${bill.title}, ${bill.amount}, ${bill.dueDay}, ${bill.categoryName}, ${bill.paymentMode}, ${bill.lastPaidMonth || null}, ${bill.autoRemind ?? true}, ${nowIso})
          ON CONFLICT (sync_id) DO UPDATE SET
            title = EXCLUDED.title,
            amount = EXCLUDED.amount,
            due_day = EXCLUDED.due_day,
            category_name = EXCLUDED.category_name,
            payment_mode = EXCLUDED.payment_mode,
            last_paid_month = EXCLUDED.last_paid_month,
            auto_remind = EXCLUDED.auto_remind,
            updated_at = ${nowIso};
        `;
      }

      // Push goals
      for (const goal of pushGoals) {
        if (!goal.syncId) continue;
        await sql`
          INSERT INTO goals (sync_id, username, title, target_amount, current_amount, target_date, color, updated_at)
          VALUES (${goal.syncId}, ${cleanUser}, ${goal.title}, ${goal.targetAmount}, ${goal.currentAmount}, ${goal.targetDate}, ${goal.color}, ${nowIso})
          ON CONFLICT (sync_id) DO UPDATE SET
            title = EXCLUDED.title,
            target_amount = EXCLUDED.target_amount,
            current_amount = EXCLUDED.current_amount,
            target_date = EXCLUDED.target_date,
            color = EXCLUDED.color,
            updated_at = ${nowIso};
        `;
      }

      // Push debts
      for (const debt of pushDebts) {
        if (!debt.syncId) continue;
        await sql`
          INSERT INTO debts (sync_id, username, person_name, amount, type, date, due_date, status, note, updated_at)
          VALUES (${debt.syncId}, ${cleanUser}, ${debt.personName}, ${debt.amount}, ${debt.type}, ${debt.date}, ${debt.dueDate || null}, ${debt.status}, ${debt.note || null}, ${nowIso})
          ON CONFLICT (sync_id) DO UPDATE SET
            person_name = EXCLUDED.person_name,
            amount = EXCLUDED.amount,
            type = EXCLUDED.type,
            date = EXCLUDED.date,
            due_date = EXCLUDED.due_date,
            status = EXCLUDED.status,
            note = EXCLUDED.note,
            updated_at = ${nowIso};
        `;
      }

      // PULL latest records from Neon
      const [categories, transactions, bills, goals, debts] = await Promise.all([
        sql`SELECT sync_id, name, type, icon, color, budget_limit, updated_at FROM categories WHERE username = ${cleanUser}`,
        sql`SELECT sync_id, amount, type, payment_mode, category_name, date, note, receipt_base64, created_at, updated_at FROM transactions WHERE username = ${cleanUser} ORDER BY date DESC, created_at DESC`,
        sql`SELECT sync_id, title, amount, due_day, category_name, payment_mode, last_paid_month, auto_remind, updated_at FROM bills WHERE username = ${cleanUser}`,
        sql`SELECT sync_id, title, target_amount, current_amount, target_date, color, updated_at FROM goals WHERE username = ${cleanUser}`,
        sql`SELECT sync_id, person_name, amount, type, date, due_date, status, note, updated_at FROM debts WHERE username = ${cleanUser}`,
      ]);

      resData = {
        success: true,
        timestamp: nowIso,
        pull: {
          categories,
          transactions,
          bills,
          goals,
          debts,
        },
      };
    } else {
      // Method C: External Vercel HTTP Endpoint
      const endpoint = `${effectiveUrl.replace(/\/+$/, '')}/api/sync`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          lastSyncedAt,
          push: {
            categories: pushCategories,
            transactions: pushTransactions,
            bills: pushBills,
            goals: pushGoals,
            debts: pushDebts,
          },
        }),
      });

      resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || `HTTP ${response.status}: Server sync failed.`);
      }
    }
  }

  if (!resData.success) {
    throw new Error(resData.error || 'Neon sync failed.');
  }

  const { pull, timestamp } = resData;

  // 3. Upsert PULL records into Dexie IndexedDB
  // A. Categories
  if (pull?.categories) {
    for (const rc of pull.categories) {
      const existing = await db.categories
        .where('userId')
        .equals(user.id)
        .and((c) => c.syncId === rc.sync_id || c.name.toLowerCase() === rc.name.toLowerCase())
        .first();

      if (existing) {
        await db.categories.update(existing.id!, {
          syncId: rc.sync_id,
          name: rc.name,
          type: rc.type,
          icon: rc.icon,
          color: rc.color,
          budgetLimit: rc.budget_limit ? Number(rc.budget_limit) : undefined,
        });
      } else {
        await db.categories.add({
          userId: user.id,
          syncId: rc.sync_id,
          name: rc.name,
          type: rc.type,
          icon: rc.icon,
          color: rc.color,
          budgetLimit: rc.budget_limit ? Number(rc.budget_limit) : undefined,
        });
      }
    }
  }

  // Refresh category map for transactions and bills
  const refreshedCats = await db.categories.where('userId').equals(user.id).toArray();
  const nameToCat = new Map<string, Category>(
    refreshedCats.map((c) => [c.name.toLowerCase(), c])
  );
  const fallbackCatId = refreshedCats[0]?.id || 1;

  // B. Transactions
  if (pull?.transactions) {
    for (const rt of pull.transactions) {
      const cat = nameToCat.get((rt.category_name || '').toLowerCase());
      const categoryId = cat?.id || fallbackCatId;

      let receiptBlob: Blob | undefined = undefined;
      if (rt.receipt_base64) {
        try {
          receiptBlob = base64ToBlob(rt.receipt_base64);
        } catch (e) {
          console.warn('Could not parse receipt blob', e);
        }
      }

      const existing = await db.transactions
        .where('userId')
        .equals(user.id)
        .and((t) => t.syncId === rt.sync_id)
        .first();

      if (existing) {
        await db.transactions.update(existing.id!, {
          amount: Number(rt.amount),
          type: rt.type,
          paymentMode: rt.payment_mode,
          categoryId,
          date: rt.date,
          note: rt.note || undefined,
          receiptBlob: receiptBlob || existing.receiptBlob,
        });
      } else {
        await db.transactions.add({
          userId: user.id,
          syncId: rt.sync_id,
          amount: Number(rt.amount),
          type: rt.type,
          paymentMode: rt.payment_mode,
          categoryId,
          date: rt.date,
          note: rt.note || undefined,
          receiptBlob,
          createdAt: rt.created_at ? Number(rt.created_at) : Date.now(),
        });
      }
    }
  }

  // C. Bills
  if (pull?.bills) {
    for (const rb of pull.bills) {
      const cat = nameToCat.get((rb.category_name || '').toLowerCase());
      const categoryId = cat?.id || fallbackCatId;

      const existing = await db.bills
        .where('userId')
        .equals(user.id)
        .and((b) => b.syncId === rb.sync_id)
        .first();

      if (existing) {
        await db.bills.update(existing.id!, {
          title: rb.title,
          amount: Number(rb.amount),
          dueDay: Number(rb.due_day),
          categoryId,
          paymentMode: rb.payment_mode,
          lastPaidMonth: rb.last_paid_month || undefined,
          autoRemind: rb.auto_remind ?? true,
        });
      } else {
        await db.bills.add({
          userId: user.id,
          syncId: rb.sync_id,
          title: rb.title,
          amount: Number(rb.amount),
          dueDay: Number(rb.due_day),
          categoryId,
          paymentMode: rb.payment_mode,
          lastPaidMonth: rb.last_paid_month || undefined,
          autoRemind: rb.auto_remind ?? true,
        });
      }
    }
  }

  // D. Goals
  if (pull?.goals) {
    for (const rg of pull.goals) {
      const existing = await db.goals
        .where('userId')
        .equals(user.id)
        .and((g) => g.syncId === rg.sync_id)
        .first();

      if (existing) {
        await db.goals.update(existing.id!, {
          title: rg.title,
          targetAmount: Number(rg.target_amount),
          currentAmount: Number(rg.current_amount),
          targetDate: rg.target_date,
          color: rg.color,
        });
      } else {
        await db.goals.add({
          userId: user.id,
          syncId: rg.sync_id,
          title: rg.title,
          targetAmount: Number(rg.target_amount),
          currentAmount: Number(rg.current_amount),
          targetDate: rg.target_date,
          color: rg.color,
        });
      }
    }
  }

  // E. Debts
  if (pull?.debts) {
    for (const rd of pull.debts) {
      const existing = await db.debts
        .where('userId')
        .equals(user.id)
        .and((d) => d.syncId === rd.sync_id)
        .first();

      if (existing) {
        await db.debts.update(existing.id!, {
          personName: rd.person_name,
          amount: Number(rd.amount),
          type: rd.type,
          date: rd.date,
          dueDate: rd.due_date || undefined,
          status: rd.status,
          note: rd.note || undefined,
        });
      } else {
        await db.debts.add({
          userId: user.id,
          syncId: rd.sync_id,
          personName: rd.person_name,
          amount: Number(rd.amount),
          type: rd.type,
          date: rd.date,
          dueDate: rd.due_date || undefined,
          status: rd.status,
          note: rd.note || undefined,
        });
      }
    }
  }

  return { success: true, timestamp };
}
