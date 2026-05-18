import {
  createLocalDevWorkerDockerSmokeLifecycleReport,
} from './localDevWorkerDockerSmokeLifecycleReport.ts';
import { localDevWorkerDockerSmokeLifecycleReportFixtures } from './localDevWorkerDockerSmokeLifecycleReportFixtures.ts';
import {
  createGoldenCheckTelemetryEvent,
  createLifecycleCompletedTelemetryEvent,
  createPolicyBlockedTelemetryEvent,
  createReportGeneratedTelemetryEvent,
} from './localDevWorkerLifecycleTelemetryEvents.ts';
import type {
  LocalDevWorkerTelemetryEvent,
  LocalDevWorkerTelemetryEventKind,
  LocalDevWorkerTelemetrySafetySummary,
} from './localDevWorkerLifecycleTelemetrySchema.ts';

export interface LocalDevWorkerLifecycleTelemetryFixture {
  name: string;
  event: LocalDevWorkerTelemetryEvent;
  expectedEventKind: LocalDevWorkerTelemetryEventKind;
  expectedRedactedFragments?: readonly string[];
  forbiddenPatterns?: readonly RegExp[];
}

const FORBIDDEN_TELEMETRY_PATTERNS = [
  /\b[A-Z0-9_]*API_KEY\s*=/i,
  /\b[A-Z0-9_]*TOKEN\s*=/i,
  /\b[A-Z0-9_]*SECRET\s*=/i,
  /\b[A-Z]:\\Users\\/i,
  /\/home\//i,
  /\/Users\//i,
  new RegExp(['\\.', 'env'].join(''), 'i'),
  /processEnv/i,
  /rawStdout/i,
  /rawStderr/i,
] as const;

const TELEMETRY_SAFETY: LocalDevWorkerTelemetrySafetySummary = {
  noNewDockerCapabilities: true,
  arbitraryDockerRunAllowed: false,
  arbitraryCleanupAllowed: false,
  imagePullAllowed: false,
  networkAllowed: false,
  mountsAllowed: false,
  workspaceMounted: false,
  dockerSocketMounted: false,
  homeMounted: false,
  shellAllowed: false,
  hostEnvironmentInherited: false,
  productionUiPath: false,
  srcImportPath: false,
};

function reportFixture(name: string) {
  const fixture = localDevWorkerDockerSmokeLifecycleReportFixtures.find(
    (item) => item.name === name,
  );

  if (!fixture) {
    throw new Error(`Missing lifecycle report fixture: ${name}`);
  }

  return fixture;
}

function lifecycleEvent(name: string) {
  const fixture = reportFixture(name);
  return createLifecycleCompletedTelemetryEvent(fixture.result, {
    eventId: `telemetry.fixture.${name}.lifecycle.completed`,
  });
}

function reportEvent(name: string) {
  const fixture = reportFixture(name);
  const report = createLocalDevWorkerDockerSmokeLifecycleReport(fixture.result, {
    reportId: `telemetry.fixture.${name}.report`,
  });

  return createReportGeneratedTelemetryEvent(report, {
    eventId: `telemetry.fixture.${name}.report.generated`,
  });
}

function fixture(input: {
  name: string;
  event: LocalDevWorkerTelemetryEvent;
  expectedEventKind: LocalDevWorkerTelemetryEventKind;
  expectedRedactedFragments?: readonly string[];
  forbiddenPatterns?: readonly RegExp[];
}): LocalDevWorkerLifecycleTelemetryFixture {
  return {
    forbiddenPatterns: input.forbiddenPatterns ?? FORBIDDEN_TELEMETRY_PATTERNS,
    ...input,
  };
}

const tokenLikeReason = [
  'blocked because ',
  'TOKEN',
  '=fixture-token-value ',
  'and ',
  'SECRET',
  '=fixture-secret-value were omitted',
].join('');
const homePathReason = [
  'blocked path ',
  '/home',
  '/operator/repo ',
  'and ',
  'C:',
  '\\Users\\Operator\\repo ',
  'with ',
  '.',
  'env.local',
].join('');

