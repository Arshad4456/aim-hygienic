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

function normalizeStatus(value) {
  return String(value || "PENDING").trim().toUpperCase();
}

function totalItems(transaction) {
  return Array.isArray(transaction?.items)
    ? transaction.items.reduce((sum, item) => sum + Number(item?.quantity || item?.totalPacks || 0), 0)
    : 0;
}

export default function SupplierPrimaryOrdersModule() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingFor, setUploadingFor] = useState("");

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.transactionAt || b.createdAt || 0).getTime() - new Date(a.transactionAt || a.createdAt || 0).getTime()),
    [orders],
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/inventory/transactions/supplier/primary");
      setOrders(response?.transactions || []);
    } catch (e) {
      setError(e.message || "Failed to load primary orders");
    } finally {
      setLoading(false);
    }
  }, []);

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
          throw new Error("Image is too large to upload. Please retake the photo from closer distance.");
        }
        const fileBase64 = await fileToBase64(uploadFile);
        const proxyRes = await apiFetch("/uploads/transaction-pod-proxy", {
          method: "POST",
          body: { transactionId, contentType: uploadFile.type || "image/jpeg", fileBase64 },
        });
        objectKey = proxyRes.objectKey;
        publicUrl = proxyRes.publicUrl;
      }

      await apiFetch(`/inventory/transactions/${transactionId}/pod`, {
        method: "POST",
        body: { objectKey, publicUrl },
      });

      await loadOrders();
    } catch (e) {
      setError(e.message || "Failed to upload POD");
    } finally {
      setUploadingFor("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Primary Orders from Company Admin</div>
            <div className="mt-1 text-sm text-zinc-500">
              View approved primary orders assigned to you, upload proof of delivery, and let company admin continue dispatch and delivered status from Order Management.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Assigned Orders" value={sortedOrders.length} />
            <StatCard label="POD Uploaded" value={sortedOrders.filter((item) => item.podUrl || item.proofOfDeliveryImageUrl).length} />
            <StatCard label="Pending POD" value={sortedOrders.filter((item) => !item.podUrl && !item.proofOfDeliveryImageUrl).length} />
            <StatCard label="Total Qty" value={sortedOrders.reduce((sum, item) => sum + totalItems(item), 0)} />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="text-lg font-semibold text-zinc-900">Assigned primary order ledger</div>
          <div className="mt-1 text-sm text-zinc-500">Only the supplier assigned by company admin can open and upload POD here.</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1220px] w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="border-b px-4 py-3 text-left font-medium">Order</th>
                <th className="border-b px-4 py-3 text-left font-medium">Requested By</th>
                <th className="border-b px-4 py-3 text-left font-medium">Dispatch From</th>
                <th className="border-b px-4 py-3 text-left font-medium">Region / Zone</th>
                <th className="border-b px-4 py-3 text-left font-medium">Amount</th>
                <th className="border-b px-4 py-3 text-left font-medium">Status</th>
                <th className="border-b px-4 py-3 text-left font-medium">POD</th>
                <th className="border-b px-4 py-3 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => {
                const status = normalizeStatus(order.requestStatus);
                const hasPod = Boolean(order.podUrl || order.proofOfDeliveryImageUrl);
                const canUpload = ["APPROVED", "DISPATCHED"].includes(status);
                const imageUrl = order.podUrl || order.proofOfDeliveryImageUrl;
                return (
                  <tr key={order._id} className="hover:bg-zinc-50">
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-semibold text-zinc-900">{order.transactionCode || "-"}</div>
                      <div className="mt-1 text-xs text-zinc-500">{formatDateTime(order.transactionAt || order.createdAt)}</div>
                      <div className="mt-1 text-xs text-zinc-500">Items: {Array.isArray(order.items) ? order.items.length : 0} • Qty: {totalItems(order)}</div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-medium text-zinc-800">{order.fromEntityName || "-"}</div>
                      <div className="mt-1 text-xs text-zinc-500">Source: {order.requestSourceRole || order.fromEntityType || "-"}</div>
                      <div className="mt-1 text-xs text-zinc-500">Territory: {order.territory || order.territoryName || "-"}</div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-medium text-zinc-800">{order.dispatchFromWarehouseName || order.warehouseName || "-"}</div>
                      <div className="mt-1 text-xs text-zinc-500">Warehouse ID: {order.dispatchFromWarehouseId || order.warehouseId || "-"}</div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div>{order.regionName || "-"}</div>
                      <div className="mt-1 text-xs text-zinc-500">{order.zoneName || "-"}</div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <div className="font-semibold text-zinc-900">{Number(order.grandTotal || order.totalAmount || order.subtotal || 0).toLocaleString()}</div>
                      <div className="mt-1 text-xs text-zinc-500">Subtotal: {Number(order.subtotal || 0).toLocaleString()}</div>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status === "DELIVERED" ? "bg-emerald-100 text-emerald-700" : status === "DISPATCHED" ? "bg-blue-100 text-blue-700" : status === "APPROVED" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-700"}`}>
                        {status}
                      </span>
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      {hasPod ? (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-emerald-700">Uploaded</div>
                          <div className="text-xs text-zinc-500">{formatDateTime(order.podUploadedAt || order.proofOfDeliveryAt)}</div>
                          <a href={imageUrl} target="_blank" rel="noreferrer" className="inline-flex text-xs font-medium text-blue-600 underline">
                            Open POD image
                          </a>
                        </div>
                      ) : canUpload ? (
                        <div className="text-xs text-amber-700">Waiting for supplier POD upload.</div>
                      ) : (
                        <div className="text-xs text-zinc-500">POD can be uploaded after admin approval.</div>
                      )}
                    </td>
                    <td className="border-b px-4 py-3 align-top">
                      {hasPod ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Completed</span>
                      ) : canUpload ? (
                        <label className="inline-flex cursor-pointer rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm">
                          {uploadingFor === order._id ? "Uploading..." : "Upload POD"}
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
                      ) : (
                        <span className="text-xs text-zinc-500">No action available</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!sortedOrders.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {loading ? "Loading supplier primary orders..." : "No assigned primary orders found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-blue-50 px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900">{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}
