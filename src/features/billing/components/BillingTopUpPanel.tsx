import React from 'react';
import { formatMinorCurrency } from '../lib/billing';
import { formatCardLabel, type TopUpOption } from '../lib/display';
import type { BillingRateBookSummary, PaymentMethodSummary } from '../types';
import { FieldLabel, StatusPill } from './BillingPrimitives';

interface BillingTopUpPanelProps {
  autoReloadAmount: string;
  autoReloadCurrency: string;
  autoReloadEnabled: boolean;
  autoReloadMessage: string;
  autoReloadMonthlyCap: string;
  autoReloadPaymentMethodId: string;
  autoReloadStatusLabel: string;
  autoReloadThreshold: string;
  canOpenCheckout: boolean;
  hasPurchasedCredits: boolean;
  isEditingAutoReload: boolean;
  isPreparingCheckout: boolean;
  isRefreshing: boolean;
  isUpdatingAutoReload: boolean;
  overviewRateBooks: BillingRateBookSummary[];
  paymentMethods: PaymentMethodSummary[];
  selectedCurrency: string;
  selectedRateBook: BillingRateBookSummary | null;
  topUpAmount: string;
  topUpOptions: TopUpOption[];
  onAutoReloadAmountChange: (value: string) => void;
  onAutoReloadCurrencyChange: (value: string) => void;
  onAutoReloadEnabledChange: (value: boolean) => void;
  onAutoReloadMonthlyCapChange: (value: string) => void;
  onAutoReloadPaymentMethodChange: (value: string) => void;
  onAutoReloadThresholdChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onOpenCheckout: () => void;
  onRefreshAll: () => void;
  onSaveAutoReload: () => void;
  onToggleAutoReloadEditor: () => void;
  onTopUpAmountChange: (value: string) => void;
}

