"use client";

export default function OnboardingLayout({ stepper, children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <aside>{stepper}</aside>
        <main className="rounded-xl border bg-white p-5 md:p-6">
          <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
          {subtitle ? <p className="text-sm text-zinc-600 mt-1">{subtitle}</p> : null}
          <div className="mt-5">{children}</div>
        </main>
      </div>
    </div>
  );
}