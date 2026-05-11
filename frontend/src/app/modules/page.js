import PublicSiteLayout from "@/src/app/public-site/PublicSiteLayout";
import { CTASection, ModulesGrid, ModuleSections, SectionIntro } from "@/src/app/public-site/PublicSections";
export const metadata = { title: "ERP Modules | Rawyan ERP" };
export default function ModulesPage() {
  return (
    <PublicSiteLayout>
      <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
        <SectionIntro eyebrow="ERP Modules" title="Core ERP modules connected in one platform" description="Start with sales, purchase, inventory, finance, warehouse, reports, and users. Add advanced modules as your business grows." />
      </section>
      <ModulesGrid />
      <ModuleSections />
      <CTASection />
    </PublicSiteLayout>
  );
}
