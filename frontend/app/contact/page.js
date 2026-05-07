import PublicSiteLayout from "@/src/public-site/PublicSiteLayout";
import { ContactCards, CTASection, SectionIntro } from "@/src/public-site/PublicSections";
export const metadata = { title: "Contact" };
export default function ContactPage(){return <PublicSiteLayout><section className="px-5 py-20 lg:px-8"><SectionIntro eyebrow="Contact" title="Talk about ERP implementation, demo, or deployment" description="Use these contacts from environment config so you can change company branding without editing pages."/><div className="mx-auto mt-12 max-w-7xl"><ContactCards/></div></section><CTASection/></PublicSiteLayout>}
