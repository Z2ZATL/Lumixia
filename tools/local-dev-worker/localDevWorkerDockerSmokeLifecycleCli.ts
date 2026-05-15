import { runLocalDevWorkerDockerSmokeLifecycle } from './localDevWorkerDockerSmokeLifecycle.ts';
import {
  createLocalDevWorkerDockerSmokeLifecycleReport,
  formatLocalDevWorkerDockerSmokeLifecycleJsonSummary,
  formatLocalDevWorkerDockerSmokeLifecycleMarkdown,
} from './localDevWorkerDockerSmokeLifecycleReport.ts';
import { createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureResult } from './localDevWorkerDockerSmokeLifecycleCliFixtures.ts';
import { createLocalDevWorkerDockerSmokeLifecycleCliInput } from './localDevWorkerDockerSmokeLifecycleCliRequests.ts';

interface CliOptions {
  json: boolean;
  dryReportFixture: boolean;
  help: boolean;
}

const HELP_TEXT = `Dremo local-dev Docker smoke lifecycle report

Usage:
  node tools/local-dev-worker/localDevWorkerDockerSmokeLifecycleCli.ts [--json] [--dry-report-fixture]

Options:
  --json                Print the sanitized structured JSON summary.
  --dry-report-fixture  Print a deterministic report without invoking the lifecycle adapters.
  --help                Show this local-dev-only usage text.

Safety:
  This CLI lives outside src/ and accepts no command, image, container name, label, cleanup target, or environment input.
  Real mode composes only the existing reviewed local-dev lifecycle adapters.
`;

function parseCliOptions(args: readonly string[]): {
  options: CliOptions;
  errors: string[];
} {
  const options: CliOptions = {
    json: false,
    dryReportFixture: false,
    help: false,
  };
  const errors: string[] = [];

  for (const arg of args) {
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--dry-report-fixture') {
      options.dryReportFixture = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      errors.push(`Unknown option: ${arg}`);
    }
  }

  return { options, errors };
}

async function createLifecycleResult(options: CliOptions) {
  if (options.dryReportFixture) {
    return createLocalDevWorkerDockerSmokeLifecycleDryReportFixtureResult();
  }

  return runLocalDevWorkerDockerSmokeLifecycle(
    createLocalDevWorkerDockerSmokeLifecycleCliInput(),
  );
}

async function main() {
  const { options, errors } = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  if (errors.length > 0) {
    console.error(errors.join('\n'));
    console.error(HELP_TEXT);
    process.exitCode = 1;
    return;
  }

  const lifecycleResult = await createLifecycleResult(options);
  const report = createLocalDevWorkerDockerSmokeLifecycleReport(lifecycleResult);
  const output = options.json
    ? formatLocalDevWorkerDockerSmokeLifecycleJsonSummary(report)
    : formatLocalDevWorkerDockerSmokeLifecycleMarkdown(report);

  console.log(output.trimEnd());
}

await main();
