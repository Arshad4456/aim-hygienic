import PublicSiteLayout from "@/src/public-site/PublicSiteLayout";
import { CTASection, PricingSection, SectionIntro } from "@/src/public-site/PublicSections";
import { BRAND_CONFIG } from "@/src/config/brand";
export const metadata = { title: "Pricing | Rawyan ERP" };
export default function PricingPage() {
  return (
    <PublicSiteLayout>
      <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
        <SectionIntro eyebrow="Pricing" title="ERP pricing based on your modules and team size" description="Every business has different users, branches, warehouses, reports, and workflows. Rawyan ERP pricing is prepared according to your actual operational needs." />
        <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center text-sm leading-7 text-slate-300">
          For a price estimate, contact {BRAND_CONFIG.salesEmail} or WhatsApp {BRAND_CONFIG.whatsappNumber}.
        </div>
      </section>
      <PricingSection />
      <CTASection />
    </PublicSiteLayout>
  );
}