export const localDevWorkerLifecycleTelemetryFixtures = [
  fixture({
    name: 'lifecycle-cleanup-success',
    event: lifecycleEvent('cleanup-success'),
    expectedEventKind: 'docker-smoke.lifecycle.completed',
  }),
  fixture({
    name: 'lifecycle-readiness-unavailable',
    event: lifecycleEvent('readiness-unavailable'),
    expectedEventKind: 'docker-smoke.lifecycle.completed',
  }),
  fixture({
    name: 'lifecycle-policy-blocked',
    event: lifecycleEvent('policy-blocked'),
    expectedEventKind: 'docker-smoke.lifecycle.completed',
  }),
  fixture({
    name: 'lifecycle-smoke-timeout-cleanup-attempted',
    event: lifecycleEvent('smoke-timeout-cleanup-attempted'),
    expectedEventKind: 'docker-smoke.lifecycle.completed',
  }),
  fixture({
    name: 'lifecycle-cleanup-failed-structured',
    event: lifecycleEvent('cleanup-failed-structured'),
    expectedEventKind: 'docker-smoke.lifecycle.completed',
  }),
  fixture({
    name: 'report-generated',
    event: reportEvent('cleanup-success'),
    expectedEventKind: 'docker-smoke.lifecycle.report.generated',
  }),
  fixture({
    name: 'golden-check-passed',
    event: createGoldenCheckTelemetryEvent({
      eventId: 'telemetry.fixture.golden.passed',
      passed: true,
      checkedFiles: [
        'tools/local-dev-worker/golden/docker-smoke-lifecycle.fixture.md',
        'tools/local-dev-worker/golden/docker-smoke-lifecycle.fixture.json',
      ],
    }),
    expectedEventKind: 'docker-smoke.lifecycle.golden.checked',
  }),
  fixture({
    name: 'golden-check-failed-summary',
    event: createGoldenCheckTelemetryEvent({
      eventId: 'telemetry.fixture.golden.failed',
      passed: false,
      checkedFiles: [
        'tools/local-dev-worker/golden/docker-smoke-lifecycle.fixture.md',
      ],
      mismatchSummary: 'First mismatch at line 4: expected outcome cleanup_success.',
      rejectionCodes: ['golden_report_mismatch'],
    }),
    expectedEventKind: 'docker-smoke.lifecycle.golden.checked',
  }),
  fixture({
    name: 'secret-looking-output-is-redacted',
    event: createPolicyBlockedTelemetryEvent({
      eventId: 'telemetry.fixture.policy.secret-redaction',
      lifecycleId: 'telemetry-secret-redaction',
      blockedStage: 'smoke',
      reason: tokenLikeReason,
      rejectionCodes: ['telemetry_secret_like_input_redacted'],
      safety: TELEMETRY_SAFETY,
    }),
    expectedEventKind: 'docker-smoke.lifecycle.policy.blocked',
    expectedRedactedFragments: ['[REDACTED_SECRET]'],
  }),
  fixture({
    name: 'home-path-output-is-redacted',
    event: createPolicyBlockedTelemetryEvent({
      eventId: 'telemetry.fixture.policy.home-redaction',
      lifecycleId: 'telemetry-home-redaction',
      blockedStage: 'smoke',
      reason: homePathReason,
      rejectionCodes: ['telemetry_home_path_input_redacted'],
      safety: TELEMETRY_SAFETY,
    }),
    expectedEventKind: 'docker-smoke.lifecycle.policy.blocked',
    expectedRedactedFragments: [
      '[REDACTED_HOME_PATH]',
      '[REDACTED_ENV_FILE]',
    ],
  }),
] as const satisfies readonly LocalDevWorkerLifecycleTelemetryFixture[];