export const BillingTopUpPanel: React.FC<BillingTopUpPanelProps> = ({
  autoReloadAmount,
  autoReloadCurrency,
  autoReloadEnabled,
  autoReloadMessage,
  autoReloadMonthlyCap,
  autoReloadPaymentMethodId,
  autoReloadStatusLabel,
  autoReloadThreshold,
  canOpenCheckout,
  hasPurchasedCredits,
  isEditingAutoReload,
  isPreparingCheckout,
  isRefreshing,
  isUpdatingAutoReload,
  overviewRateBooks,
  paymentMethods,
  selectedCurrency,
  selectedRateBook,
  topUpAmount,
  topUpOptions,
  onAutoReloadAmountChange,
  onAutoReloadCurrencyChange,
  onAutoReloadEnabledChange,
  onAutoReloadMonthlyCapChange,
  onAutoReloadPaymentMethodChange,
  onAutoReloadThresholdChange,
  onCurrencyChange,
  onOpenCheckout,
  onRefreshAll,
  onSaveAutoReload,
  onToggleAutoReloadEditor,
  onTopUpAmountChange,
}) => (
  <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_44px_rgba(28,40,65,0.08)]">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/75">
          Top up
        </p>
        <h3 className="mt-2 text-[1.95rem] font-extrabold leading-[1.05] tracking-tight text-slate-900">
          Purchase credits
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Lumixia quotes credits server-side, applies tax-aware pricing, and
          sends the actual card step through Stripe secure checkout.
        </p>
      </div>
      {selectedRateBook && (
        <StatusPill
          label={`Cap ${formatMinorCurrency(
            selectedRateBook.monthlyUserCapMinor,
            selectedRateBook.currency,
          )}/month`}
          tone="primary"
        />
      )}
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <FieldLabel>
        Amount to add
        <select
          className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-primary/35"
          value={topUpAmount}
          onChange={(event) => onTopUpAmountChange(event.target.value)}
        >
          <option value="">Choose amount</option>
          {topUpOptions.map((option) => (
            <option key={option.minorAmount} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldLabel>

      <FieldLabel>
        Billing currency
        <select
          className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-primary/35"
          value={selectedCurrency}
          onChange={(event) => onCurrencyChange(event.target.value)}
        >
          <option value="">Choose currency</option>
          {overviewRateBooks.map((rateBook) => (
            <option key={rateBook.id} value={rateBook.currency}>
              {rateBook.currency}
            </option>
          ))}
        </select>
      </FieldLabel>
    </div>

    <div className="mt-4 grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 sm:grid-cols-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Minimum
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {selectedRateBook
            ? formatMinorCurrency(
                selectedRateBook.minTopUpMinor,
                selectedRateBook.currency,
              )
            : '--'}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Maximum
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {selectedRateBook
            ? formatMinorCurrency(
                selectedRateBook.maxTopUpMinor,
                selectedRateBook.currency,
              )
            : '--'}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Quote mode
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          Server authoritative
        </p>
      </div>
    </div>

    <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/90 shadow-[0_14px_30px_rgba(28,40,65,0.06)]">
      <button
        className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-primary/[0.03]"
        type="button"
        onClick={onOpenCheckout}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Payment method</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Open secure card checkout and review the total before purchase.
          </p>
        </div>
        <span className="material-symbols-outlined text-slate-400">
          chevron_right
        </span>
      </button>
    </div>

    {hasPurchasedCredits && (
      <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/90 shadow-[0_14px_30px_rgba(28,40,65,0.06)]">
        <div className="flex flex-wrap items-center gap-4 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/12 bg-primary/[0.08] text-primary">
            <span className="material-symbols-outlined text-[18px]">sync</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Auto reload is {autoReloadStatusLabel.toLowerCase()}.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {autoReloadMessage}
            </p>
          </div>
          <button
            className="rounded-[18px] border border-primary/18 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/28 hover:bg-primary/[0.04]"
            type="button"
            onClick={onToggleAutoReloadEditor}
          >
            {isEditingAutoReload ? 'Close' : 'Edit'}
          </button>
        </div>

        {isEditingAutoReload && (
          <div className="border-t border-slate-200 bg-white/80 px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel>
                Threshold (credits)
                <input
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-primary/35"
                  inputMode="numeric"
                  value={autoReloadThreshold}
                  onChange={(event) => onAutoReloadThresholdChange(event.target.value)}
                />
              </FieldLabel>

              <FieldLabel>
                Reload amount
                <input
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-primary/35"
                  inputMode="decimal"
                  value={autoReloadAmount}
                  onChange={(event) => onAutoReloadAmountChange(event.target.value)}
                />
              </FieldLabel>

              <FieldLabel>
                Currency
                <select
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-primary/35"
                  value={autoReloadCurrency}
                  onChange={(event) => onAutoReloadCurrencyChange(event.target.value)}
                >
                  <option value="">Choose currency</option>
                  {overviewRateBooks.map((rateBook) => (
                    <option key={rateBook.id} value={rateBook.currency}>
                      {rateBook.currency}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              <FieldLabel>
                Monthly cap
                <input
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-primary/35"
                  inputMode="decimal"
                  value={autoReloadMonthlyCap}
                  onChange={(event) => onAutoReloadMonthlyCapChange(event.target.value)}
                />
              </FieldLabel>

              <FieldLabel className="sm:col-span-2">
                Saved card for auto reload
                <select
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-primary/35"
                  value={autoReloadPaymentMethodId}
                  onChange={(event) => onAutoReloadPaymentMethodChange(event.target.value)}
                >
                  <option value="">Choose a saved card</option>
                  {paymentMethods.map((paymentMethod) => (
                    <option key={paymentMethod.id} value={paymentMethod.id}>
                      {formatCardLabel(paymentMethod)}
                    </option>
                  ))}
                </select>
              </FieldLabel>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50/90 px-4 py-3">
              <input
                checked={autoReloadEnabled}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                id="auto-reload-enabled"
                type="checkbox"
                onChange={(event) => onAutoReloadEnabledChange(event.target.checked)}
              />
              <label
                className="text-sm leading-relaxed text-slate-600"
                htmlFor="auto-reload-enabled"
              >
                Allow Lumixia to trigger an automatic top-up when the wallet falls
                below the selected threshold.
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-slate-500">
                {paymentMethods.length === 0
                  ? 'A saved card is required before auto reload can be enabled.'
                  : 'Auto reload follows the same server-authoritative pricing and limits shown above.'}
              </p>
              <button
                className="rounded-[18px] bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,90,156,0.18)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUpdatingAutoReload}
                type="button"
                onClick={onSaveAutoReload}
              >
                {isUpdatingAutoReload ? 'Saving...' : 'Save auto reload'}
              </button>
            </div>
          </div>
        )}
      </div>
    )}

    <div className="mt-5 flex flex-wrap gap-3">
      <button
        className="rounded-[20px] bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,90,156,0.18)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canOpenCheckout}
        type="button"
        onClick={onOpenCheckout}
      >
        {isPreparingCheckout ? 'Preparing checkout...' : 'Buy credits'}
      </button>

      <button
        className="rounded-[20px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isRefreshing}
        type="button"
        onClick={onRefreshAll}
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh wallet'}
      </button>
    </div>
  </section>
);
