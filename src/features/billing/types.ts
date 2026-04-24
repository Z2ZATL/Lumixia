import type { CreditAccountStatus, CreditState } from '../auth/lib/credits';

export type PaymentMethodStatus = 'active' | 'revoked';
export type CreditTopUpOrderStatus =
  | 'initiated'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'reversed';
export type CreditAutoReloadStatus =
  | 'inactive'
  | 'active'
  | 'paused'
  | 'disabled'
  | 'needs_payment_method';

export interface CreditBalanceSummary {
  userId: string;
  availableBalance: number | null;
  state: CreditState;
  status: CreditAccountStatus | null;
  restrictedReason: string | null;
  updatedAt: string | null;
}

export interface BillingRateBookSummary {
  id: string;
  currency: string;
  minTopUpMinor: number;
  maxTopUpMinor: number;
  monthlyUserCapMinor: number;
}

export interface PaymentMethodSummary {
  id: string;
  stripePaymentMethodId: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  reusableForAutoReload: boolean;
  status: PaymentMethodStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTopUpOrder {
  id: string;
  status: CreditTopUpOrderStatus;
  triggerSource: 'manual' | 'auto_reload';
  currency: string;
  quotedCredits: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  stripePaymentIntentId: string | null;
  stripeSetupIntentId: string | null;
  stripeChargeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutSessionSummary {
  sessionId: string;
  url: string;
  quotedCredits: number;
  currency: string;
  amountMinor: number;
}

export interface CreditAutoReloadPolicy {
  enabled: boolean;
  status: CreditAutoReloadStatus;
  thresholdCredits: number;
  reloadAmountMinor: number;
  currency: string | null;
  monthlyCapMinor: number;
  monthToDateMinor: number;
  monthWindowStartedAt: string;
  defaultPaymentMethodId: string | null;
  consentTextVersion: string | null;
  consentedAt: string | null;
  lastAttemptAt: string | null;
  failureCount: number;
  updatedAt: string;
}

export interface CreditLedgerItem {
  id: string;
  entryKind: string;
  delta: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface CreditLedgerPage {
  items: CreditLedgerItem[];
}

export interface BillingOverview {
  summary: CreditBalanceSummary;
  rateBooks: BillingRateBookSummary[];
  paymentMethods: PaymentMethodSummary[];
  autoReloadPolicy: CreditAutoReloadPolicy | null;
  recentLedger: CreditLedgerPage;
}
