import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";

export default function DocumentTable({ columns = [], rows = [], keyField = "_id", emptyTitle, emptyDescription }) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left font-medium text-zinc-600">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {rows.map((row) => (
              <tr key={row[keyField] || JSON.stringify(row)} className="hover:bg-zinc-50/80">
                {columns.map((column) => {
                  const value = typeof column.render === "function" ? column.render(row) : row[column.key];
                  return (
                    <td key={column.key} className="px-4 py-3 align-top text-zinc-700">
                      {column.type === "status" ? <StatusBadge value={String(value || "-")} tone={String(value || "default")} /> : value ?? "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
