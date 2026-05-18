import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareGoldenReportOutput,
  type LocalDevWorkerGoldenReportComparison,
  validateGoldenReportSafety,
} from './localDevWorkerGoldenReportCheck.ts';
import { localDevWorkerLifecycleTelemetryFixtures } from './localDevWorkerLifecycleTelemetryFixtures.ts';
import { validateLocalDevWorkerTelemetryEvent } from './localDevWorkerLifecycleTelemetryPolicy.ts';

export interface LocalDevWorkerTelemetryGoldenFixtureDocument {
  kind: 'local-dev-worker-telemetry-golden-fixture';
  localDevOnly: true;
  fixtureCount: number;
  fixtures: readonly {
    name: string;
    expectedEventKind: string;
    event: unknown;
  }[];
}

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const telemetryGoldenPath = path.join(
  repoRoot,
  'tools',
  'local-dev-worker',
  'golden',
  'local-dev-worker-telemetry.fixture.json',
);

function formatComparisonFailure(
  comparison: LocalDevWorkerGoldenReportComparison,
) {
  const lines = [
    `${comparison.actualName} does not match ${comparison.expectedName}.`,
  ];

  if (comparison.mismatchSummary) {
    lines.push(comparison.mismatchSummary);
  }

  for (const issue of comparison.safetyIssues) {
    lines.push(`Safety issue ${issue.code}: ${issue.message}`);
  }

  return lines.join('\n');
}

export function createLocalDevWorkerTelemetryGoldenDocument(): LocalDevWorkerTelemetryGoldenFixtureDocument {
  return {
    kind: 'local-dev-worker-telemetry-golden-fixture',
    localDevOnly: true,
    fixtureCount: localDevWorkerLifecycleTelemetryFixtures.length,
    fixtures: localDevWorkerLifecycleTelemetryFixtures.map((fixture) => ({
      name: fixture.name,
      expectedEventKind: fixture.expectedEventKind,
      event: fixture.event,
    })),
  };
}

export function createLocalDevWorkerTelemetryGoldenJson() {
  return `${JSON.stringify(createLocalDevWorkerTelemetryGoldenDocument(), null, 2)}\n`;
}

export function validateLocalDevWorkerTelemetryGoldenJson(value: string) {
  const safetyIssues = validateGoldenReportSafety(value);
  const parsed = JSON.parse(value) as LocalDevWorkerTelemetryGoldenFixtureDocument;

  for (const fixture of parsed.fixtures) {
    const validation = validateLocalDevWorkerTelemetryEvent(
      fixture.event as Parameters<typeof validateLocalDevWorkerTelemetryEvent>[0],
    );

    for (const issue of validation.issues) {
      safetyIssues.push({
        code: issue.code,
        message: issue.message,
      });
    }
  }

  return safetyIssues;
}

export function compareLocalDevWorkerTelemetryGoldenJson(input: {
  expected: string;
  actual: string;
}) {
  JSON.parse(input.expected);
  JSON.parse(input.actual);

  return compareGoldenReportOutput({
    expectedName: 'committed telemetry golden fixture',
    actualName: 'generated telemetry golden fixture',
    expected: input.expected,
    actual: input.actual,
  });
}

async function compareGoldenFile() {
  const expected = await readFile(telemetryGoldenPath, 'utf8');
  const actual = createLocalDevWorkerTelemetryGoldenJson();
  const comparison = compareGoldenReportOutput({
    expectedName: path.relative(repoRoot, telemetryGoldenPath),
    actualName: 'generated telemetry fixture JSON',
    expected,
    actual,
  });
  const safetyIssues = [
    ...validateLocalDevWorkerTelemetryGoldenJson(expected),
    ...validateLocalDevWorkerTelemetryGoldenJson(actual),
  ];

  return {
    ...comparison,
    matches: comparison.matches && safetyIssues.length === 0,
    safetyIssues: [...comparison.safetyIssues, ...safetyIssues],
  };
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const comparison = await compareGoldenFile();

  if (!comparison.matches) {
    console.error('Dremo local-dev telemetry golden check failed.');
    console.error(formatComparisonFailure(comparison));
    process.exitCode = 1;
  } else {
    console.log('Dremo local-dev telemetry golden check passed.');
  }
}
