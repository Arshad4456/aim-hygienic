import Link from "next/link";
import { BRAND_CONFIG } from "@/src/app/config/brand";
import {
  clientBenefits,
  contactMethods,
  coreModules,
  demoFormFields,
  documentFeatures,
  featureGroups,
  heroStats,
  industrySolutions,
  mailLink,
  moduleSections,
  platformHighlights,
  pricingPlans,
  whatsappLink,
} from "../data/marketingData";

export function Badge({ children }) {
  return <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">{children}</span>;
}

export function SectionIntro({ eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-slate-300">{description}</p> : null}
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-5 lg:px-8 lg:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.22),transparent_35%),radial-gradient(circle_at_80%_5%,rgba(59,130,246,0.2),transparent_35%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Badge>ERP Software for Growing Businesses</Badge>
          <h1 className="mt-6 max-w-5xl text-4xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
            Run sales, inventory, finance, warehouse, delivery, and documents in one ERP.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{BRAND_CONFIG.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/book-demo" className="rounded-2xl bg-white px-6 py-4 text-center text-sm font-black text-slate-950 shadow-xl transition hover:-translate-y-0.5">
              Book a Free Demo
            </Link>
            <a href={whatsappLink} className="rounded-2xl border border-white/15 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white/10">
              WhatsApp {BRAND_CONFIG.whatsappNumber}
            </a>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            {clientBenefits.slice(0, 6).map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
}

export function DashboardPreview() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/10 p-3 shadow-2xl shadow-cyan-950/40 backdrop-blur">
      <div className="rounded-[1.6rem] bg-slate-950 p-4">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Rawyan ERP Dashboard</p>
            <h3 className="mt-1 text-2xl font-black">Live Business Overview</h3>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">Cloud Ready</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {heroStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="mt-2 text-xl font-black">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-end gap-2">
              {[42, 64, 51, 80, 67, 90, 72].map((height, index) => (
                <div key={index} className="flex-1 rounded-t-xl bg-gradient-to-t from-emerald-500 to-cyan-300" style={{ height: `${height * 1.25}px` }} />
              ))}
            </div>
            <p className="mt-4 text-sm font-bold text-slate-300">Monitor sales, collections, stock, expenses, delivery, and cash/bank activity.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Recent Activity</p>
            {["Sales invoice printed", "Receipt generated", "Payment proof uploaded", "POD image attached"].map((item) => (
              <p key={item} className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-slate-300">{item}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModulesGrid() {
  return (
    <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionIntro eyebrow="Core ERP Modules" title="Everything your team needs to operate faster" description="Rawyan ERP connects daily operations with accounting, inventory, warehouse, sales, purchases, delivery, documents, and reporting." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {coreModules.map((module) => (
            <div key={module.title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-slate-950/20">
              <h3 className="text-xl font-black text-white">{module.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{module.description}</p>
              <div className="mt-5 grid gap-2">
                {module.points.map((point) => (
                  <span key={point} className="rounded-xl bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300">✓ {point}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureGroups() {
  return (
    <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionIntro eyebrow="Features" title="Built for real business teams" description="Owners get control, office teams get speed, field teams get mobile access, and customers receive clean documents." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureGroups.map((group) => (
            <div key={group.title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-xl font-black">{group.title}</h3>
              <div className="mt-5 grid gap-3 text-sm text-slate-300">
                {group.items.map((item) => <span key={item}>✓ {item}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ModuleSections() {
  return (
    <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionIntro eyebrow="Module Details" title="A complete ERP foundation" description="Choose the modules your company needs now and expand as your operations grow." />
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {moduleSections.map((section) => (
            <div key={section.title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black">{section.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{section.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {section.modules.map((module) => <span key={module} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300">{module}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function IndustriesGrid({ compact = false }) {
  return (
    <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionIntro eyebrow="Business Solutions" title="ERP packages for different business models" description="Rawyan ERP can be configured for distribution, trading, retail, service, manufacturing, or custom business workflows." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {industrySolutions.map((industry) => (
            <Link href={`/industries/${industry.slug}`} key={industry.slug} className="group rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 transition hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-white/[0.09]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{industry.name}</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">{industry.summary}</p>
              {!compact ? <div className="mt-5 flex flex-wrap gap-2">{industry.modules.slice(0, 4).map((item) => <span key={item} className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300">{item}</span>)}</div> : null}
              <p className="mt-5 text-sm font-black text-white">View details →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CloudStorageSection() {
  return (
    <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Badge>Documents + Proofs + Printing</Badge>
          <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Upload documents where business proof is required.</h2>
          <p className="mt-5 text-base leading-7 text-slate-300">Rawyan ERP is prepared for MongoDB Atlas and Cloudflare R2 style storage, so business files can be attached to transactions and user records instead of being scattered on phones or WhatsApp chats.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {documentFeatures.map(([title, body]) => (
            <div key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-lg font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionIntro eyebrow="Pricing" title="Choose a package based on your business size" description="Pricing depends on users, modules, branches, warehouses, mobile access, document storage, support, and custom workflow requirements." />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div key={plan.name} className={`rounded-[2rem] border p-6 ${plan.featured ? "border-emerald-300/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.06]"}`}>
              <h3 className="text-2xl font-black">{plan.name}</h3>
              <p className="mt-3 text-3xl font-black">{plan.price}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{plan.description}</p>
              <div className="mt-6 grid gap-3 text-sm text-slate-300">
                {plan.features.map((feature) => <span key={feature}>✓ {feature}</span>)}
              </div>
              <Link href="/book-demo" className="mt-7 inline-flex w-full justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Request Price</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DemoRequestSection() {
  return (
    <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
          <Badge>Book Demo</Badge>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">See how {BRAND_CONFIG.name} can fit your business.</h1>
          <p className="mt-5 text-sm leading-7 text-slate-300">Share your company size, users, branches, warehouses, and required modules. A demo can cover dashboard, sales, purchase, inventory, finance, documents, invoices, receipts, and mobile app flow.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <a href={whatsappLink} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950">WhatsApp Now</a>
            <a href={mailLink} className="rounded-2xl border border-white/15 px-5 py-4 text-center text-sm font-black text-white hover:bg-white/10">Email Us</a>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
          <h2 className="text-2xl font-black">Demo information</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">These details help prepare the correct ERP demo for your business.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {demoFormFields.map((field) => (
              <div key={field} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-300">{field}</div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-emerald-400/10 p-5 text-sm leading-6 text-emerald-100">
            Direct contact: {BRAND_CONFIG.salesEmail} · {BRAND_CONFIG.whatsappNumber}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="px-4 py-16 sm:px-5 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 p-8 text-center shadow-2xl shadow-cyan-950/30 sm:p-14">
        <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Ready to manage your business with {BRAND_CONFIG.name}?</h2>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/85">Book a demo and review the ERP modules, mobile app, document uploads, invoice/receipt printing, reports, and permissions.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/book-demo" className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950">Book Demo</Link>
          <a href={whatsappLink} className="rounded-2xl border border-white/30 px-6 py-4 text-sm font-black text-white">WhatsApp</a>
        </div>
      </div>
    </section>
  );
}

export function ContactCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {contactMethods.map((method) => (
        <a key={method.label} href={method.href} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 transition hover:-translate-y-1 hover:bg-white/[0.09]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{method.label}</p>
          <p className="mt-3 break-words text-lg font-black text-white">{method.value}</p>
        </a>
      ))}
    </div>
  );
}

export function HighlightGrid() {
  return (
    <div className="mx-auto mt-12 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {platformHighlights.map((item) => <div key={item} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 text-sm font-bold text-slate-200">✓ {item}</div>)}
    </div>
  );
}
