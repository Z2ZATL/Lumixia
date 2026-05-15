import type {
  LocalDevWorkerDockerSmokeLifecycleResult,
  LocalDevWorkerDockerSmokeLifecycleSafetyMetadata,
} from './localDevWorkerDockerSmokeLifecycle.ts';
import { sanitizeWorkerOutputs } from './localDevWorkerOutputSanitizer.ts';
import { evaluateLocalDevWorkerDockerSmokeLifecycleReportPolicy } from './localDevWorkerDockerSmokeLifecycleReportPolicy.ts';

export interface LocalDevWorkerDockerSmokeLifecycleReport {
  reportId: string;
  kind: 'local-dev-docker-smoke-lifecycle-report';
  localDevOnly: true;
  lifecycleId: string;
  ok: boolean;
  outcome: string;
  stageSummary: readonly string[];
  readinessSummary: {
    readinessState: string;
    daemonReachable: boolean;
    rejectionCodes: readonly string[];
  };
  smokeSummary?: {
    outcome: string;
    executionAttempted: boolean;
    containerStarted: boolean;
    cleanupRisk: string;
    stdoutPreview: string;
    stderrPreview: string;
    rejectionCodes: readonly string[];
  };
  cleanupSummary?: {
    outcome: string;
    executionAttempted: boolean;
    cleanupExecuted: boolean;
    stdoutPreview: string;
    stderrPreview: string;
    rejectionCodes: readonly string[];
  };
  safetySummary: LocalDevWorkerDockerSmokeLifecycleSafetyMetadata;
  warnings: readonly string[];
  nextRecommendedAction: string;
}

const REPORT_KIND = 'local-dev-docker-smoke-lifecycle-report';
const REPORT_PREVIEW_BYTE_CAP = 4096;

function uniqueCodes(codes: readonly string[]) {
  return [...new Set(codes)];
}

function stableReportId(result: LocalDevWorkerDockerSmokeLifecycleResult) {
  return `${REPORT_KIND}.${result.lifecycleId}.${result.outcome}`;
}

function sanitizedPreviews(input: {
  stdout: string;
  stderr: string;
}) {
  const sanitized = sanitizeWorkerOutputs({
    stdout: input.stdout,
    stderr: input.stderr,
    maxStdoutBytes: REPORT_PREVIEW_BYTE_CAP,
    maxStderrBytes: REPORT_PREVIEW_BYTE_CAP,
  });

  return {
    stdoutPreview: sanitized.stdout.value,
    stderrPreview: sanitized.stderr.value,
  };
}

function markdownLine(label: string, value: string | boolean | number) {
  return `- ${label}: ${String(value)}`;
}

export function createLocalDevWorkerDockerSmokeLifecycleReport(
  result: LocalDevWorkerDockerSmokeLifecycleResult,
  options: {
    reportId?: string;
  } = {},
): LocalDevWorkerDockerSmokeLifecycleReport {
  const policy = evaluateLocalDevWorkerDockerSmokeLifecycleReportPolicy(
    result.outcome,
  );
  const smokePreviews = result.smoke
    ? sanitizedPreviews({
        stdout: result.smoke.sanitizedStdout,
        stderr: result.smoke.sanitizedStderr,
      })
    : undefined;
  const cleanupPreviews = result.cleanup
    ? sanitizedPreviews({
        stdout: result.cleanup.sanitizedStdout,
        stderr: result.cleanup.sanitizedStderr,
      })
    : undefined;

  return {
    reportId: options.reportId ?? stableReportId(result),
    kind: REPORT_KIND,
    localDevOnly: true,
    lifecycleId: result.lifecycleId,
    ok: result.ok,
    outcome: result.outcome,
    stageSummary: [...result.stages],
    readinessSummary: {
      readinessState: result.readiness.readinessState,
      daemonReachable: result.readiness.daemonReachable,
      rejectionCodes: uniqueCodes(result.readiness.rejectionCodes),
    },
    smokeSummary: result.smoke
      ? {
          outcome: result.smoke.outcome,
          executionAttempted: result.smoke.executionAttempted,
          containerStarted: result.smoke.containerStarted,
          cleanupRisk: result.smoke.cleanupRisk,
          stdoutPreview: smokePreviews?.stdoutPreview ?? '',
          stderrPreview: smokePreviews?.stderrPreview ?? '',
          rejectionCodes: uniqueCodes(result.smoke.rejectionCodes),
        }
      : undefined,
    cleanupSummary: result.cleanup
      ? {
          outcome: result.cleanup.outcome,
          executionAttempted: result.cleanup.executionAttempted,
          cleanupExecuted: result.cleanup.cleanupExecuted,
          stdoutPreview: cleanupPreviews?.stdoutPreview ?? '',
          stderrPreview: cleanupPreviews?.stderrPreview ?? '',
          rejectionCodes: uniqueCodes(result.cleanup.rejectionCodes),
        }
      : undefined,
    safetySummary: {
      ...result.safetyMetadata,
    },
    warnings: policy.warnings,
    nextRecommendedAction: policy.nextRecommendedAction,
  };
}

