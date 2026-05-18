import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureJsonSummary,
  createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureMarkdown,
} from './localDevWorkerDockerSmokeLifecycleCliFixtures.ts';
import {
  compareGoldenReportOutput,
  type LocalDevWorkerGoldenReportComparison,
} from './localDevWorkerGoldenReportCheck.ts';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const goldenRoot = path.join(repoRoot, 'tools', 'local-dev-worker', 'golden');
const markdownGoldenPath = path.join(
  goldenRoot,
  'docker-smoke-lifecycle.fixture.md',
);
const jsonGoldenPath = path.join(
  goldenRoot,
  'docker-smoke-lifecycle.fixture.json',
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

async function compareGoldenFiles() {
  const expectedMarkdown = await readFile(markdownGoldenPath, 'utf8');
  const expectedJson = await readFile(jsonGoldenPath, 'utf8');
  const actualMarkdown =
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureMarkdown();
  const actualJson =
    createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureJsonSummary();

  JSON.parse(actualJson);
  JSON.parse(expectedJson);

  return [
    compareGoldenReportOutput({
      expectedName: path.relative(repoRoot, markdownGoldenPath),
      actualName: 'generated Markdown fixture report',
      expected: expectedMarkdown,
      actual: actualMarkdown,
    }),
    compareGoldenReportOutput({
      expectedName: path.relative(repoRoot, jsonGoldenPath),
      actualName: 'generated JSON fixture report',
      expected: expectedJson,
      actual: actualJson,
    }),
  ];
}

const comparisons = await compareGoldenFiles();
const failures = comparisons.filter((comparison) => !comparison.matches);

if (failures.length > 0) {
  console.error('Dremo Docker smoke lifecycle golden report check failed.');
  console.error(failures.map(formatComparisonFailure).join('\n\n'));
  process.exitCode = 1;
} else {
  console.log(
    'Dremo Docker smoke lifecycle golden report check passed (Markdown and JSON).',
  );
}
