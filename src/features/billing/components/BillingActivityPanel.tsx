import React from 'react';
import type { CreditLedgerItem } from '../types';
import { formatTimestamp } from '../lib/display';
import { StatusPill } from './BillingPrimitives';

interface BillingActivityPanelProps {
  ledgerItems: CreditLedgerItem[];
}

export const BillingActivityPanel: React.FC<BillingActivityPanelProps> = ({
  ledgerItems,
}) => (
  <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_44px_rgba(28,40,65,0.08)]">
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/75">
        Recent credit activity
      </p>
      <h3 className="mt-2 text-[1.7rem] font-extrabold leading-[1.08] tracking-tight text-slate-900">
        Ledger timeline
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        A clear view of recent credit grants, debits, and the resulting wallet
        balance.
      </p>
      <div className="mt-4 flex justify-center">
        <StatusPill label={`${ledgerItems.length} entries`} tone="slate" />
      </div>
    </div>

    <div className="mt-5 space-y-3">
      {ledgerItems.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600">
          No credit activity has been recorded yet.
        </div>
      ) : (
        ledgerItems.map((entry) => (
          <div
            key={entry.id}
            className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize text-slate-900">
                  {entry.entryKind.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTimestamp(entry.createdAt)}
                </p>
              </div>
              <div className="min-w-[88px] text-center">
                <p
                  className={`text-sm font-bold ${
                    entry.delta >= 0 ? 'text-emerald-600' : 'text-slate-900'
                  }`}
                >
                  {entry.delta >= 0 ? '+' : ''}
                  {entry.delta.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Balance {entry.balanceAfter.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </section>
);
