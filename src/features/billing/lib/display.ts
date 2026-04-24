import type {
  BillingRateBookSummary,
  CreditLedgerItem,
  PaymentMethodSummary,
} from '../types';

export interface TopUpOption {
  value: string;
  minorAmount: number;
  label: string;
}

const TOP_UP_CANDIDATES_MINOR = [500, 1000, 1500, 2500, 5000, 9000, 10000];

export function formatCreditBalance(balance: number | null) {
  return balance === null ? 'Unavailable' : balance.toLocaleString();
}

export function parseMajorAmountToMinor(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round(parsed * 100);
}

export function toMajorAmount(valueMinor: number) {
  return (valueMinor / 100).toFixed(2);
}

export function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

export function formatCardLabel(paymentMethod: PaymentMethodSummary) {
  const brand = paymentMethod.brand?.toUpperCase() ?? 'CARD';
  const last4 = paymentMethod.last4 ?? '----';
  const expiry = paymentMethod.expMonth && paymentMethod.expYear
    ? ` • ${String(paymentMethod.expMonth).padStart(2, '0')}/${String(
        paymentMethod.expYear,
      ).slice(-2)}`
    : '';

  return `${brand} ending in ${last4}${expiry}`;
}

export function formatWalletStatus(status: string | null) {
  if (status === 'restricted') {
    return 'Restricted';
  }

  if (status === 'closed') {
    return 'Closed';
  }

  if (status === 'active') {
    return 'Active';
  }

  return 'Unavailable';
}

export function buildTopUpOptions(
  rateBook: BillingRateBookSummary | null,
  formatMinorCurrency: (amountMinor: number, currency: string, locale?: string) => string,
): TopUpOption[] {
  if (!rateBook) {
    return [];
  }

  const candidates = new Set<number>([
    rateBook.minTopUpMinor,
    ...TOP_UP_CANDIDATES_MINOR,
    rateBook.maxTopUpMinor,
  ]);

  return Array.from(candidates)
    .filter((minorAmount) => minorAmount >= rateBook.minTopUpMinor && minorAmount <= rateBook.maxTopUpMinor)
    .sort((left, right) => left - right)
    .map((minorAmount) => ({
      value: toMajorAmount(minorAmount),
      minorAmount,
      label: formatMinorCurrency(minorAmount, rateBook.currency),
    }));
}

export function hasQualifyingPurchaseHistory(
  paymentMethods: PaymentMethodSummary[],
  ledgerItems: CreditLedgerItem[],
) {
  return (
    paymentMethods.length > 0 ||
    ledgerItems.some((entry) => entry.entryKind === 'top_up_grant')
  );
}
