export const accentThemes = {
  violet: {
    panel: 'from-violet-500/20 via-fuchsia-500/15 to-sky-500/10',
    border: 'border-violet-400/30',
    badge: 'bg-violet-500/15 text-violet-100 ring-violet-300/20',
    glow: 'shadow-[0_24px_60px_-24px_rgba(139,92,246,0.45)]',
  },
  rose: {
    panel: 'from-rose-500/20 via-orange-500/15 to-yellow-500/10',
    border: 'border-rose-400/30',
    badge: 'bg-rose-500/15 text-rose-100 ring-rose-300/20',
    glow: 'shadow-[0_24px_60px_-24px_rgba(244,63,94,0.42)]',
  },
  emerald: {
    panel: 'from-emerald-500/20 via-teal-500/15 to-cyan-500/10',
    border: 'border-emerald-400/30',
    badge: 'bg-emerald-500/15 text-emerald-100 ring-emerald-300/20',
    glow: 'shadow-[0_24px_60px_-24px_rgba(16,185,129,0.42)]',
  },
  sky: {
    panel: 'from-sky-500/20 via-blue-500/15 to-indigo-500/10',
    border: 'border-sky-400/30',
    badge: 'bg-sky-500/15 text-sky-100 ring-sky-300/20',
    glow: 'shadow-[0_24px_60px_-24px_rgba(14,165,233,0.42)]',
  },
  amber: {
    panel: 'from-amber-500/20 via-yellow-500/15 to-orange-500/10',
    border: 'border-amber-400/30',
    badge: 'bg-amber-500/15 text-amber-100 ring-amber-300/20',
    glow: 'shadow-[0_24px_60px_-24px_rgba(245,158,11,0.42)]',
  },
  fuchsia: {
    panel: 'from-fuchsia-500/20 via-pink-500/15 to-purple-500/10',
    border: 'border-fuchsia-400/30',
    badge: 'bg-fuchsia-500/15 text-fuchsia-100 ring-fuchsia-300/20',
    glow: 'shadow-[0_24px_60px_-24px_rgba(217,70,239,0.42)]',
  },
  slate: {
    panel: 'from-slate-500/20 via-slate-400/12 to-zinc-500/10',
    border: 'border-white/10',
    badge: 'bg-white/10 text-slate-100 ring-white/10',
    glow: 'shadow-[0_24px_60px_-24px_rgba(30,41,59,0.42)]',
  },
};

export const severityTheme = {
  critical: {
    chip: 'bg-rose-500/15 text-rose-200 ring-rose-300/20',
    dot: 'bg-rose-400',
    panel: 'border-rose-300/25 bg-rose-500/8',
  },
  warning: {
    chip: 'bg-amber-500/15 text-amber-100 ring-amber-300/20',
    dot: 'bg-amber-400',
    panel: 'border-amber-300/25 bg-amber-500/8',
  },
  info: {
    chip: 'bg-sky-500/15 text-sky-100 ring-sky-300/20',
    dot: 'bg-sky-400',
    panel: 'border-sky-300/25 bg-sky-500/8',
  },
};

export function getAccentTheme(accent) {
  return accentThemes[accent] || accentThemes.slate;
}

export function getSeverityTheme(level) {
  return severityTheme[level] || severityTheme.info;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function formatCompact(value) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export function toPct(part, whole) {
  const total = Number(whole || 0);
  if (!total) return 0;
  return Math.round((Number(part || 0) / total) * 100);
}