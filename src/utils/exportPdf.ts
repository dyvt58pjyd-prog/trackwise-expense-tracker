import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Category } from '../types';
import { formatCurrency, formatMonthYear } from './formatters';
import { downloadFile } from './platform';

export function exportMonthlyPdfStatement(
  monthStr: string, // YYYY-MM
  userName: string,
  transactions: Transaction[],
  categories: Category[],
  currency = '₹'
) {
  const doc = new jsPDF();
  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id!, c]));

  // Calculate totals
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, number> = {};

  transactions.forEach((t) => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      const cat = categoryMap.get(t.categoryId);
      const catName = cat ? cat.name : 'Other';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0';

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('TrackWise Personal Finance', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Monthly Statement • ${formatMonthYear(monthStr)}`, 14, 28);
  doc.text(`Account Holder: ${userName}`, 140, 28);

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 44, 182, 26, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TOTAL INCOME', 22, 53);
  doc.text('TOTAL EXPENSE', 70, 53);
  doc.text('NET BALANCE', 118, 53);
  doc.text('SAVINGS RATE', 162, 53);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);

  // Income in green
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(totalIncome, currency), 22, 63);

  // Expense in red
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(totalExpense, currency), 70, 63);

  // Net Balance
  if (netBalance >= 0) {
    doc.setTextColor(15, 23, 42);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(formatCurrency(netBalance, currency), 118, 63);

  // Savings rate
  doc.setTextColor(59, 130, 246);
  doc.text(`${savingsRate}%`, 162, 63);

  // Top Categories Table
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let currentY = 78;

  if (sortedCategories.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Top Spending Categories', 14, currentY);

    const catRows = sortedCategories.map(([name, amt]) => {
      const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0';
      return [name, `${pct}%`, formatCurrency(amt, currency)];
    });

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Category', 'Share of Expense', 'Amount']],
      body: catRows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Transactions Ledger Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Transaction Ledger (${transactions.length} items)`, 14, currentY);

  const tableRows = transactions.map((t) => {
    const cat = categoryMap.get(t.categoryId);
    const amountStr = `${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount, currency)}`;
    return [
      t.date,
      cat ? cat.name : 'Unknown',
      t.paymentMode,
      t.note || '-',
      amountStr,
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Date', 'Category', 'Mode', 'Note', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 38 },
      2: { cellWidth: 28 },
      3: { cellWidth: 60 },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw);
        if (text.startsWith('+')) {
          data.cell.styles.textColor = [22, 163, 74];
        } else {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Footer on all pages
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by TrackWise Offline Personal Finance • Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  const pdfBlob = doc.output('blob');
  downloadFile(pdfBlob, `TrackWise_Statement_${monthStr}.pdf`);
}
