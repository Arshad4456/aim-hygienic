import PublicSiteLayout from "@/src/app/public-site/PublicSiteLayout";
import { CTASection, CloudStorageSection, FeatureGroups, HeroSection, ModulesGrid, PricingSection } from "@/src/app/public-site/PublicSections";

export default function Home() {
  return (
    <PublicSiteLayout>
      <HeroSection />
      <FeatureGroups />
      <ModulesGrid />
      <CloudStorageSection />
      <PricingSection />
      <CTASection />
    </PublicSiteLayout>
  );
}
