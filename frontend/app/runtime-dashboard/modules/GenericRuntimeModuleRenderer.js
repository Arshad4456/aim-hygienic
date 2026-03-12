"use client";

export default function GenericRuntimeModuleRenderer({ moduleItem }) {
  return (
    <div className="space-y-4 rounded-xl border bg-white p-5">
      <h1 className="text-xl font-semibold">{moduleItem?.moduleName || "Runtime Module"}</h1>
      <p className="text-sm text-zinc-600">Code: {moduleItem?.moduleCode}</p>
      <p className="text-sm text-zinc-600">Type: {moduleItem?.moduleType || "default"}</p>
      <p className="text-sm text-zinc-600">Subtypes: {(moduleItem?.selectedSubtypes || []).join(", ") || "-"}</p>
      <p className="text-sm text-zinc-600">Sections: {(moduleItem?.selectedSections || []).join(", ") || "-"}</p>
      <p className="text-sm text-zinc-600">Allowed actions: {(moduleItem?.allowedActions || []).join(", ") || "-"}</p>
      <div>
        <div className="text-sm font-medium">Section permissions</div>
        {(moduleItem?.sectionPermissions || []).length === 0 ? (
          <div className="text-sm text-zinc-500 mt-1">No section permissions configured.</div>
        ) : (
          <ul className="mt-1 text-sm text-zinc-700 list-disc ml-4">
            {moduleItem.sectionPermissions.map((section) => (
              <li key={section.sectionCode}>
                {section.sectionCode}: {(section.allowedActions || []).join(", ") || "-"}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded border border-dashed p-3 text-xs text-zinc-500">
        This module renderer is not fully implemented yet.
      </div>
    </div>
  );
}
