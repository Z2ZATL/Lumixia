import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { ComingSoonVeil } from './ComingSoonVeil';

const FLIGHT_STATUSES = [
  'Scanning optimal fares from Bangkok...',
  'Comparing 847 routes and timing windows...',
  'Found 3 premium cabin deals - verifying...',
  'Locking in the best fare window...',
];

const WEALTH_STATUSES = [
  'Analyzing weekly lifestyle signals...',
  'Optimizing asset allocation...',
  'Harvesting tax losses and offsets...',
  'Generating premium yield summary...',
];

const STREAM_LINES = [
  '-> agent:flight_hunter connected',
  '-> protocol: ag-ui v2.1 synced',
  '-> wealth_optimizer ready',
  '-> concierge stream stabilized',
];

const ZEN_MOMENT = {
  eyebrow: 'Daily Insight',
  quote:
    'Clarity precedes success. Your financial aura is perfectly balanced today.',
  source: 'Lumixia Zen Moment',
};

export const RightRail: React.FC = () => {
  const { lifestyleEvents } = useDashboard();
  const timelineItems = lifestyleEvents.slice(0, 4);

  return (
    <aside className="no-scrollbar flex h-full w-full flex-col gap-5 overflow-y-auto bg-white px-4 py-6 sm:px-5 sm:py-8 lg:px-6 lg:py-10">
      <section className="relative isolate min-h-[132px] overflow-hidden rounded-[28px] border border-amber-200/45 bg-white/92 p-5 shadow-[0_16px_38px_rgba(28,40,65,0.08)] sm:min-h-[150px] sm:rounded-3xl sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_42%),linear-gradient(135deg,rgba(255,251,235,0.9),rgba(255,255,255,0.55)_45%,rgba(239,246,255,0.5))]" />
        <div className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-primary/5" />
        <div className="relative z-10 flex min-h-[92px] min-w-0 flex-col justify-between gap-4 sm:min-h-[110px]">
          <div className="flex items-start justify-between gap-3 sm:items-center">
            <span className="material-symbols-outlined icon-filled flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100/75 text-[19px] text-[#A43C12] ring-1 ring-amber-200/70">
              filter_vintage
            </span>
            <div className="min-w-0 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-400">
                {ZEN_MOMENT.eyebrow}
              </p>
              <h4 className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary sm:text-[9px] sm:tracking-widest">
              Zen Moment
              </h4>
            </div>
          </div>

          <blockquote className="break-words font-serif text-[15px] italic leading-[1.65] text-slate-700 sm:text-base">
            &ldquo;{ZEN_MOMENT.quote}&rdquo;
          </blockquote>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/55">
            {ZEN_MOMENT.source}
          </p>
        </div>
      </section>

      <section className="relative isolate overflow-hidden rounded-3xl">
        <div className="dashboard-glass-card dashboard-ambient-glow rounded-3xl border border-primary/10 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Active AI Agents
            </h4>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold text-primary/50">LIVE</span>
              <div className="animate-pulse-dot h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgba(0,90,156,0.5)]" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  flight_takeoff
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Flight Hunter AI</p>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                </div>
                <p className="text-stream truncate text-[11px] text-slate-500">
                  {FLIGHT_STATUSES[0]}
                </p>
                <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="animate-agui absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-primary/50 to-primary" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  auto_graph
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Wealth Optimizer</p>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
                </div>
                <p className="text-stream truncate text-[11px] text-slate-500">
                  {WEALTH_STATUSES[0]}
                </p>
                <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="animate-agui absolute inset-y-0 left-0 w-[70%] rounded-full bg-gradient-to-r from-emerald-400/50 to-emerald-500"
                    style={{ animationDelay: '1.5s' }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
                Stream Log
              </p>
              <div className="space-y-1">
                <p className="font-mono text-[10px] text-slate-400">
                  * Protocol: AG-UI v2.1
                </p>
                <p className="font-mono text-[10px] text-primary/70">
                  {STREAM_LINES[0]}
                </p>
              </div>
            </div>
          </div>
        </div>
        <ComingSoonVeil className="rounded-3xl" label="Coming soon" shouldBlur={false} />
      </section>

      <section className="relative isolate overflow-hidden rounded-3xl">
        <div className="dashboard-glass-card dashboard-ambient-glow rounded-3xl border border-slate-100 p-5">
          <h4 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-primary">
            Upcoming Lifestyle
          </h4>

          {timelineItems.length === 0 ? (
            <p className="text-sm text-slate-500">
              No upcoming lifestyle events yet.
            </p>
          ) : (
            <div className="relative space-y-7 pl-4">
              <div className="absolute bottom-2 left-[7px] top-2 w-[1.5px] bg-slate-100" />
              {timelineItems.map((item, index) => (
                <div key={item.id} className="relative">
                  <div
                    className={`absolute -left-[14px] top-1.5 z-10 h-2 w-2 rounded-full border-2 bg-white ${
                      index === 0 ? 'border-primary' : 'border-slate-300'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-bold leading-tight text-slate-900">
                      {item.emoji} {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <ComingSoonVeil className="rounded-3xl" label="Coming soon" shouldBlur={false} />
      </section>
    </aside>
  );
};
