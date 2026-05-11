import PublicSiteLayout from "@/src/app/landing-page/components/PublicSiteLayout";
import { CTASection, CloudStorageSection, FeatureGroups, HeroSection, ModulesGrid, PricingSection } from "@/src/app/landing-page/components/PublicSections";

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
