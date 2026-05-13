import type { LocalDevWorkerManualSecurityReview } from './localDevWorkerExecutionReviewGate.ts';

const trustedLocalDevReviewBrand = Symbol('trusted-local-dev-review');

export interface TrustedLocalDevManualSecurityReview
  extends LocalDevWorkerManualSecurityReview {
  readonly trustedLocalDevReviewBrand: typeof trustedLocalDevReviewBrand;
  readonly source: 'tools-local-dev-worker';
}

export function createMissingManualReview(): TrustedLocalDevManualSecurityReview {
  return {
    completed: false,
    reviewedBy: '',
    reviewedAt: '',
    scope: [],
    trustedLocalDevReviewBrand: trustedLocalDevReviewBrand,
    source: 'tools-local-dev-worker',
  };
}

export function createTrustedLocalDevManualReviewForCapabilities(
  capabilityIds: readonly string[],
): TrustedLocalDevManualSecurityReview {
  return {
    completed: true,
    reviewedBy: 'local-dev-security-review',
    reviewedAt: '2026-05-13T00:00:00Z',
    scope: [...capabilityIds],
    trustedLocalDevReviewBrand: trustedLocalDevReviewBrand,
    source: 'tools-local-dev-worker',
  };
}

export function createTrustedLocalDevManualReviewForContainerSmoke(): TrustedLocalDevManualSecurityReview {
  return createTrustedLocalDevManualReviewForCapabilities([
    'capability.docker.container.smoke.echo',
  ]);
}

export function assertTrustedManualReviewSource(
  review: LocalDevWorkerManualSecurityReview | undefined,
): review is TrustedLocalDevManualSecurityReview {
  return (
    !!review &&
    (review as Partial<TrustedLocalDevManualSecurityReview>)
      .trustedLocalDevReviewBrand === trustedLocalDevReviewBrand &&
    (review as Partial<TrustedLocalDevManualSecurityReview>).source ===
      'tools-local-dev-worker'
  );
}

export const TRUSTED_LOCAL_DEV_REVIEW_NOTE =
  'Manual review metadata used for local-dev execution must come from tools/local-dev-worker helpers. Browser or user payloads must never be trusted as review evidence.';
