"use client";

import { useEffect, useMemo, useState } from "react";
import useAuth from "@/src/hooks/useAuth";
import { fetchSystemAdminOverview } from "@/src/services/systemAdminService";
import { fetchSettings, saveSettingsSection, uploadSettingsAsset } from "@/src/services/settingsService";

const SECTION_TABS = [
  ["companyProfile", "Company"],
  ["portal", "Portal"],
  ["documents", "Invoices & Receipts"],
  ["uploads", "Uploads"],
  ["security", "Security"],
  ["notifications", "Notifications"],
  ["integrations", "Integrations"],
];

function text(value) { return value ?? ""; }

function SectionCard({ eyebrow, title, description, children }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600">{eyebrow}</p>
    <h3 className="mt-2 text-2xl font-black text-slate-950">{title}</h3>
    {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    <div className="mt-5">{children}</div>
  </div>;
}

function TextField({ label, value, onChange, type = "text", placeholder = "", multiline = false }) {
  const cls = "mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50";
  return <label className="block">
    <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">{label}</span>
    {multiline ? <textarea value={text(value)} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className={cls} /> : <input type={type} value={text(value)} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />}
  </label>;
}

function SelectField({ label, value, onChange, options = [] }) {
  return <label className="block">
    <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">{label}</span>
    <select value={text(value)} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50">
      {options.map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}
    </select>
  </label>;
}

function ToggleField({ label, helper, checked, onChange }) {
  return <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <span>
      <span className="block text-sm font-black text-slate-950">{label}</span>
      {helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 accent-emerald-600" />
  </label>;
}

function SaveBar({ busy, message, error, onSave }) {
  return <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
    <button onClick={onSave} disabled={busy} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50">{busy ? "Saving…" : "Save Settings"}</button>
    {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
    {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p> : null}
  </div>;
}

function UploadAssetField({ label, helper, settings, setSettings, sectionKey, fieldKey, targetCompanyId, slot }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const value = settings?.[sectionKey]?.[fieldKey] || "";
  async function handleFile(file) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const result = await uploadSettingsAsset(file, { companyId: targetCompanyId || "system", slot, entityType: "company-document" });
      setSettings((prev) => ({ ...prev, [sectionKey]: { ...(prev?.[sectionKey] || {}), [fieldKey]: result.publicUrl || value } }));
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally { setBusy(false); }
  }
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-black text-slate-950">{label}</p>
    {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    {value ? <a href={value} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-bold text-emerald-700">{value}</a> : <p className="mt-2 text-xs text-slate-400">No file uploaded yet.</p>}
    <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile(e.target.files?.[0])} className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" />
    {busy ? <p className="mt-2 text-xs font-bold text-slate-500">Uploading to Cloudflare R2…</p> : null}
    {error ? <p className="mt-2 text-xs font-bold text-red-600">{error}</p> : null}
  </div>;
}

function CompanySettings({ settings, setSection, setSettings, targetCompanyId }) {
  const profile = settings.companyProfile || {};
  const set = (key, value) => setSection("companyProfile", { ...profile, [key]: value });
  return <SectionCard eyebrow="Company profile" title="Brand, contact, tax, and print identity" description="These values appear on client portal headers, invoices, receipts, delivery notes, and customer-facing documents.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TextField label="Display name" value={profile.displayName} onChange={(v) => set("displayName", v)} />
      <TextField label="Legal name" value={profile.legalName} onChange={(v) => set("legalName", v)} />
      <TextField label="Email" value={profile.email} onChange={(v) => set("email", v)} />
      <TextField label="Phone" value={profile.phone} onChange={(v) => set("phone", v)} />
      <TextField label="WhatsApp" value={profile.whatsapp} onChange={(v) => set("whatsapp", v)} />
      <TextField label="Website" value={profile.website} onChange={(v) => set("website", v)} />
      <TextField label="Tax / NTN / GST number" value={profile.taxNumber} onChange={(v) => set("taxNumber", v)} />
      <TextField label="Registration number" value={profile.registrationNumber} onChange={(v) => set("registrationNumber", v)} />
      <TextField label="City" value={profile.city} onChange={(v) => set("city", v)} />
      <TextField label="Country" value={profile.country} onChange={(v) => set("country", v)} />
      <div className="md:col-span-2"><TextField label="Address" value={profile.address} onChange={(v) => set("address", v)} multiline /></div>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <UploadAssetField label="Upload logo" helper="Used in portal and invoice/receipt print headers." settings={settings} setSettings={setSettings} sectionKey="companyProfile" fieldKey="logoUrl" targetCompanyId={targetCompanyId} slot="company-logo" />
      <UploadAssetField label="Upload stamp/signature" helper="Optional stamp on invoices, receipts, and delivery notes." settings={settings} setSettings={setSettings} sectionKey="companyProfile" fieldKey="stampUrl" targetCompanyId={targetCompanyId} slot="company-stamp" />
    </div>
  </SectionCard>;
}

function PortalSettings({ settings, setSection }) {
  const portal = settings.portal || {};
  const set = (key, value) => setSection("portal", { ...portal, [key]: value });
  return <SectionCard eyebrow="Portal setup" title="Portal, localization, mobile app, and fiscal defaults" description="These controls decide how the ERP opens for users and how business data appears across modules.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <TextField label="Default landing path" value={portal.defaultLandingPath} onChange={(v) => set("defaultLandingPath", v)} />
      <SelectField label="Primary color" value={portal.primaryColor} onChange={(v) => set("primaryColor", v)} options={["emerald", "blue", "cyan", "purple", "amber", "rose", "slate"]} />
      <SelectField label="Sidebar style" value={portal.sidebarStyle} onChange={(v) => set("sidebarStyle", v)} options={["dark", "light", "compact"]} />
      <SelectField label="Language" value={portal.defaultLanguage} onChange={(v) => set("defaultLanguage", v)} options={[{ value: "en", label: "English" }, { value: "ur", label: "Urdu" }]} />
      <TextField label="Timezone" value={portal.timezone} onChange={(v) => set("timezone", v)} />
      <TextField label="Currency" value={portal.currency} onChange={(v) => set("currency", v)} />
      <TextField label="Fiscal year start month" type="number" value={portal.fiscalYearStartMonth} onChange={(v) => set("fiscalYearStartMonth", v)} />
      <SelectField label="Date format" value={portal.dateFormat} onChange={(v) => set("dateFormat", v)} options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} />
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <ToggleField label="Enable mobile app" checked={portal.enableMobileApp} onChange={(v) => set("enableMobileApp", v)} />
      <ToggleField label="Enable customer portal" checked={portal.enableCustomerPortal} onChange={(v) => set("enableCustomerPortal", v)} />
      <ToggleField label="Enable supplier portal" checked={portal.enableSupplierPortal} onChange={(v) => set("enableSupplierPortal", v)} />
    </div>
  </SectionCard>;
}

function DocumentSettings({ settings, setSection }) {
  const docs = settings.documents || {};
  const set = (key, value) => setSection("documents", { ...docs, [key]: value });
  return <SectionCard eyebrow="Document print setup" title="Invoice, receipt, delivery, and purchase print options" description="Configure real prefixes, next numbers, print paper size, tax display, terms, and footers for PDFs/thermal/A4 printing.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <TextField label="Invoice prefix" value={docs.invoicePrefix} onChange={(v) => set("invoicePrefix", v)} />
      <TextField label="Receipt prefix" value={docs.receiptPrefix} onChange={(v) => set("receiptPrefix", v)} />
      <TextField label="Purchase prefix" value={docs.purchasePrefix} onChange={(v) => set("purchasePrefix", v)} />
      <TextField label="Delivery prefix" value={docs.deliveryPrefix} onChange={(v) => set("deliveryPrefix", v)} />
      <TextField label="Quotation prefix" value={docs.quotationPrefix} onChange={(v) => set("quotationPrefix", v)} />
      <TextField label="Next invoice #" type="number" value={docs.nextInvoiceNumber} onChange={(v) => set("nextInvoiceNumber", v)} />
      <TextField label="Next receipt #" type="number" value={docs.nextReceiptNumber} onChange={(v) => set("nextReceiptNumber", v)} />
      <SelectField label="Paper size" value={docs.printPaperSize} onChange={(v) => set("printPaperSize", v)} options={["A4", "A5", "Letter", "Thermal 80mm", "Thermal 58mm"]} />
      <SelectField label="Print mode" value={docs.printMode} onChange={(v) => set("printMode", v)} options={["professional", "compact", "thermal", "letterhead"]} />
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <ToggleField label="Show logo on print" checked={docs.showLogoOnPrint} onChange={(v) => set("showLogoOnPrint", v)} />
      <ToggleField label="Show stamp/signature" checked={docs.showStampOnPrint} onChange={(v) => set("showStampOnPrint", v)} />
      <ToggleField label="Show tax fields" checked={docs.showTaxOnPrint} onChange={(v) => set("showTaxOnPrint", v)} />
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-3">
      <TextField label="Invoice terms" value={docs.invoiceTerms} onChange={(v) => set("invoiceTerms", v)} multiline />
      <TextField label="Receipt footer" value={docs.receiptFooter} onChange={(v) => set("receiptFooter", v)} multiline />
      <TextField label="Delivery footer" value={docs.deliveryFooter} onChange={(v) => set("deliveryFooter", v)} multiline />
    </div>
  </SectionCard>;
}

function UploadSettings({ settings, setSection }) {
  const uploads = settings.uploads || {};
  const set = (key, value) => setSection("uploads", { ...uploads, [key]: value });
  return <SectionCard eyebrow="Cloudflare R2 uploads" title="Image, document, proof-of-delivery, invoice, and receipt attachments" description="These settings control upload rules for user documents, payment proofs, POD photos, invoice attachments, receipt attachments, and vehicle proofs.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SelectField label="Storage provider" value={uploads.storageProvider} onChange={(v) => set("storageProvider", v)} options={[{ value: "cloudflare_r2", label: "Cloudflare R2" }, { value: "local", label: "Local / future" }]} />
      <TextField label="Public file base URL" value={uploads.publicBaseUrl} onChange={(v) => set("publicBaseUrl", v)} />
      <TextField label="Max file size MB" type="number" value={uploads.maxFileSizeMb} onChange={(v) => set("maxFileSizeMb", v)} />
      <TextField label="Allowed image types" value={(uploads.allowedImageTypes || []).join(",")} onChange={(v) => set("allowedImageTypes", v.split(",").map((x) => x.trim()).filter(Boolean))} />
      <div className="md:col-span-2 xl:col-span-4"><TextField label="Allowed document types" value={(uploads.allowedDocumentTypes || []).join(",")} onChange={(v) => set("allowedDocumentTypes", v.split(",").map((x) => x.trim()).filter(Boolean))} /></div>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ToggleField label="Require user documents" helper="CNIC, contract, or joining files." checked={uploads.requireUserDocument} onChange={(v) => set("requireUserDocument", v)} />
      <ToggleField label="Require payment proof" checked={uploads.requirePaymentProof} onChange={(v) => set("requirePaymentProof", v)} />
      <ToggleField label="Require proof of delivery" checked={uploads.requireProofOfDelivery} onChange={(v) => set("requireProofOfDelivery", v)} />
      <ToggleField label="Allow invoice attachments" checked={uploads.allowInvoiceAttachments} onChange={(v) => set("allowInvoiceAttachments", v)} />
      <ToggleField label="Allow receipt attachments" checked={uploads.allowReceiptAttachments} onChange={(v) => set("allowReceiptAttachments", v)} />
      <ToggleField label="Allow vehicle proofs" checked={uploads.allowVehicleProofs} onChange={(v) => set("allowVehicleProofs", v)} />
    </div>
  </SectionCard>;
}

function SecuritySettings({ settings, setSection }) {
  const security = settings.security || {};
  const set = (key, value) => setSection("security", { ...security, [key]: value });
  return <SectionCard eyebrow="Security" title="Password, session, 2FA, audit, and login protection" description="Production security rules that protect tenant data and user access.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <TextField label="Min password length" type="number" value={security.minPasswordLength} onChange={(v) => set("minPasswordLength", v)} />
      <TextField label="Session timeout minutes" type="number" value={security.sessionTimeoutMinutes} onChange={(v) => set("sessionTimeoutMinutes", v)} />
      <TextField label="Login attempt limit" type="number" value={security.loginAttemptLimit} onChange={(v) => set("loginAttemptLimit", v)} />
      <TextField label="Audit retention days" type="number" value={security.auditRetentionDays} onChange={(v) => set("auditRetentionDays", v)} />
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <ToggleField label="Require strong password" checked={security.requireStrongPassword} onChange={(v) => set("requireStrongPassword", v)} />
      <ToggleField label="Allow remember me" checked={security.allowRememberMe} onChange={(v) => set("allowRememberMe", v)} />
      <ToggleField label="Require two-factor authentication" checked={security.requireTwoFactor} onChange={(v) => set("requireTwoFactor", v)} />
    </div>
  </SectionCard>;
}

function NotificationSettings({ settings, setSection }) {
  const notifications = settings.notifications || {};
  const set = (key, value) => setSection("notifications", { ...notifications, [key]: value });
  return <SectionCard eyebrow="Notifications" title="Email, WhatsApp, SMS, and event alerts" description="Configure sender identity and which ERP events should notify users and customers.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TextField label="Sender name" value={notifications.senderName} onChange={(v) => set("senderName", v)} />
      <TextField label="Sender email" value={notifications.senderEmail} onChange={(v) => set("senderEmail", v)} />
      <TextField label="WhatsApp number" value={notifications.whatsappNumber} onChange={(v) => set("whatsappNumber", v)} />
      <SelectField label="Email provider" value={notifications.emailProvider} onChange={(v) => set("emailProvider", v)} options={["smtp", "sendgrid", "mailgun", "manual"]} />
      <SelectField label="SMS provider" value={notifications.smsProvider} onChange={(v) => set("smsProvider", v)} options={["manual", "twilio", "local_sms_gateway"]} />
      <SelectField label="WhatsApp provider" value={notifications.whatsappProvider} onChange={(v) => set("whatsappProvider", v)} options={["manual", "meta_cloud_api", "twilio_whatsapp"]} />
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ToggleField label="Order alerts" checked={notifications.notifyOnOrderCreated} onChange={(v) => set("notifyOnOrderCreated", v)} />
      <ToggleField label="Payment alerts" checked={notifications.notifyOnPaymentReceived} onChange={(v) => set("notifyOnPaymentReceived", v)} />
      <ToggleField label="Low stock alerts" checked={notifications.notifyOnLowStock} onChange={(v) => set("notifyOnLowStock", v)} />
      <ToggleField label="Delivery alerts" checked={notifications.notifyOnDelivery} onChange={(v) => set("notifyOnDelivery", v)} />
    </div>
  </SectionCard>;
}

function IntegrationSettings({ settings, setSection }) {
  const integrations = settings.integrations || {};
  const set = (key, value) => setSection("integrations", { ...integrations, [key]: value });
  return <SectionCard eyebrow="Integrations" title="MongoDB Atlas, Cloudflare, maps, gateway, and backup preferences" description="This screen stores safe operational preferences. Secret keys remain in environment variables on the server.">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <TextField label="MongoDB Atlas cluster name" value={integrations.mongodbAtlasClusterName} onChange={(v) => set("mongodbAtlasClusterName", v)} />
      <SelectField label="Payment gateway" value={integrations.paymentGateway} onChange={(v) => set("paymentGateway", v)} options={["manual", "stripe", "paypal", "easypaisa", "jazzcash", "bank_transfer"]} />
      <SelectField label="Backup schedule" value={integrations.backupSchedule} onChange={(v) => set("backupSchedule", v)} options={["hourly", "daily", "weekly", "monthly"]} />
      <TextField label="Backup retention days" type="number" value={integrations.backupRetentionDays} onChange={(v) => set("backupRetentionDays", v)} />
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <ToggleField label="Cloudflare R2 enabled" checked={integrations.cloudflareR2Enabled} onChange={(v) => set("cloudflareR2Enabled", v)} />
      <ToggleField label="MongoDB Atlas enabled" checked={integrations.mongodbAtlasEnabled} onChange={(v) => set("mongodbAtlasEnabled", v)} />
      <ToggleField label="Google Maps enabled" checked={integrations.googleMapsEnabled} onChange={(v) => set("googleMapsEnabled", v)} />
    </div>
  </SectionCard>;
}

export default function SettingsPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("companyProfile");
  const [settings, setSettings] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isSystemAdmin = useMemo(() => {
    const role = String(user?.role || user?.roleKey || user?.portalType || "").toLowerCase();
    return ["admin", "system admin", "super admin", "system_admin", "super_admin"].includes(role);
  }, [user]);

  async function load(companyId = targetCompanyId) {
    setLoading(true); setError(""); setMessage("");
    try {
      const params = companyId ? { companyId } : {};
      const result = await fetchSettings(params);
      setSettings(result.settings || {});
    } catch (err) {
      setError(err.message || "Failed to load settings");
    } finally { setLoading(false); }
  }

  async function loadCompanies() {
    if (!isSystemAdmin) return;
    try {
      const overview = await fetchSystemAdminOverview();
      setCompanies(overview.companies || []);
    } catch (_) {
      setCompanies([]);
    }
  }

  useEffect(() => { loadCompanies(); }, [isSystemAdmin]);
  useEffect(() => { load(targetCompanyId); }, [targetCompanyId]);

  function setSection(section, value) {
    setSettings((prev) => ({ ...(prev || {}), [section]: value }));
  }

  async function saveActiveSection() {
    if (!settings) return;
    setSaving(true); setMessage(""); setError("");
    try {
      const result = await saveSettingsSection(activeTab, settings[activeTab] || {}, targetCompanyId ? { companyId: targetCompanyId } : {});
      setSettings(result.settings || settings);
      setMessage(result.message || "Settings saved");
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally { setSaving(false); }
  }

  function renderActiveSection() {
    if (!settings) return null;
    const props = { settings, setSection, setSettings, targetCompanyId: targetCompanyId || settings.companyId };
    if (activeTab === "companyProfile") return <CompanySettings {...props} />;
    if (activeTab === "portal") return <PortalSettings {...props} />;
    if (activeTab === "documents") return <DocumentSettings {...props} />;
    if (activeTab === "uploads") return <UploadSettings {...props} />;
    if (activeTab === "security") return <SecuritySettings {...props} />;
    if (activeTab === "notifications") return <NotificationSettings {...props} />;
    if (activeTab === "integrations") return <IntegrationSettings {...props} />;
    return null;
  }

  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-emerald-700 to-cyan-500 p-6 text-white shadow-lg">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-100">Settings Center</p>
          <h2 className="mt-2 text-3xl font-black">Real ERP Configuration</h2>
          <p className="mt-2 max-w-4xl text-sm text-cyan-50">Configure company identity, portal defaults, invoice and receipt printing, Cloudflare R2 uploads, security, notifications, integrations, and backup preferences.</p>
        </div>
        {isSystemAdmin ? <label className="block min-w-full xl:min-w-[320px]">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Manage settings for</span>
          <select value={targetCompanyId} onChange={(e) => setTargetCompanyId(e.target.value)} className="mt-1 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none backdrop-blur [&_option]:text-slate-950">
            <option value="">Rawyan ERP system defaults</option>
            {companies.map((company) => <option key={company.companyId} value={company.companyId}>{company.name} ({company.companyId})</option>)}
          </select>
        </label> : null}
      </div>
    </div>

    <div className="flex gap-2 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
      {SECTION_TABS.map(([key, label]) => <button key={key} onClick={() => setActiveTab(key)} className={`whitespace-nowrap rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wide transition ${activeTab === key ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{label}</button>)}
    </div>

    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading settings…</div> : null}
    {!loading && renderActiveSection()}
    {!loading ? <SaveBar busy={saving} message={message} error={error} onSave={saveActiveSection} /> : null}
  </div>;
}
