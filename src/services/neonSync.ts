import { db } from '../db/database';
import { User, Category, Transaction, Bill, Goal, Debt } from '../types';
import { generateSyncId } from '../utils/crypto';
import { blobToBase64, base64ToBlob } from '../utils/imageCompression';
import { isCapacitor, isElectron } from '../utils/platform';

const STORAGE_SERVER_URL_KEY = 'trackwise_sync_server_url';

export function getSyncServerUrl(): string {
  const customUrl = localStorage.getItem(STORAGE_SERVER_URL_KEY);
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // If in Capacitor Android or Electron, a full URL is needed if not hosted on localhost
  if (typeof window !== 'undefined' && window.location.origin && !isCapacitor()) {
    return window.location.origin;
  }

  return '';
}

export function saveSyncServerUrl(url: string): void {
  localStorage.setItem(STORAGE_SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
}

export async function testNeonServerConnection(targetUrl?: string): Promise<{ success: boolean; connected?: boolean; engine?: string; error?: string }> {
  const baseUrl = targetUrl !== undefined ? targetUrl.trim().replace(/\/+$/, '') : getSyncServerUrl();
  const endpoint = `${baseUrl}/api/sync`;

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
 * Full 2-way sync with Neon Serverless Postgres via /api/sync
 */
export async function syncWithNeonServer(user: User, targetUrl?: string): Promise<{ success: boolean; timestamp: string }> {
  if (!user || !user.id || !user.username) {
    throw new Error('User not logged in for sync.');
  }

  const baseUrl = targetUrl !== undefined ? targetUrl.trim().replace(/\/+$/, '') : getSyncServerUrl();
  const endpoint = `${baseUrl}/api/sync`;

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

  // 2. Dispatch to /api/sync
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

  const resData = await response.json();
  if (!response.ok || !resData.success) {
    throw new Error(resData.error || `HTTP ${response.status}: Server sync failed.`);
  }

  const { pull, timestamp } = resData;

  // 3. Upsert PULL records into Dexie
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
