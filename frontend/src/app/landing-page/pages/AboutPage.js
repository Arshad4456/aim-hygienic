import PublicSiteLayout from "@/src/app/landing-page/components/PublicSiteLayout";
import { CTASection, SectionIntro } from "@/src/app/landing-page/components/PublicSections";
import { BRAND_CONFIG } from "@/src/app/config/brand";
export const metadata = { title: "About | Rawyan ERP" };
export default function AboutPage() {
  return (
    <PublicSiteLayout>
      <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
        <SectionIntro eyebrow="About" title={`${BRAND_CONFIG.name} helps businesses manage operations from one platform`} description="Rawyan ERP brings sales, purchases, inventory, warehouse, finance, delivery, documents, reports, and mobile access into a secure cloud ERP experience." />
        <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            ["Operational Control", "Owners and managers can monitor daily transactions, stock, payments, users, documents, and reports."],
            ["Cloud + Mobile", "Office teams work from the web portal while sales, warehouse, and delivery users can work through mobile workflows."],
            ["Secure Access", "Roles, permissions, audit logs, and tenant-based controls help keep company data protected."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7">
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <CTASection />
    </PublicSiteLayout>
  );
}
