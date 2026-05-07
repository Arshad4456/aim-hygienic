import PublicSiteLayout from "@/src/public-site/PublicSiteLayout";
import { CTASection, SectionIntro } from "@/src/public-site/PublicSections";
import { BRAND_CONFIG } from "@/src/config/brand";
export const metadata = { title: "About" };
export default function AboutPage(){return <PublicSiteLayout><section className="px-5 py-20 lg:px-8"><SectionIntro eyebrow="About" title={`${BRAND_CONFIG.name} is becoming a modular ERP SaaS platform`} description="The product direction is clear: one professional public website, one SaaS owner portal, one modular ERP portal, one mobile app, and industry templates that can compete in the market."/><div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-3">{["Core ERP first","Industry templates second","Testing and deployment last"].map((item)=><div key={item} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 text-xl font-black">{item}</div>)}</div></section><CTASection/></PublicSiteLayout>}