export function formatLocalDevWorkerDockerSmokeLifecycleMarkdown(
  report: LocalDevWorkerDockerSmokeLifecycleReport,
) {
  const lines = [
    '# Dremo Local-dev Docker Smoke Lifecycle Report',
    '',
    markdownLine('Report ID', report.reportId),
    markdownLine('Lifecycle ID', report.lifecycleId),
    markdownLine('Local dev only', report.localDevOnly),
    markdownLine('OK', report.ok),
    markdownLine('Outcome', report.outcome),
    markdownLine('Stages', report.stageSummary.join(' -> ')),
    '',
    '## Readiness',
    markdownLine('State', report.readinessSummary.readinessState),
    markdownLine('Daemon reachable', report.readinessSummary.daemonReachable),
    markdownLine(
      'Rejection codes',
      report.readinessSummary.rejectionCodes.join(', ') || 'none',
    ),
  ];

  if (report.smokeSummary) {
    lines.push(
      '',
      '## Smoke',
      markdownLine('Outcome', report.smokeSummary.outcome),
      markdownLine(
        'Execution attempted',
        report.smokeSummary.executionAttempted,
      ),
      markdownLine('Container started', report.smokeSummary.containerStarted),
      markdownLine('Cleanup risk', report.smokeSummary.cleanupRisk),
      markdownLine('Stdout preview', report.smokeSummary.stdoutPreview || '(empty)'),
      markdownLine('Stderr preview', report.smokeSummary.stderrPreview || '(empty)'),
      markdownLine(
        'Rejection codes',
        report.smokeSummary.rejectionCodes.join(', ') || 'none',
      ),
    );
  }

  if (report.cleanupSummary) {
    lines.push(
      '',
      '## Cleanup',
      markdownLine('Outcome', report.cleanupSummary.outcome),
      markdownLine(
        'Execution attempted',
        report.cleanupSummary.executionAttempted,
      ),
      markdownLine('Cleanup executed', report.cleanupSummary.cleanupExecuted),
      markdownLine(
        'Stdout preview',
        report.cleanupSummary.stdoutPreview || '(empty)',
      ),
      markdownLine(
        'Stderr preview',
        report.cleanupSummary.stderrPreview || '(empty)',
      ),
      markdownLine(
        'Rejection codes',
        report.cleanupSummary.rejectionCodes.join(', ') || 'none',
      ),
    );
  }

  lines.push(
    '',
    '## Safety',
    markdownLine(
      'No new Docker capabilities',
      report.safetySummary.noNewDockerCapabilities,
    ),
    markdownLine(
      'Arbitrary container execution allowed',
      report.safetySummary.arbitraryDockerRunAllowed,
    ),
    markdownLine(
      'Arbitrary cleanup allowed',
      report.safetySummary.arbitraryCleanupAllowed,
    ),
    markdownLine('Image pull allowed', report.safetySummary.imagePullAllowed),
    markdownLine('Network allowed', report.safetySummary.networkAllowed),
    markdownLine('Mounts allowed', report.safetySummary.mountsAllowed),
    markdownLine('Workspace mounted', report.safetySummary.workspaceMounted),
    markdownLine('Docker socket mounted', report.safetySummary.dockerSocketMounted),
    markdownLine('Home mounted', report.safetySummary.homeMounted),
    markdownLine('Shell allowed', report.safetySummary.shellAllowed),
    markdownLine(
      'Host environment inherited',
      report.safetySummary.hostEnvironmentInherited,
    ),
    markdownLine('Production UI path', report.safetySummary.productionUiPath),
    markdownLine('Src import path', report.safetySummary.srcImportPath),
    '',
    '## Warnings',
    ...(report.warnings.length > 0
      ? report.warnings.map((warning) => `- ${warning}`)
      : ['- none']),
    '',
    '## Next Recommended Action',
    report.nextRecommendedAction,
  );

  return `${lines.join('\n')}\n`;
}

export function formatLocalDevWorkerDockerSmokeLifecycleJsonSummary(
  report: LocalDevWorkerDockerSmokeLifecycleReport,
) {
  return `${JSON.stringify(report, null, 2)}\n`;
}
