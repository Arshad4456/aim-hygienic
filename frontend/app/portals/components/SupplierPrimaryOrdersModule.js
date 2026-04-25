"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

const MAX_PROXY_UPLOAD_BYTES = 6 * 1024 * 1024;

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    image.src = objectUrl;
  });
}

function canvasToFile(canvas, { fileName, contentType, quality }) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to process image"));
          return;
        }
        resolve(new File([blob], fileName, { type: contentType }));
      },
      contentType,
      quality,
    );
  });
}

async function optimizePodImage(file) {
  if (!file || !String(file.type || "").startsWith("image/")) return file;

  const { width, height, cleanup } = await readImageDimensions(file);
  try {
    const maxDimension = 1600;
    const longestSide = Math.max(width, height);
    const shouldResize = longestSide > maxDimension;
    const shouldCompress = file.size > MAX_PROXY_UPLOAD_BYTES;
    if (!shouldResize && !shouldCompress) return file;

    const ratio = shouldResize ? maxDimension / longestSide : 1;
    const targetWidth = Math.max(1, Math.round(width * ratio));
    const targetHeight = Math.max(1, Math.round(height * ratio));

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    return canvasToFile(canvas, {
      fileName: file.name || `supplier-pod-${Date.now()}.jpg`,
      contentType: "image/jpeg",
      quality: 0.78,
    });
  } finally {
    cleanup();
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatCurrency(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function normalizeStatus(value) {
  return String(value || "PENDING")
    .trim()
    .toUpperCase();
}

function totalItems(transaction) {
  return Array.isArray(transaction?.items)
    ? transaction.items.reduce(
        (sum, item) => sum + Number(item?.quantity || item?.totalPacks || 0),
        0,
      )
    : 0;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapReceiptsByInvoice(rows = []) {
  return rows.reduce((acc, item) => {
    const key = String(item?.linkedInvoiceNo || "").trim();
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function getInvoiceKey(order) {
  return order?.transactionCode || order?._id || "";
}

function sumReceiptAmount(rows = []) {
  return rows.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

function sumApprovedReceiptAmount(rows = []) {
  return rows
    .filter((item) => String(item?.status || "").toLowerCase() === "approved")
    .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

function printHtml(html, title = "Document") {
  const popup = window.open("", "_blank", "width=980,height=720");
  if (!popup) {
    window.alert(`Please allow popups to open ${title}.`);
    return;
  }
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}

function printPrimaryInvoice(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemRows = items
    .map((item, index) => {
      const qty = Number(item?.totalPacks || item?.quantity || 0);
      const rate = Number(item?.onePackPrice || item?.unitPrice || 0);
      const lineTotal = Number(item?.totalPrice || qty * rate || 0);
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item?.productName || "-")}</td>
        <td>${qty}</td>
        <td>${rate.toFixed(2)}</td>
        <td>${lineTotal.toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const html = `
    <html>
      <body style="font-family:Arial,sans-serif;padding:16px;color:#111;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#0f766e,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div>
            <div>
              <div style="font-weight:700;font-size:20px;">AIM Hygienic (Pvt) Limited</div>
              <div style="font-size:12px;color:#555;">Supplier Primary Order Invoice</div>
            </div>
          </div>
          <div style="font-size:12px;text-align:right;">
            <div><b>Invoice #:</b> ${escapeHtml(getInvoiceKey(order) || "-")}</div>
            <div><b>Status:</b> ${escapeHtml(normalizeStatus(order?.requestStatus))}</div>
            <div><b>Date:</b> ${escapeHtml(formatDate(order?.transactionAt || order?.createdAt))}</div>
          </div>
        </div>

        <div style="margin-top:14px;font-size:12px;line-height:1.7;">
          <div><b>Supplier:</b> ${escapeHtml(order?.supplierName || "-")}</div>
          <div><b>Requested By:</b> ${escapeHtml(order?.fromEntityName || "-")}</div>
          <div><b>Dispatch Warehouse:</b> ${escapeHtml(order?.dispatchFromWarehouseName || order?.warehouseName || "-")}</div>
          <div><b>Region / Zone / Territory:</b> ${escapeHtml(order?.regionName || "-")} / ${escapeHtml(order?.zoneName || "-")} / ${escapeHtml(order?.territory || order?.territoryName || "-")}</div>
        </div>

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
          <tbody>
            ${itemRows || '<tr><td colspan="5">No items found</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top:14px;display:flex;justify-content:flex-end;">
          <div style="min-width:280px;font-size:12px;line-height:1.8;">
            <div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><strong>${Number(order?.subtotal || 0).toFixed(2)}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>Expense:</span><strong>${Number(order?.expense || 0).toFixed(2)}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>Grand Total:</span><strong>${Number(order?.grandTotal || order?.subtotal || 0).toFixed(2)}</strong></div>
          </div>
        </div>

        <div style="margin-top:18px;text-align:center;font-size:12px;color:#444;">System-generated invoice for supplier primary order workflow.</div>
      </body>
    </html>`;

  printHtml(html, "invoice");
}

function printReceiptSummary(order, receipts = []) {
  const rows = receipts
    .map(
      (receipt, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(receipt?.receiptNo || "-")}</td>
        <td>${escapeHtml(receipt?.payerName || "-")}</td>
        <td>${escapeHtml(receipt?.paymentMethod || "-")}</td>
        <td>${Number(receipt?.amount || 0).toFixed(2)}</td>
        <td>${escapeHtml(receipt?.status || "-")}</td>
        <td>${escapeHtml(formatDate(receipt?.paymentDate))}</td>
      </tr>
    `,
    )
    .join("");

  const html = `
    <html>
      <body style="font-family:Arial,sans-serif;padding:16px;color:#111;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#1d4ed8,#0f766e);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div>
            <div>
              <div style="font-weight:700;font-size:20px;">AIM Hygienic (Pvt) Limited</div>
              <div style="font-size:12px;color:#555;">Supplier Receipt Summary</div>
            </div>
          </div>
          <div style="font-size:12px;text-align:right;">
            <div><b>Primary Order #:</b> ${escapeHtml(getInvoiceKey(order) || "-")}</div>
            <div><b>Supplier:</b> ${escapeHtml(order?.supplierName || "-")}</div>
            <div><b>Printed:</b> ${escapeHtml(new Date().toLocaleString())}</div>
          </div>
        </div>

        <div style="margin-top:14px;font-size:12px;line-height:1.7;">
          <div><b>Requested By:</b> ${escapeHtml(order?.fromEntityName || "-")}</div>
          <div><b>Dispatch Warehouse:</b> ${escapeHtml(order?.dispatchFromWarehouseName || order?.warehouseName || "-")}</div>
          <div><b>POD Status:</b> ${escapeHtml(order?.podUrl ? "Uploaded" : "Pending")}</div>
          <div><b>Total Order Amount:</b> ${Number(order?.grandTotal || order?.subtotal || 0).toFixed(2)}</div>
        </div>

        <div style="margin-top:12px;display:flex;gap:20px;font-size:12px;">
          <div><b>Linked Receipts:</b> ${receipts.length}</div>
          <div><b>Approved Amount:</b> ${sumApprovedReceiptAmount(receipts).toFixed(2)}</div>
          <div><b>Total Receipt Amount:</b> ${sumReceiptAmount(receipts).toFixed(2)}</div>
        </div>

        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:14px;font-size:12px;">
          <thead>
            <tr>
              <th>#</th>
              <th>Receipt #</th>
              <th>Payer</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7">No linked receipts found for this primary order.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top:18px;text-align:center;font-size:12px;color:#444;">Receipt view generated from the primary-order supplier workspace.</div>
      </body>
    </html>`;

  printHtml(html, "receipt summary");
}

export default function SupplierPrimaryOrdersModule() {
  const [orders, setOrders] = useState([]);
  const [receiptMap, setReceiptMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingFor, setUploadingFor] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.transactionAt || b.createdAt || 0).getTime() -
          new Date(a.transactionAt || a.createdAt || 0).getTime(),
      ),
    [orders],
  );

  const selectedOrder = useMemo(
    () =>
      sortedOrders.find(
        (item) => String(item?._id || "") === String(selectedOrderId || ""),
      ) || null,
    [selectedOrderId, sortedOrders],
  );

  const loadLinkedReceipts = useCallback(async (transactions = []) => {
    const invoiceNos = Array.from(
      new Set(
        (transactions || []).map((item) => getInvoiceKey(item)).filter(Boolean),
      ),
    );
    if (!invoiceNos.length) {
      setReceiptMap({});
      return;
    }

    setReceiptsLoading(true);
    try {
      const query = new URLSearchParams();
      query.set("linkedInvoiceNo", invoiceNos.join(","));
      const response = await apiFetch(`/receipts?${query.toString()}`);
      setReceiptMap(mapReceiptsByInvoice(response?.receipts || []));
    } catch (_error) {
      setReceiptMap({});
    } finally {
      setReceiptsLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(
        "/inventory/transactions/supplier/primary",
      );
      const rows = response?.transactions || [];
      setOrders(rows);
      await loadLinkedReceipts(rows);
    } catch (e) {
      setError(e.message || "Failed to load primary orders");
    } finally {
      setLoading(false);
    }
  }, [loadLinkedReceipts]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function uploadPod(transactionId, file) {
    if (!file) return;
    setUploadingFor(transactionId);
    setError("");
    try {
      const uploadFile = await optimizePodImage(file);
      const presigned = await apiFetch("/uploads/transaction-pod-url", {
        method: "POST",
        body: { transactionId, contentType: uploadFile.type || "image/jpeg" },
      });

      let objectKey = presigned.objectKey;
      let publicUrl = presigned.publicUrl;

      try {
        const uploadHost = new URL(presigned.uploadUrl).hostname.toLowerCase();
        if (!uploadHost.endsWith(".r2.cloudflarestorage.com")) {
          throw new Error("Invalid upload endpoint returned by server");
        }

        const putRes = await fetch(presigned.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": uploadFile.type || "image/jpeg" },
          body: uploadFile,
        });
        if (!putRes.ok) {
          throw new Error(`Cloud upload failed (${putRes.status})`);
        }
      } catch (_directUploadError) {
        if (uploadFile.size > MAX_PROXY_UPLOAD_BYTES) {
          throw new Error(
            "Image is too large to upload. Please retake the photo from closer distance.",
          );
        }
        const fileBase64 = await fileToBase64(uploadFile);
        const proxyRes = await apiFetch("/uploads/transaction-pod-proxy", {
          method: "POST",
          body: {
            transactionId,
            contentType: uploadFile.type || "image/jpeg",
            fileBase64,
          },
        });
        objectKey = proxyRes.objectKey;
        publicUrl = proxyRes.publicUrl;
      }

      await apiFetch(`/inventory/transactions/${transactionId}/pod`, {
        method: "POST",
        body: { objectKey, publicUrl },
      });

      await loadOrders();
      setSelectedOrderId(transactionId);
    } catch (e) {
      setError(e.message || "Failed to upload POD");
    } finally {
      setUploadingFor("");
    }
  }

  const assignedOrderCount = sortedOrders.length;
  const podUploadedCount = sortedOrders.filter(
    (item) => item.podUrl || item.proofOfDeliveryImageUrl,
  ).length;
  const pendingPodCount = sortedOrders.filter(
    (item) => !item.podUrl && !item.proofOfDeliveryImageUrl,
  ).length;
  const totalQuantity = sortedOrders.reduce(
    (sum, item) => sum + totalItems(item),
    0,
  );
  const totalReceiptCount = Object.values(receiptMap).reduce(
    (sum, rows) => sum + rows.length,
    0,
  );
  const approvedReceiptAmount = Object.values(receiptMap).reduce(
    (sum, rows) => sum + sumApprovedReceiptAmount(rows),
    0,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xl font-semibold text-zinc-900">
              Primary Orders from Company Admin
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              View assigned primary orders, upload proof of delivery, and open
              invoice plus receipt view for every supplier order from the same
              workspace.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <StatCard label="Assigned Orders" value={assignedOrderCount} />
            <StatCard label="POD Uploaded" value={podUploadedCount} />
            <StatCard label="Pending POD" value={pendingPodCount} />
            <StatCard label="Total Qty" value={totalQuantity} />
            <StatCard label="Linked Receipts" value={totalReceiptCount} />
            <StatCard
              label="Approved Receipt Amount"
              value={approvedReceiptAmount}
              isCurrency
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="text-lg font-semibold text-zinc-900">
            Assigned primary order ledger
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Supplier can open each order, view invoice, check linked receipts,
            and upload POD from this ledger.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1380px] w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="border-b px-4 py-3 text-left font-medium">
                  Order
                </th>
                <th className="border-b px-4 py-3 text-left font-medium">
                  Requested By
                </th>
                <th className="border-b px-4 py-3 text-left font-medium">
                  Dispatch From
                </th>
                <th className="border-b px-4 py-3 text-left font-medium">
                  Amount
                </th>
                <th className="border-b px-4 py-3 text-left font-medium">
                  Status
                </th>
                <th className="border-b px-4 py-3 text-left font-medium">
                  POD
                </th>
                <th className="border-b px-4 py-3 text-left font-medium">
                  Receipts
                </th>
                <th className="border-b px-4 py-3 text-left font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => {
                const status = normalizeStatus(order.requestStatus);
                const hasPod = Boolean(
                  order.podUrl || order.proofOfDeliveryImageUrl,
                );
                const canUpload = ["APPROVED", "DISPATCHED"].includes(status);
                const imageUrl = order.podUrl || order.proofOfDeliveryImageUrl;
                const receipts = receiptMap[getInvoiceKey(order)] || [];
                const approvedAmount = sumApprovedReceiptAmount(receipts);
                return (
                  <tr key={order._id} className="hover:bg-zinc-50">
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-semibold text-zinc-900">
                        {order.transactionCode || "-"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {formatDateTime(order.transactionAt || order.createdAt)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Items:{" "}
                        {Array.isArray(order.items) ? order.items.length : 0} •
                        Qty: {totalItems(order)}
                      </div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-medium text-zinc-800">
                        {order.fromEntityName || "-"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Source:{" "}
                        {order.requestSourceRole || order.fromEntityType || "-"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Territory:{" "}
                        {order.territory || order.territoryName || "-"}
                      </div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-medium text-zinc-800">
                        {order.dispatchFromWarehouseName ||
                          order.warehouseName ||
                          "-"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Warehouse ID:{" "}
                        {order.dispatchFromWarehouseId ||
                          order.warehouseId ||
                          "-"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {order.regionName || "-"} / {order.zoneName || "-"}
                      </div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-semibold text-zinc-900">
                        {formatCurrency(
                          order.grandTotal ||
                            order.totalAmount ||
                            order.subtotal ||
                            0,
                        )}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Subtotal: {formatCurrency(order.subtotal || 0)}
                      </div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status === "DELIVERED" ? "bg-emerald-100 text-emerald-700" : status === "DISPATCHED" ? "bg-blue-100 text-blue-700" : status === "APPROVED" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-700"}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      {hasPod ? (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-emerald-700">
                            Uploaded
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formatDateTime(
                              order.podUploadedAt || order.proofOfDeliveryAt,
                            )}
                          </div>
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-xs font-medium text-blue-600 underline"
                          >
                            Open POD image
                          </a>
                        </div>
                      ) : canUpload ? (
                        <div className="text-xs text-amber-700">
                          Waiting for supplier POD upload.
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500">
                          POD can be uploaded after admin approval.
                        </div>
                      )}
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-semibold text-zinc-900">
                        {receiptsLoading ? "..." : receipts.length}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Approved: {formatCurrency(approvedAmount)}
                      </div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          onClick={() => setSelectedOrderId(order._id)}
                        >
                          Open
                        </button>
                        {hasPod ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            Completed
                          </span>
                        ) : canUpload ? (
                          <label className="inline-flex cursor-pointer rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm">
                            {uploadingFor === order._id
                              ? "Uploading..."
                              : "Upload POD"}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              disabled={uploadingFor === order._id}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                uploadPod(order._id, file);
                              }}
                            />
                          </label>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!sortedOrders.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-zinc-500"
                  >
                    {loading
                      ? "Loading supplier primary orders..."
                      : "No assigned primary orders found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder ? (
        <OrderWorkspaceModal
          order={selectedOrder}
          receipts={receiptMap[getInvoiceKey(selectedOrder)] || []}
          receiptsLoading={receiptsLoading}
          uploadingFor={uploadingFor}
          onClose={() => setSelectedOrderId("")}
          onPrintInvoice={() => printPrimaryInvoice(selectedOrder)}
          onPrintReceipt={() =>
            printReceiptSummary(
              selectedOrder,
              receiptMap[getInvoiceKey(selectedOrder)] || [],
            )
          }
          onUploadPod={uploadPod}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value, isCurrency = false }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-blue-50 px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900">
        {isCurrency
          ? formatCurrency(value)
          : Number(value || 0).toLocaleString()}
      </div>
    </div>
  );
}

function OrderWorkspaceModal({
  order,
  receipts,
  receiptsLoading,
  uploadingFor,
  onClose,
  onPrintInvoice,
  onPrintReceipt,
  onUploadPod,
}) {
  const status = normalizeStatus(order?.requestStatus);
  const hasPod = Boolean(order?.podUrl || order?.proofOfDeliveryImageUrl);
  const canUpload = ["APPROVED", "DISPATCHED"].includes(status);
  const approvedReceiptAmount = sumApprovedReceiptAmount(receipts);
  const totalReceiptAmount = sumReceiptAmount(receipts);
  const podUrl = order?.podUrl || order?.proofOfDeliveryImageUrl || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-gradient-to-r from-slate-900 via-blue-900 to-teal-700 px-6 py-5 text-white">
          <div>
            <div className="text-2xl font-semibold">
              Supplier Primary Order Workspace
            </div>
            <div className="mt-1 text-sm text-white/80">
              Invoice, receipt, item details, and POD are managed here for{" "}
              {order?.transactionCode || "this order"}.
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <MiniCard
              label="Order Status"
              value={status}
              tone={
                status === "DELIVERED"
                  ? "green"
                  : status === "DISPATCHED"
                    ? "blue"
                    : "amber"
              }
            />
            <MiniCard
              label="Grand Total"
              value={formatCurrency(order?.grandTotal || order?.subtotal || 0)}
            />
            <MiniCard label="Linked Receipts" value={String(receipts.length)} />
            <MiniCard
              label="Approved Receipts"
              value={formatCurrency(approvedReceiptAmount)}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">
                    Order Invoice & Summary
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Supplier can review invoice data before or after POD upload.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onPrintInvoice}
                    className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Print Invoice
                  </button>
                  <button
                    type="button"
                    onClick={onPrintReceipt}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Print Receipt View
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <InfoBox
                  label="Primary Order #"
                  value={order?.transactionCode || "-"}
                />
                <InfoBox label="Supplier" value={order?.supplierName || "-"} />
                <InfoBox
                  label="Requested By"
                  value={order?.fromEntityName || "-"}
                />
                <InfoBox
                  label="Dispatch Warehouse"
                  value={
                    order?.dispatchFromWarehouseName ||
                    order?.warehouseName ||
                    "-"
                  }
                />
                <InfoBox
                  label="Region / Zone"
                  value={`${order?.regionName || "-"} / ${order?.zoneName || "-"}`}
                />
                <InfoBox
                  label="Territory"
                  value={order?.territory || order?.territoryName || "-"}
                />
                <InfoBox
                  label="Transaction Date"
                  value={formatDateTime(
                    order?.transactionAt || order?.createdAt,
                  )}
                />
                <InfoBox
                  label="Items"
                  value={`${Array.isArray(order?.items) ? order.items.length : 0} lines / ${totalItems(order)} qty`}
                />
                <InfoBox
                  label="POD Status"
                  value={
                    hasPod
                      ? `Uploaded on ${formatDateTime(order?.podUploadedAt || order?.proofOfDeliveryAt)}`
                      : canUpload
                        ? "Ready for upload"
                        : "Waiting for approval"
                  }
                />
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="border-b px-3 py-2 text-left">#</th>
                      <th className="border-b px-3 py-2 text-left">Product</th>
                      <th className="border-b px-3 py-2 text-left">Qty</th>
                      <th className="border-b px-3 py-2 text-left">Rate</th>
                      <th className="border-b px-3 py-2 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order?.items || []).length ? (
                      (order.items || []).map((item, index) => {
                        const qty = Number(
                          item?.totalPacks || item?.quantity || 0,
                        );
                        const rate = Number(
                          item?.onePackPrice || item?.unitPrice || 0,
                        );
                        return (
                          <tr
                            key={`${item?.productId || item?.productName || "item"}-${index}`}
                          >
                            <td className="border-b px-3 py-2">{index + 1}</td>
                            <td className="border-b px-3 py-2 font-medium text-zinc-900">
                              {item?.productName || "-"}
                            </td>
                            <td className="border-b px-3 py-2">{qty}</td>
                            <td className="border-b px-3 py-2">
                              {formatCurrency(rate)}
                            </td>
                            <td className="border-b px-3 py-2">
                              {formatCurrency(item?.totalPrice || qty * rate)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-zinc-500"
                        >
                          No item lines found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="text-lg font-semibold text-zinc-900">
                  Linked Receipt View
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  These receipts are fetched only for invoices tied to this
                  supplier’s assigned primary orders.
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MiniCard
                    label="Total Receipts"
                    value={String(receipts.length)}
                  />
                  <MiniCard
                    label="Approved Amount"
                    value={formatCurrency(approvedReceiptAmount)}
                  />
                  <MiniCard
                    label="Total Receipt Amount"
                    value={formatCurrency(totalReceiptAmount)}
                  />
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200">
                  <table className="min-w-[620px] w-full text-sm">
                    <thead className="bg-zinc-50 text-zinc-600">
                      <tr>
                        <th className="border-b px-3 py-2 text-left">
                          Receipt #
                        </th>
                        <th className="border-b px-3 py-2 text-left">Payer</th>
                        <th className="border-b px-3 py-2 text-left">Amount</th>
                        <th className="border-b px-3 py-2 text-left">Status</th>
                        <th className="border-b px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptsLoading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-zinc-500"
                          >
                            Loading receipts...
                          </td>
                        </tr>
                      ) : receipts.length ? (
                        receipts.map((receipt) => (
                          <tr key={receipt?._id || receipt?.receiptNo}>
                            <td className="border-b px-3 py-2 font-medium text-zinc-900">
                              {receipt?.receiptNo || "-"}
                            </td>
                            <td className="border-b px-3 py-2">
                              <div>{receipt?.payerName || "-"}</div>
                              <div className="text-xs text-zinc-500">
                                {receipt?.paymentMethod || "-"} •{" "}
                                {formatDate(receipt?.paymentDate)}
                              </div>
                            </td>
                            <td className="border-b px-3 py-2">
                              {formatCurrency(receipt?.amount || 0)}
                            </td>
                            <td className="border-b px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${String(receipt?.status || "").toLowerCase() === "approved" ? "bg-emerald-100 text-emerald-700" : String(receipt?.status || "").toLowerCase() === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}
                              >
                                {String(
                                  receipt?.status || "pending",
                                ).toUpperCase()}
                              </span>
                            </td>
                            <td className="border-b px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                {receipt?.attachmentUrl ? (
                                  <a
                                    href={receipt.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                                  >
                                    Open Proof
                                  </a>
                                ) : (
                                  <span className="text-xs text-zinc-400">
                                    No proof
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-zinc-500"
                          >
                            No linked receipts found for this primary order yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-zinc-900">
                      Proof of Delivery
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      Upload POD here, then company admin can continue dispatch
                      and delivered status flow.
                    </div>
                  </div>
                  {podUrl ? (
                    <a
                      href={podUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Open POD
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
                  {hasPod ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-emerald-700">
                        POD already uploaded
                      </div>
                      <div className="text-sm text-zinc-600">
                        Uploaded at:{" "}
                        {formatDateTime(
                          order?.podUploadedAt || order?.proofOfDeliveryAt,
                        )}
                      </div>
                    </div>
                  ) : canUpload ? (
                    <div className="space-y-3">
                      <div className="text-sm text-zinc-600">
                        Upload a clear delivery proof image from camera or
                        gallery.
                      </div>
                      <label className="inline-flex cursor-pointer rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                        {uploadingFor === order?._id
                          ? "Uploading POD..."
                          : "Choose POD Image"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={uploadingFor === order?._id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            onUploadPod(order?._id, file);
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">
                      POD upload becomes available after company admin approves
                      the primary order.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, tone = "zinc" }) {
  const toneClass =
    tone === "green"
      ? "from-emerald-50 to-white border-emerald-200"
      : tone === "blue"
        ? "from-blue-50 to-white border-blue-200"
        : tone === "amber"
          ? "from-amber-50 to-white border-amber-200"
          : "from-zinc-50 to-white border-zinc-200";
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${toneClass} px-4 py-3`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-zinc-900">
        {value || "-"}
      </div>
    </div>
  );
}
