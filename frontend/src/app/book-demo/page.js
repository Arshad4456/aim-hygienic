import PublicSiteLayout from "@/src/app/public-site/PublicSiteLayout";
import { ContactCards, DemoRequestSection, SectionIntro } from "@/src/app/public-site/PublicSections";
export const metadata = { title: "Book Demo | Rawyan ERP" };
export default function BookDemoPage() {
  return (
    <PublicSiteLayout>
      <DemoRequestSection />
      <section className="px-4 pb-16 sm:px-5 lg:px-8 lg:pb-20">
        <SectionIntro eyebrow="Contact" title="Talk directly with Rawyan ERP" description="Use email, mobile, or WhatsApp to discuss your ERP requirements, demo timing, and deployment plan." />
        <div className="mx-auto mt-12 max-w-7xl"><ContactCards /></div>
      </section>
    </PublicSiteLayout>
  );
}
