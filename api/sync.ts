import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // CORS configuration for mobile (Capacitor APK) & desktop clients
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    res.status(500).json({
      success: false,
      error: 'DATABASE_URL environment variable is not configured in Vercel.',
    });
    return;
  }

  const sql = neon(databaseUrl);

  // 1. GET /api/sync -> Health check & DB connection test
  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT 1 as connected`;
      res.status(200).json({
        success: true,
        connected: Boolean(result?.[0]?.connected),
        timestamp: new Date().toISOString(),
        engine: 'Neon Serverless PostgreSQL',
      });
      return;
    } catch (err: any) {
      res.status(500).json({
        success: false,
        connected: false,
        error: err.message || 'Failed to connect to Neon database.',
      });
      return;
    }
  }

  // 2. POST /api/sync -> Bi-directional Sync
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username, push, lastSyncedAt } = body || {};

      if (!username || typeof username !== 'string') {
        res.status(400).json({ success: false, error: 'Username is required for sync scoping.' });
        return;
      }

      const cleanUser = username.trim().toLowerCase();
      const nowIso = new Date().toISOString();

      // PUSH 1: Categories
      if (push?.categories && Array.isArray(push.categories)) {
        for (const cat of push.categories) {
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
      }

      // PUSH 2: Transactions
      if (push?.transactions && Array.isArray(push.transactions)) {
        for (const tx of push.transactions) {
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
      }

      // PUSH 3: Bills
      if (push?.bills && Array.isArray(push.bills)) {
        for (const bill of push.bills) {
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
      }

      // PUSH 4: Goals
      if (push?.goals && Array.isArray(push.goals)) {
        for (const goal of push.goals) {
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
      }

      // PUSH 5: Debts
      if (push?.debts && Array.isArray(push.debts)) {
        for (const debt of push.debts) {
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
      }

      // PULL: Fetch all latest data for this user
      const categories = await sql`
        SELECT sync_id, name, type, icon, color, budget_limit
        FROM categories
        WHERE username = ${cleanUser}
        ORDER BY name ASC;
      `;

      const transactions = await sql`
        SELECT sync_id, amount, type, payment_mode, category_name, date, note, receipt_base64, created_at
        FROM transactions
        WHERE username = ${cleanUser}
        ORDER BY date DESC, created_at DESC;
      `;

      const bills = await sql`
        SELECT sync_id, title, amount, due_day, category_name, payment_mode, last_paid_month, auto_remind
        FROM bills
        WHERE username = ${cleanUser}
        ORDER BY due_day ASC;
      `;

      const goals = await sql`
        SELECT sync_id, title, target_amount, current_amount, target_date, color
        FROM goals
        WHERE username = ${cleanUser}
        ORDER BY target_date ASC;
      `;

      const debts = await sql`
        SELECT sync_id, person_name, amount, type, date, due_date, status, note
        FROM debts
        WHERE username = ${cleanUser}
        ORDER BY date DESC;
      `;

      res.status(200).json({
        success: true,
        timestamp: nowIso,
        pull: {
          categories,
          transactions,
          bills,
          goals,
          debts,
        },
      });
      return;
    } catch (err: any) {
      console.error('Neon sync error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Sync failed on server.',
      });
      return;
    }
  }

  res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
