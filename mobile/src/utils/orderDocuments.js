function text(value) {
  return String(value || '').trim();
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getInvoiceKey(order) {
  return text(order?.orderNo || order?.invoiceNo || order?.transactionCode || order?._id);
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

export function mapReceiptsByInvoice(rows = []) {
  return rows.reduce((acc, item) => {
    const key = getInvoiceKey({ orderNo: item?.linkedInvoiceNo });
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function sumReceiptAmount(rows = []) {
  return rows.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

export function sumApprovedReceiptAmount(rows = []) {
  return rows
    .filter((item) => text(item?.status).toLowerCase() === 'approved')
    .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

function buildSecondaryItemRows(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return '<tr><td colspan="5">No items found</td></tr>';

  return items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item?.productName || item?.name || item?.productCode || '-')}</td>
        <td>${escapeHtml(item?.section || order?.saleType || 'secondary')}</td>
        <td>${Number(item?.quantity || item?.totalPacks || item?.qty || 0)}</td>
        <td>${Number(item?.unitPrice || item?.rate || 0).toFixed(2)}</td>
      </tr>
    `,
    )
    .join('');
}

function buildPrimaryItemRows(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return '<tr><td colspan="5">No items found</td></tr>';

  return items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item?.productName || item?.name || item?.productCode || '-')}</td>
        <td>${Number(item?.quantity || item?.totalPacks || item?.qty || 0)}</td>
        <td>${Number(item?.onePackPrice || item?.unitPrice || item?.rate || 0).toFixed(2)}</td>
        <td>${Number(item?.totalPrice || (Number(item?.quantity || item?.totalPacks || 0) * Number(item?.onePackPrice || item?.unitPrice || item?.rate || 0))).toFixed(2)}</td>
      </tr>
    `,
    )
    .join('');
}

function buildReceiptRows(receipts = []) {
  if (!receipts.length) return '<tr><td colspan="7">No linked receipts found</td></tr>';

  return receipts
    .map(
      (receipt, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(receipt?.receiptNo || '-')}</td>
        <td>${escapeHtml(receipt?.payerName || '-')}</td>
        <td>${escapeHtml(receipt?.paymentMethod || '-')}</td>
        <td>${Number(receipt?.amount || 0).toFixed(2)}</td>
        <td>${escapeHtml(receipt?.status || '-')}</td>
        <td>${escapeHtml(formatDate(receipt?.paymentDate))}</td>
      </tr>
    `,
    )
    .join('');
}

function baseDocumentShell({ title, subTitle, metaHtml, summaryHtml, itemRowsHtml, receiptRowsHtml, receipts = [] }) {
  return `
    <html>
      <body style="font-family:Arial,sans-serif;padding:16px;color:#111;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#0f766e,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">RE</div>
            <div>
              <div style="font-weight:700;font-size:20px;">Rawyan ERP</div>
              <div style="font-size:12px;color:#555;">${escapeHtml(subTitle)}</div>
            </div>
          </div>
          <div style="font-size:12px;text-align:right;">${metaHtml}</div>
        </div>

        <h2 style="margin-top:18px;font-size:18px;">${escapeHtml(title)}</h2>
        <div style="margin-top:12px;font-size:12px;line-height:1.7;">${summaryHtml}</div>

        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:14px;font-size:12px;">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Section</th>
              <th>Qty</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>${itemRowsHtml}</tbody>
        </table>

        <h3 style="margin-top:18px;font-size:15px;">Linked Receipts</h3>
        <div style="display:flex;gap:18px;font-size:12px;margin-bottom:8px;">
          <div><b>Receipt Count:</b> ${receipts.length}</div>
          <div><b>Approved Amount:</b> ${sumApprovedReceiptAmount(receipts).toFixed(2)}</div>
          <div><b>Total Receipt Amount:</b> ${sumReceiptAmount(receipts).toFixed(2)}</div>
        </div>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">
          <thead>
            <tr>
              <th>#</th>
              <th>Receipt No</th>
              <th>Payer</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${receiptRowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

export function buildSecondaryOrderDocumentHtml(order, receipts = []) {
  const metaHtml = `
    <div><b>Invoice #:</b> ${escapeHtml(getInvoiceKey(order) || '-')}</div>
    <div><b>Status:</b> ${escapeHtml(text(order?.status || 'pending').toUpperCase())}</div>
    <div><b>Date:</b> ${escapeHtml(formatDateTime(order?.createdAt))}</div>
  `;

  const summaryHtml = `
    <div><b>Source:</b> ${escapeHtml(order?.sourceType || '-')}</div>
    <div><b>From:</b> ${escapeHtml(order?.fromEntityName || order?.customerName || '-')}</div>
    <div><b>To:</b> ${escapeHtml(order?.toWarehouseName || order?.toEntityName || order?.distributorName || '-')}</div>
    <div><b>Address:</b> ${escapeHtml(order?.address || order?.deliveryAddress || '-')}</div>
    <div><b>Territory:</b> ${escapeHtml(order?.territoryName || order?.territory || order?.areaName || '-')}</div>
    <div><b>POD:</b> ${escapeHtml(order?.podUrl ? 'Uploaded' : 'Not Uploaded')}</div>
  `;

  return baseDocumentShell({
    title: 'Secondary Order Invoice / Receipt',
    subTitle: 'Mobile secondary order document',
    metaHtml,
    summaryHtml,
    itemRowsHtml: buildSecondaryItemRows(order),
    receiptRowsHtml: buildReceiptRows(receipts),
    receipts,
  });
}

export function buildPrimarySupplierDocumentHtml(order, receipts = []) {
  const metaHtml = `
    <div><b>Primary Order #:</b> ${escapeHtml(getInvoiceKey(order) || '-')}</div>
    <div><b>Status:</b> ${escapeHtml(text(order?.requestStatus || 'pending').toUpperCase())}</div>
    <div><b>Date:</b> ${escapeHtml(formatDateTime(order?.transactionAt || order?.createdAt))}</div>
  `;

  const summaryHtml = `
    <div><b>Supplier:</b> ${escapeHtml(order?.supplierName || '-')}</div>
    <div><b>Requested By:</b> ${escapeHtml(order?.fromEntityName || '-')}</div>
    <div><b>Dispatch Warehouse:</b> ${escapeHtml(order?.dispatchFromWarehouseName || order?.warehouseName || '-')}</div>
    <div><b>Region / Zone / Territory:</b> ${escapeHtml(order?.regionName || '-')} / ${escapeHtml(order?.zoneName || '-')} / ${escapeHtml(order?.territoryName || order?.territory || '-')}</div>
    <div><b>POD:</b> ${escapeHtml(order?.podUrl ? 'Uploaded' : 'Pending Upload')}</div>
  `;

  const itemRows = buildPrimaryItemRows(order).replaceAll('<th>Section</th>', '');
  return `
    <html>
      <body style="font-family:Arial,sans-serif;padding:16px;color:#111;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#0f766e,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">RE</div>
            <div>
              <div style="font-weight:700;font-size:20px;">Rawyan ERP</div>
              <div style="font-size:12px;color:#555;">Mobile supplier primary order document</div>
            </div>
          </div>
          <div style="font-size:12px;text-align:right;">${metaHtml}</div>
        </div>

        <h2 style="margin-top:18px;font-size:18px;">Supplier Primary Order Invoice / Receipt</h2>
        <div style="margin-top:12px;font-size:12px;line-height:1.7;">${summaryHtml}</div>

        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:14px;font-size:12px;">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${buildPrimaryItemRows(order)}</tbody>
        </table>

        <h3 style="margin-top:18px;font-size:15px;">Linked Receipts</h3>
        <div style="display:flex;gap:18px;font-size:12px;margin-bottom:8px;">
          <div><b>Receipt Count:</b> ${receipts.length}</div>
          <div><b>Approved Amount:</b> ${sumApprovedReceiptAmount(receipts).toFixed(2)}</div>
          <div><b>Total Receipt Amount:</b> ${sumReceiptAmount(receipts).toFixed(2)}</div>
        </div>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">
          <thead>
            <tr>
              <th>#</th>
              <th>Receipt No</th>
              <th>Payer</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${buildReceiptRows(receipts)}</tbody>
        </table>
      </body>
    </html>
  `;
}
