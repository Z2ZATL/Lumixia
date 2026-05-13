import { runLocalDevWorkerDryRunSelfCheck } from './localDevWorkerDryRunSelfCheck.ts';

const result = runLocalDevWorkerDryRunSelfCheck();

if (result.passed) {
  console.log(
    `Dremo local-dev worker self-check passed (${result.checkedDryRunFixtures} dry-run fixtures, ${result.checkedExecutionReadinessFixtures} readiness fixtures).`,
  );
} else {
  console.error('Dremo local-dev worker dry-run self-check failed.');
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
}
