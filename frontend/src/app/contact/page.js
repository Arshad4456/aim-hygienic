import PublicSiteLayout from "@/src/app/public-site/PublicSiteLayout";
import { ContactCards, CTASection, SectionIntro } from "@/src/app/public-site/PublicSections";
export const metadata = { title: "Contact | Rawyan ERP" };
export default function ContactPage() {
  return (
    <PublicSiteLayout>
      <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
        <SectionIntro eyebrow="Contact" title="Contact Rawyan ERP" description="Discuss ERP implementation, software demo, module requirements, document uploads, mobile app usage, invoices, receipts, reports, and deployment." />
        <div className="mx-auto mt-12 max-w-7xl"><ContactCards /></div>
      </section>
      <CTASection />
    </PublicSiteLayout>
  );
}
