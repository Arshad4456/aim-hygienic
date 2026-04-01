export const reportSections = [
  { key: 'overview', title: 'Executive pulse', caption: 'Revenue, recovery, risk, operations' },
  { key: 'sales', title: 'Sales reports', caption: 'Trend, customer, product, area' },
  { key: 'orders', title: 'Order reports', caption: 'Status, aging, dispatch, delivery' },
  { key: 'recovery', title: 'Recovery & payments', caption: 'Outstanding, receipts, due returns' },
  { key: 'inventory', title: 'Inventory & warehouse', caption: 'Stock risk, warehouse health' },
  { key: 'customers', title: 'Customer performance', caption: 'Active accounts, sales value' },
  { key: 'team', title: 'People & activity', caption: 'Users, coverage, productivity' },
  { key: 'delivery', title: 'Delivery & POD', caption: 'Completion, POD exceptions' },
  { key: 'expenses', title: 'Expense intelligence', caption: 'Spending, approvals, categories' },
  { key: 'areas', title: 'Area performance', caption: 'Region, zone, territory, field' },
  { key: 'vehicles', title: 'Vehicles & logistics', caption: 'Fleet, transfers, movements' },
  { key: 'exceptions', title: 'Critical watchlist', caption: 'Overdues, low stock, delays' },
];

export function reportHref(basePath, key) {
  return `${basePath}/${key}`;
}

export function formatTimestamp(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function downloadJson(filename, payload) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildPrintHtml({ title, subtitle, generatedAt, cards = [], rows = [], columns = [] }) {
  const cardsHtml = cards
    .map((card) => `
      <div class="card">
        <div class="label">${escapeHtml(card.label || '')}</div>
        <div class="value">${escapeHtml(String(card.value ?? '—'))}</div>
        <div class="helper">${escapeHtml(card.helper || '')}</div>
      </div>
    `)
    .join('');

  const headerCells = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const bodyRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? '—'))}</td>`).join('')}</tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
      h1 { margin: 0 0 8px; }
      p.meta { color: #6b7280; margin: 0 0 20px; }
      .cards { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-bottom: 20px; }
      .card { border: 1px solid #d1d5db; border-radius: 14px; padding: 14px; }
      .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; }
      .value { font-size: 26px; font-weight: 700; margin-top: 10px; }
      .helper { font-size: 12px; color: #6b7280; margin-top: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; }
      th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
      th { background: #f3f4f6; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${escapeHtml(subtitle || '')}<br/>Generated at: ${escapeHtml(formatTimestamp(generatedAt))}</p>
    <div class="cards">${cardsHtml}</div>
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}