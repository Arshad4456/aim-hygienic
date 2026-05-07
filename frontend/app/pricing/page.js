import PublicSiteLayout from "@/src/public-site/PublicSiteLayout";
import { CTASection, PricingSection, SectionIntro } from "@/src/public-site/PublicSections";
export const metadata = { title: "ERP Pricing" };
export default function PricingPage(){return <PublicSiteLayout><section className="px-5 py-20 lg:px-8"><SectionIntro eyebrow="Pricing" title="Price by company, users, branches, warehouses, and modules" description="ERP pricing should be connected to SaaS limits, module access, mobile users, storage, and support level."/></section><PricingSection/><CTASection/></PublicSiteLayout>}
