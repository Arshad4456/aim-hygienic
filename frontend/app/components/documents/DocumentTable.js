"use client";

export default function DocumentTable({ items = [], templateConfig = {} }) {
  const style = templateConfig.styleConfig || {};
  const tableStyle = style.tableStyle || "bordered";
  const isMinimal = tableStyle === "minimal";

  return (
    <table className={`w-full mt-4 text-sm ${isMinimal ? "" : "border"}`}>
      <thead className="bg-zinc-50">
        <tr>
          {"# Product Qty Rate Amount".split(" ").map((h) => (
            <th key={h} className={`px-3 py-2 text-left ${isMinimal ? "border-b" : "border"}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.length ? items.map((item, idx) => (
          <tr key={`${item.productName}-${idx}`}>
            <td className={`px-3 py-2 ${isMinimal ? "border-b" : "border"}`}>{idx + 1}</td>
            <td className={`px-3 py-2 ${isMinimal ? "border-b" : "border"}`}>{item.productName || "-"}</td>
            <td className={`px-3 py-2 ${isMinimal ? "border-b" : "border"}`}>{Number(item.quantity || 0).toLocaleString()}</td>
            <td className={`px-3 py-2 ${isMinimal ? "border-b" : "border"}`}>{Number(item.unitPrice || 0).toFixed(2)}</td>
            <td className={`px-3 py-2 ${isMinimal ? "border-b" : "border"}`}>{Number(item.amount || 0).toFixed(2)}</td>
          </tr>
        )) : <tr><td colSpan={5} className="px-3 py-4 text-center text-zinc-500">No line items available.</td></tr>}
      </tbody>
    </table>
  );
}