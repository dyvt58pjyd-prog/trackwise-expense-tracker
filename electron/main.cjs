const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

let mainWindow;

const DEFAULT_NEON_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_9mo7esCPuTLg@ep-aged-field-befka0w6-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 650,
    title: 'TrackWise Finance - Offline Personal Finance Tracker',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle opening external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// macOS Application Menu
function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: 'About TrackWise Finance' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Hide TrackWise' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit', label: 'Quit TrackWise' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Quick Add Transaction',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('trigger-quick-add');
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for desktop save dialogs
ipcMain.handle('show-save-dialog', async (event, options) => {
  if (!mainWindow) return null;
  return await dialog.showSaveDialog(mainWindow, options);
});

// IPC handler: Test connection to Neon Serverless Postgres directly
ipcMain.handle('neon-test', async (event, connStr) => {
  try {
    const url = connStr && connStr.trim() ? connStr.trim() : DEFAULT_NEON_DATABASE_URL;
    const sql = neon(url);
    const res = await sql`SELECT 1 as connected, current_database() as db`;
    return {
      success: true,
      connected: Boolean(res?.[0]?.connected),
      engine: 'Neon Serverless PostgreSQL (Direct Desktop Driver)',
      database: res?.[0]?.db,
    };
  } catch (err) {
    return { success: false, connected: false, error: err.message };
  }
});

// IPC handler: Full 2-way sync with Neon Serverless Postgres
ipcMain.handle('neon-sync', async (event, { username, push, lastSyncedAt, connectionString }) => {
  try {
    const url = connectionString && connectionString.trim() ? connectionString.trim() : DEFAULT_NEON_DATABASE_URL;
    const sql = neon(url);
    const cleanUser = username.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    // 1. PUSH Categories
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

    // 2. PUSH Transactions
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

    // 3. PUSH Bills
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

    // 4. PUSH Goals
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

    // 5. PUSH Debts
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

    // 6. PULL: Retrieve latest records for this user from Neon
    const [categories, transactions, bills, goals, debts] = await Promise.all([
      sql`SELECT sync_id, name, type, icon, color, budget_limit, updated_at FROM categories WHERE username = ${cleanUser}`,
      sql`SELECT sync_id, amount, type, payment_mode, category_name, date, note, receipt_base64, created_at, updated_at FROM transactions WHERE username = ${cleanUser} ORDER BY date DESC, created_at DESC`,
      sql`SELECT sync_id, title, amount, due_day, category_name, payment_mode, last_paid_month, auto_remind, updated_at FROM bills WHERE username = ${cleanUser}`,
      sql`SELECT sync_id, title, target_amount, current_amount, target_date, color, updated_at FROM goals WHERE username = ${cleanUser}`,
      sql`SELECT sync_id, person_name, amount, type, date, due_date, status, note, updated_at FROM debts WHERE username = ${cleanUser}`,
    ]);

    return {
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
  } catch (err) {
    console.error('Electron Neon sync error:', err);
    return { success: false, error: err.message || 'Neon sync failed' };
  }
});
