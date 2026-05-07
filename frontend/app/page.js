import PublicSiteLayout from "@/src/public-site/PublicSiteLayout";
import { CTASection, CloudStorageSection, HeroSection, IndustriesGrid, ModulesGrid, PricingSection } from "@/src/public-site/PublicSections";

export default function Home() {
  return <PublicSiteLayout><HeroSection /><ModulesGrid /><IndustriesGrid /><CloudStorageSection /><PricingSection /><CTASection /></PublicSiteLayout>;
}
