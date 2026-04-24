import React from 'react';
import { ComingSoonVeil } from './ComingSoonVeil';

const INTENTS = [
  { label: 'Summarize Portfolio', icon: 'bar_chart_4_bars' },
  { label: 'Find Fast Flights', icon: 'flight_takeoff' },
  { label: 'Plan My Week', icon: 'calendar_today' },
  { label: 'Top Deals Today', icon: 'local_offer' },
  { label: 'Optimize Sleep', icon: 'bedtime' },
];

export const IntentPills: React.FC = () => {
  return (
    <div className="relative mb-8">
      <div className="flex flex-wrap items-center justify-center gap-2.5 blur-[2px] saturate-[0.8]">
      {INTENTS.map((intent) => {
        return (
          <button
            key={intent.label}
            className="dashboard-intent-btn flex items-center gap-2 rounded-full border border-outline-variant/50 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all"
            type="button"
            disabled
          >
            <span className="material-symbols-outlined text-[16px] text-primary">
              {intent.icon}
            </span>
            {intent.label}
          </button>
        );
      })}
      </div>
      <ComingSoonVeil label="Coming soon" />
    </div>
  );
};
