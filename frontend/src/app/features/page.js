import PublicSiteLayout from "@/src/app/public-site/PublicSiteLayout";
import { CTASection, CloudStorageSection, FeatureGroups, HighlightGrid, SectionIntro } from "@/src/app/public-site/PublicSections";
export const metadata = { title: "ERP Features | Rawyan ERP" };
export default function FeaturesPage() {
  return (
    <PublicSiteLayout>
      <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
        <SectionIntro eyebrow="Features" title="ERP features for owners, office staff, and field teams" description="Rawyan ERP gives every department the tools they need to work faster, reduce manual mistakes, and keep business records clean." />
        <HighlightGrid />
      </section>
      <FeatureGroups />
      <CloudStorageSection />
      <CTASection />
    </PublicSiteLayout>
  );
}
