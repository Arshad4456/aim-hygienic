"use client";
import EntityWorkspacePage from "../../common/pages/EntityWorkspacePage";

export default function ProductsPortalPage() {
  return <EntityWorkspacePage
    title="Product Master"
    description="Central product catalog for purchase orders, GRN posting, company stock, primary sales, distributor stock, and secondary sales. Product IDs must remain consistent across all flows."
    endpoint="/products"
    recordsKeys={["products", "data", "items"]}
    columns={[
      { label: "Product", accessor: (row) => row.productName || row.name || row.title },
      { label: "SKU", accessor: (row) => row.sku || row.code || row.barcode },
      { label: "Category", accessor: (row) => row.category || row.productCategory || "General" },
      { label: "Price", accessor: (row) => row.salePrice || row.price || row.unitPrice || 0 },
      { label: "Status", accessor: (row) => row.status || "active", status: true },
    ]}
    kpis={[
      { label: "Active Products", value: (rows) => rows.filter((row) => String(row.status || "active").toLowerCase() === "active").length, help: "Products available for ERP documents" },
      { label: "SKU Coverage", value: (rows) => rows.filter((row) => row.sku || row.code || row.barcode).length, help: "Products with SKU/barcode/code" },
      { label: "Avg Price", value: (rows) => rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.salePrice || row.price || row.unitPrice || 0), 0) / rows.length) : 0, help: "Average configured selling price" },
    ]}
    workflows={[
      { title: "Procurement Uses Product Master", description: "Purchase order lines should use product dropdown, not free text, so GRN stock links to the correct product." },
      { title: "Inventory Uses Product ID", description: "Stock summary is calculated from ledger movements by product and warehouse/distributor owner." },
      { title: "Sales Uses Same Product", description: "Primary and secondary sales check available stock against the same Product Master record." },
    ]}
  />;
}
