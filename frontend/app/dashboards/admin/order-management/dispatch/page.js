"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function OrderDispatchPage() {
  const [orders, setOrders] = useState([]);
  const [trackingById, setTrackingById] = useState({});
  const [vehicleById, setVehicleById] = useState({});
  const [driverById, setDriverById] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [err, setErr] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    async function loadDispatch() {
      setErr("");
      try {
        const [dispatchData, vehiclesData, usersData] = await Promise.all([
          apiFetch("/orders/dispatch"),
          apiFetch("/vehicles"),
          apiFetch("/users"),
        ]);
        const dispatchOrders = dispatchData.orders || [];
        const vehicleList = vehiclesData.vehicles || [];
        const userList = usersData.users || [];
        setOrders(dispatchOrders);
        setVehicles(vehicleList);
        setDrivers(
          userList.filter((user) => {
            const role = user.role ? user.role.toLowerCase() : "";
            return role.includes("delivery") || role.includes("driver");
          })
        );
        setVehicleById(
          dispatchOrders.reduce((acc, order) => {
            acc[order._id] = order.dispatchVehicleId || "";
            return acc;
          }, {})
        );
        setDriverById(
          dispatchOrders.reduce((acc, order) => {
            acc[order._id] = order.dispatchDriverId || "";
            return acc;
          }, {})
        );
      } catch (e) {
        setErr(e.message || "Failed to load dispatch queue");
      }
    }
    loadDispatch();
  }, []);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      const payload = {
        status,
        dispatchTracking: trackingById[orderId] || undefined,
        dispatchVehicleId: vehicleById[orderId] || undefined,
        dispatchVehicleName: vehicles.find((vehicle) => vehicle._id === vehicleById[orderId])?.name || undefined,
        dispatchDriverId: driverById[orderId] || undefined,
        dispatchDriverName: drivers.find((driver) => driver._id === driverById[orderId])?.fullName || undefined,
      };
      const data = await apiFetch(`/orders/${orderId}/status`, { method: "PATCH", body: payload });
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? data.order : order))
      );
      setTrackingById((prev) => ({ ...prev, [orderId]: "" }));
    } catch (e) {
      setErr(e.message || "Failed to update order");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <AdminShell title="Pick & Dispatch" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Pick & Dispatch</div>
        <div className="text-sm text-zinc-500 mt-1">
          Allocate inventory, pick items, and dispatch deliveries with tracking.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 overflow-auto rounded-xl border">
          <table className="min-w-[1040px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Order No</th>
                <th className="text-left px-3 py-2 border-b">Customer</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-left px-3 py-2 border-b">Tracking</th>
                <th className="text-left px-3 py-2 border-b">Vehicle</th>
                <th className="text-left px-3 py-2 border-b">Driver</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{order.orderNo}</td>
                    <td className="px-3 py-2 border-b">{order.customerName}</td>
                    <td className="px-3 py-2 border-b capitalize">{order.status}</td>
                    <td className="px-3 py-2 border-b">
                      <input
                        className="w-full rounded-lg border px-2 py-1 text-xs"
                        placeholder={order.dispatchTracking || "Tracking ID"}
                        value={trackingById[order._id] || ""}
                        onChange={(event) =>
                          setTrackingById((prev) => ({ ...prev, [order._id]: event.target.value }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 border-b">
                      <select
                        className="w-full rounded-lg border px-2 py-1 text-xs"
                        value={vehicleById[order._id] || ""}
                        onChange={(event) =>
                          setVehicleById((prev) => ({ ...prev, [order._id]: event.target.value }))
                        }
                      >
                        <option value="">Select vehicle</option>
                        {vehicles.map((vehicle) => (
                          <option key={vehicle._id} value={vehicle._id}>
                            {vehicle.name || vehicle.vehicleId}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <select
                        className="w-full rounded-lg border px-2 py-1 text-xs"
                        value={driverById[order._id] || ""}
                        onChange={(event) =>
                          setDriverById((prev) => ({ ...prev, [order._id]: event.target.value }))
                        }
                      >
                        <option value="">Select driver</option>
                        {drivers.map((driver) => (
                          <option key={driver._id} value={driver._id}>
                            {driver.fullName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex flex-wrap gap-2">
                        {order.status === "approved" ? (
                          <button
                            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            onClick={() => updateStatus(order._id, "dispatched")}
                            disabled={updatingId === order._id}
                          >
                            Mark Dispatched
                          </button>
                        ) : (
                          <button
                            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            onClick={() => updateStatus(order._id, "completed")}
                            disabled={updatingId === order._id}
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                    No dispatch tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}