import { runLocalDevWorkerDryRunSelfCheck } from './localDevWorkerDryRunSelfCheck.ts';

const result = runLocalDevWorkerDryRunSelfCheck();

if (result.passed) {
  console.log(
    `Dremo local-dev worker dry-run self-check passed (${result.checkedFixtures} fixtures).`,
  );
} else {
  console.error('Dremo local-dev worker dry-run self-check failed.');
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
}
