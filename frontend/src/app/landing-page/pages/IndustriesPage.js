import PublicSiteLayout from "@/src/app/landing-page/components/PublicSiteLayout";
import { CTASection, IndustriesGrid, SectionIntro } from "@/src/app/landing-page/components/PublicSections";
export const metadata = { title: "Business ERP Solutions | Rawyan ERP" };
export default function IndustriesPage() {
  return (
    <PublicSiteLayout>
      <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
        <SectionIntro eyebrow="Solutions" title="ERP packages for different business models" description="This section is useful when a company wants a focused ERP package for distribution, retail, service, manufacturing, trading, or a custom workflow." />
      </section>
      <IndustriesGrid />
      <CTASection />
    </PublicSiteLayout>
  );
}
