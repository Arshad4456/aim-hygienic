import Link from "next/link";
import PublicSiteLayout from "@/src/app/public-site/PublicSiteLayout";
import { CTASection, SectionIntro } from "@/src/app/public-site/PublicSections";
import { industrySolutions } from "@/src/app/public-site/marketingData";
export function generateStaticParams() { return industrySolutions.map((industry) => ({ slug: industry.slug })); }
export function generateMetadata({ params }) { const industry = industrySolutions.find((item) => item.slug === params.slug); return { title: `${industry?.name || "ERP Solution"} | Rawyan ERP` }; }
export default function IndustryDetailPage({ params }) {
  const industry = industrySolutions.find((item) => item.slug === params.slug) || industrySolutions[0];
  return (
    <PublicSiteLayout>
      <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <Link href="/industries" className="text-sm font-bold text-emerald-300">← Back to solutions</Link>
          <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">ERP Solution</p>
              <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-7xl">{industry.name}</h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">{industry.summary}</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-500">Business Flow</p>
              <p className="mt-4 text-2xl font-black leading-snug text-white">{industry.workflow}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {industry.modules.map((item) => <span key={item} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-slate-300">{item}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-5 lg:px-8 lg:pb-20">
        <SectionIntro eyebrow="Included Modules" title={`${industry.name} module package`} description="This package connects the required operational modules with users, permissions, reports, documents, invoices, receipts, and dashboard visibility." />
      </section>
      <CTASection />
    </PublicSiteLayout>
  );
}
