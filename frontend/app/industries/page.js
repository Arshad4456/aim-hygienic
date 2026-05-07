import PublicSiteLayout from "@/src/public-site/PublicSiteLayout";
import { CTASection, IndustriesGrid, SectionIntro } from "@/src/public-site/PublicSections";
export const metadata = { title: "ERP Industries" };
export default function IndustriesPage(){return <PublicSiteLayout><section className="px-5 py-20 lg:px-8"><SectionIntro eyebrow="Industries" title="Sell one SaaS ERP as many ERP products" description="Use industry templates to package the same core system for distribution, manufacturing, POS retail, service, trading, and custom workflows."/></section><IndustriesGrid/><CTASection/></PublicSiteLayout>}
