import { runLocalDevWorkerDryRunSelfCheckAsync } from './localDevWorkerDryRunSelfCheck.ts';

const result = await runLocalDevWorkerDryRunSelfCheckAsync();

if (result.passed) {
  console.log(
    `Dremo local-dev worker self-check passed (${result.checkedDryRunFixtures} dry-run fixtures, ${result.checkedExecutionReadinessFixtures} readiness fixtures, ${result.checkedVersionExecutionFixtures} version execution fixtures).`,
  );
} else {
  console.error('Dremo local-dev worker dry-run self-check failed.');
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
}
