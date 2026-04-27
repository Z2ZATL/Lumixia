import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppSession } from '../../../app/AppSessionContext';
import {
  createCheckoutSession,
  fetchBillingOverview,
  formatMinorCurrency,
  updateAutoReloadPolicy,
} from '../lib/billing';
import {
  buildTopUpOptions,
  formatCreditBalance,
  formatWalletStatus,
  hasQualifyingPurchaseHistory,
  parseMajorAmountToMinor,
  toMajorAmount,
} from '../lib/display';
import type { BillingOverview } from '../types';
import { BillingActivityPanel } from './BillingActivityPanel';
import { BillingTopUpPanel } from './BillingTopUpPanel';
import { StatusPill } from './BillingPrimitives';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AUTO_RELOAD_CONSENT_VERSION = 'lumixia-auto-reload-v1';

export const CreditsModal: React.FC<CreditsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const {
    creditAccountStatus,
    creditBalance,
    creditError,
    creditState,
    displayName,
    refreshCredits,
  } = useAppSession();
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPreparingCheckout, setIsPreparingCheckout] = useState(false);
  const [isUpdatingAutoReload, setIsUpdatingAutoReload] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isEditingAutoReload, setIsEditingAutoReload] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState('150');
  const [autoReloadAmount, setAutoReloadAmount] = useState('25.00');
  const [autoReloadMonthlyCap, setAutoReloadMonthlyCap] = useState('100.00');
  const [autoReloadCurrency, setAutoReloadCurrency] = useState('');
  const [autoReloadPaymentMethodId, setAutoReloadPaymentMethodId] = useState('');

  const loadOverview = async (silent = false) => {
    if (!silent) {
      setIsLoadingOverview(true);
    }

    try {
      const nextOverview = await fetchBillingOverview();
      setOverview(nextOverview);
      setOverviewError(null);
    } catch (error) {
      setOverview(null);
      setOverviewError(
        error instanceof Error
          ? error.message
          : 'We could not load the Lumixia billing center.',
      );
    } finally {
      if (!silent) {
        setIsLoadingOverview(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadOverview();
  }, [isOpen]);

  useEffect(() => {
    if (!overview) {
      return;
    }

    const defaultRateBook = overview.rateBooks[0] ?? null;
    const activeRateBook =
      overview.rateBooks.find((rateBook) => rateBook.currency === selectedCurrency) ??
      defaultRateBook;
    const defaultCard =
      overview.paymentMethods.find((paymentMethod) => paymentMethod.isDefault) ??
      overview.paymentMethods[0] ??
      null;
    const policy = overview.autoReloadPolicy;
    const topUpOptions = buildTopUpOptions(activeRateBook, formatMinorCurrency);

    if (
      !selectedCurrency ||
      !overview.rateBooks.some((rateBook) => rateBook.currency === selectedCurrency)
    ) {
      setSelectedCurrency(defaultRateBook?.currency ?? '');
    }

    if (!topUpAmount || !topUpOptions.some((option) => option.value === topUpAmount)) {
      setTopUpAmount(topUpOptions[0]?.value ?? toMajorAmount(activeRateBook?.minTopUpMinor ?? 0));
    }

    setAutoReloadEnabled(policy?.enabled ?? false);
    setAutoReloadThreshold(String(policy?.thresholdCredits ?? 150));
    setAutoReloadAmount(toMajorAmount(policy?.reloadAmountMinor ?? 2500));
    setAutoReloadMonthlyCap(toMajorAmount(policy?.monthlyCapMinor ?? 10000));
    setAutoReloadCurrency(policy?.currency ?? defaultRateBook?.currency ?? '');
    setAutoReloadPaymentMethodId(
      policy?.defaultPaymentMethodId ?? defaultCard?.id ?? '',
    );
  }, [overview, selectedCurrency, topUpAmount]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const animationFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusRoot = modalRef.current;

      if (!focusRoot) {
        return;
      }

      const focusableElements = Array.from(
        focusRoot.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !focusRoot.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);

    try {
      await refreshCredits();
      await loadOverview(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const checkoutStatus = currentUrl.searchParams.get('billing_checkout');

    if (!checkoutStatus) {
      return;
    }

    currentUrl.searchParams.delete('billing_checkout');
    currentUrl.searchParams.delete('session_id');
    window.history.replaceState({}, '', currentUrl.toString());

    if (checkoutStatus === 'success') {
      setPaymentMessage(
        'Stripe checkout completed. Lumixia is refreshing the wallet and credit activity now.',
      );
      void handleRefreshAll();
      return;
    }

    if (checkoutStatus === 'cancelled') {
      setPaymentMessage(
        'Stripe checkout was cancelled before payment was completed.',
      );
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const currentSummary =
    overview?.summary ?? {
      userId: '',
      availableBalance: creditBalance,
      state: creditState,
      status: creditAccountStatus,
      restrictedReason: null,
      updatedAt: null,
    };
  const selectedRateBook =
    overview?.rateBooks.find((rateBook) => rateBook.currency === selectedCurrency) ??
    overview?.rateBooks[0] ??
    null;
  const topUpOptions = buildTopUpOptions(selectedRateBook, formatMinorCurrency);
  const paymentMethods = overview?.paymentMethods ?? [];
  const ledgerItems = overview?.recentLedger.items ?? [];
  const autoReloadPolicy = overview?.autoReloadPolicy;
  const quoteAmountMinor = parseMajorAmountToMinor(topUpAmount);
  const walletTone =
    currentSummary.status === 'restricted'
      ? 'amber'
      : currentSummary.status === 'closed'
        ? 'red'
        : currentSummary.state === 'ready'
          ? 'emerald'
          : 'slate';
  const canOpenCheckout =
    !!selectedCurrency &&
    quoteAmountMinor > 0 &&
    !isPreparingCheckout;
  const autoReloadStatusLabel =
    autoReloadPolicy?.enabled || autoReloadEnabled ? 'Enabled' : 'Disabled';
  const autoReloadMessage =
    autoReloadPolicy?.enabled || autoReloadEnabled
      ? 'Auto reload is enabled. Lumixia can restore credits when the balance drops below your threshold.'
      : 'Auto reload is disabled. Enable auto reload to avoid interruptions when credits run low.';
  const hasPurchasedCredits = hasQualifyingPurchaseHistory(paymentMethods, ledgerItems);

  const handleOpenCheckoutSheet = async () => {
    if (!selectedCurrency) {
      setQuoteError('Choose a billing currency before continuing.');
      return;
    }

    if (quoteAmountMinor <= 0) {
      setQuoteError('Choose a valid top-up amount before continuing.');
      return;
    }

    setIsPreparingCheckout(true);
    setQuoteError(null);
    setPaymentMessage(null);

    try {
      const checkoutSession = await createCheckoutSession({
        amountMinor: quoteAmountMinor,
        currency: selectedCurrency,
        idempotencyKey: crypto.randomUUID(),
        returnUrl: window.location.href,
      });

      if (!checkoutSession.url) {
        throw new Error('Stripe checkout did not return a redirect URL.');
      }

      window.location.assign(checkoutSession.url);
    } catch (error) {
      setQuoteError(
        error instanceof Error
          ? error.message
          : 'Stripe checkout could not be prepared.',
      );
    } finally {
      setIsPreparingCheckout(false);
    }
  };

  const handleSaveAutoReload = async () => {
    if (autoReloadEnabled && !autoReloadPaymentMethodId) {
      setPaymentMessage('Choose a saved card before enabling auto reload.');
      return;
    }

    setIsUpdatingAutoReload(true);
    setPaymentMessage(null);

    try {
      await updateAutoReloadPolicy({
        enabled: autoReloadEnabled,
        thresholdCredits: Math.max(Number(autoReloadThreshold || 0), 0),
        reloadAmountMinor: parseMajorAmountToMinor(autoReloadAmount),
        currency: autoReloadCurrency,
        monthlyCapMinor: parseMajorAmountToMinor(autoReloadMonthlyCap),
        defaultPaymentMethodId: autoReloadPaymentMethodId || null,
        consentTextVersion: AUTO_RELOAD_CONSENT_VERSION,
      });
      await loadOverview(true);
      setIsEditingAutoReload(false);
      setPaymentMessage('Auto reload settings are up to date.');
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : 'Auto reload could not be updated.',
      );
    } finally {
      setIsUpdatingAutoReload(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] bg-slate-950/40 backdrop-blur-md">
      <div className="flex min-h-dvh items-center justify-center p-3 sm:p-4">
        <div
          ref={modalRef}
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          aria-modal="true"
          className="relative flex max-h-[90dvh] w-[min(960px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.28)]"
          role="dialog"
        >
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(161,201,255,0.24),transparent_40%),linear-gradient(135deg,#0d2747_0%,#123b68_55%,#0f5a96_100%)] px-5 pb-10 pt-6 text-white sm:px-6 sm:pb-12 sm:pt-6">
            <div className="absolute inset-x-0 bottom-0 h-px bg-white/15" />
            <button
              ref={closeButtonRef}
              aria-label="Close credits and billing center"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
              type="button"
              onClick={onClose}
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="max-w-[660px] pr-14">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/65">
                Lumixia Billing
              </p>
              <h2
                id={titleId}
                className="mt-3 text-[2.1rem] font-extrabold leading-[1.02] tracking-tight sm:text-[2.35rem]"
              >
                Credits & Billing Center
              </h2>
              <p
                id={descriptionId}
                className="mt-4 max-w-[40rem] text-[15px] leading-7 text-white/76"
              >
                Top up your wallet and review recent credit activity in one place.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill
                  label={`${formatCreditBalance(currentSummary.availableBalance)} Credits`}
                  tone="slate"
                />
                <StatusPill label={formatWalletStatus(currentSummary.status)} tone={walletTone} />
                <StatusPill label={displayName || 'Lumixia Member'} tone="slate" />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fbfcfe_0%,#f5f8fb_100%)] px-4 py-5 sm:px-5 sm:py-6">
            <div className="space-y-4">
              {(overviewError || creditError) && (
                <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {overviewError ?? creditError}
                </div>
              )}

              {paymentMessage && (
                <div className="rounded-[24px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-slate-700">
                  {paymentMessage}
                </div>
              )}

              {quoteError && (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {quoteError}
                </div>
              )}

              {currentSummary.status === 'restricted' && (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
                  This wallet is currently restricted. New agent executions and
                  automatic reloads are blocked until the account is brought back
                  into good standing.
                </div>
              )}

              {isLoadingOverview && !overview ? (
                <div className="rounded-[28px] border border-white/70 bg-white/85 p-10 text-center shadow-[0_18px_44px_rgba(28,40,65,0.08)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/75">
                    Billing
                  </p>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
                    Preparing your billing center
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Loading wallet, quote settings, and recent credit activity...
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-[minmax(0,1.24fr)_minmax(300px,0.76fr)]">
                  <div>
                    <BillingTopUpPanel
                      autoReloadAmount={autoReloadAmount}
                      autoReloadCurrency={autoReloadCurrency}
                      autoReloadEnabled={autoReloadEnabled}
                      autoReloadMessage={autoReloadMessage}
                      autoReloadMonthlyCap={autoReloadMonthlyCap}
                      autoReloadPaymentMethodId={autoReloadPaymentMethodId}
                      autoReloadStatusLabel={autoReloadStatusLabel}
                      autoReloadThreshold={autoReloadThreshold}
                      canOpenCheckout={canOpenCheckout}
                      hasPurchasedCredits={hasPurchasedCredits}
                      isEditingAutoReload={isEditingAutoReload}
                      isPreparingCheckout={isPreparingCheckout}
                      isRefreshing={isRefreshing}
                      isUpdatingAutoReload={isUpdatingAutoReload}
                      overviewRateBooks={overview?.rateBooks ?? []}
                      paymentMethods={paymentMethods}
                      selectedCurrency={selectedCurrency}
                      selectedRateBook={selectedRateBook}
                      topUpAmount={topUpAmount}
                      topUpOptions={topUpOptions}
                      onAutoReloadAmountChange={setAutoReloadAmount}
                      onAutoReloadCurrencyChange={setAutoReloadCurrency}
                      onAutoReloadEnabledChange={setAutoReloadEnabled}
                      onAutoReloadMonthlyCapChange={setAutoReloadMonthlyCap}
                      onAutoReloadPaymentMethodChange={setAutoReloadPaymentMethodId}
                      onAutoReloadThresholdChange={setAutoReloadThreshold}
                      onCurrencyChange={(value) => {
                        setSelectedCurrency(value);
                        setQuoteError(null);
                        setPaymentMessage(null);
                      }}
                      onOpenCheckout={() => {
                        void handleOpenCheckoutSheet();
                      }}
                      onRefreshAll={() => {
                        void handleRefreshAll();
                      }}
                      onSaveAutoReload={() => {
                        void handleSaveAutoReload();
                      }}
                      onToggleAutoReloadEditor={() =>
                        setIsEditingAutoReload((current) => !current)
                      }
                      onTopUpAmountChange={(value) => {
                        setTopUpAmount(value);
                        setQuoteError(null);
                        setPaymentMessage(null);
                      }}
                    />
                  </div>

                  <div className="md:pt-1">
                    <BillingActivityPanel ledgerItems={ledgerItems} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
