import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const browserSandboxForbiddenPatterns = [
  { label: 'tools/local-dev-worker', pattern: /tools\/local-dev-worker/ },
  { label: 'localDevWorkerRunner', pattern: /localDevWorkerRunner/ },
  { label: 'localDevWorkerDryRunAdapter', pattern: /localDevWorkerDryRunAdapter/ },
  { label: 'localDevWorkerContract tools path', pattern: /localDevWorkerContract/ },
  { label: 'child_process', pattern: /child_process/ },
  { label: 'node:child_process', pattern: /node:child_process/ },
  { label: 'Deno.Command', pattern: /Deno\.Command/ },
  { label: 'spawn(', pattern: /\bspawn\s*\(/ },
  { label: 'exec(', pattern: /\bexec\s*\(/ },
  { label: 'execFile(', pattern: /\bexecFile\s*\(/ },
  { label: 'fork(', pattern: /\bfork\s*\(/ },
  { label: 'docker run', pattern: /docker\s+run/i },
  { label: 'docker build', pattern: /docker\s+build/i },
  { label: 'docker compose', pattern: /docker\s+compose/i },
  { label: 'docker pull', pattern: /docker\s+pull\b/i },
  { label: 'docker exec', pattern: /docker\s+exec\b/i },
  { label: 'docker cp', pattern: /docker\s+cp\b/i },
  { label: 'docker login', pattern: /docker\s+login\b/i },
  { label: 'docker inspect', pattern: /docker\s+inspect\b/i },
  { label: 'docker ps', pattern: /docker\s+ps\b/i },
  { label: 'docker rm', pattern: /docker\s+rm\b/i },
  { label: 'docker stop', pattern: /docker\s+stop\b/i },
  { label: 'docker kill', pattern: /docker\s+kill\b/i },
  { label: 'docker prune', pattern: /docker\s+(?:container|system)\s+prune\b/i },
  { label: 'docker image', pattern: /docker\s+image\b/i },
  { label: 'docker container', pattern: /docker\s+container\b/i },
  { label: '/var/run/docker.sock', pattern: /\/var\/run\/docker\.sock/ },
  { label: 'service_role', pattern: /service_role/i },
  { label: 'SUPABASE_SERVICE_ROLE', pattern: /SUPABASE_SERVICE_ROLE/ },
  { label: 'fs.write', pattern: /fs\.write/ },
  { label: 'writeFile', pattern: /writeFile/ },
  { label: 'appendFile', pattern: /appendFile/ },
  { label: 'fetch(', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /XMLHttpRequest/ },
];

const srcBoundaryForbiddenPatterns = [
  { label: 'tools/local-dev-worker', pattern: /tools\/local-dev-worker/ },
  { label: 'localDevWorkerRunner', pattern: /localDevWorkerRunner/ },
  { label: 'localDevWorkerDryRunAdapter', pattern: /localDevWorkerDryRunAdapter/ },
  { label: 'localDevWorkerContract tools path', pattern: /localDevWorkerContract/ },
];

const workerProcessApiForbiddenPatterns = [
  { label: 'child_process', pattern: /child_process/ },
  { label: 'node:child_process', pattern: /node:child_process/ },
  { label: 'spawn(', pattern: /\bspawn\s*\(/ },
  { label: 'exec(', pattern: /\bexec\s*\(/ },
  { label: 'execFile(', pattern: /\bexecFile\s*\(/ },
  { label: 'fork(', pattern: /\bfork\s*\(/ },
  { label: 'Deno.Command', pattern: /Deno\.Command/ },
];

const workerCleanupExecutionForbiddenPatterns = [
  { label: 'docker rm', pattern: /docker\s+rm\b/i },
  { label: 'docker ps', pattern: /docker\s+ps\b/i },
  { label: 'docker inspect', pattern: /docker\s+inspect\b/i },
  { label: 'docker stop', pattern: /docker\s+stop\b/i },
  { label: 'docker kill', pattern: /docker\s+kill\b/i },
  { label: 'docker prune', pattern: /docker\s+(?:container|system)\s+prune\b/i },
  { label: "cleanup rm arg", pattern: /['"]rm['"]/ },
  { label: "cleanup ps arg", pattern: /['"]ps['"]/ },
  { label: "cleanup inspect arg", pattern: /['"]inspect['"]/ },
  { label: "cleanup stop arg", pattern: /['"]stop['"]/ },
  { label: "cleanup kill arg", pattern: /['"]kill['"]/ },
];

const cleanupAdapterForbiddenPatterns = [
  { label: 'docker ps', pattern: /docker\s+ps\b/i },
  { label: 'docker inspect', pattern: /docker\s+inspect\b/i },
  { label: 'docker stop', pattern: /docker\s+stop\b/i },
  { label: 'docker kill', pattern: /docker\s+kill\b/i },
  { label: 'docker prune', pattern: /docker\s+(?:container|system)\s+prune\b/i },
  { label: "cleanup ps arg", pattern: /['"]ps['"]/ },
  { label: "cleanup inspect arg", pattern: /['"]inspect['"]/ },
  { label: "cleanup stop arg", pattern: /['"]stop['"]/ },
  { label: "cleanup kill arg", pattern: /['"]kill['"]/ },
  { label: "cleanup prune arg", pattern: /['"]prune['"]/ },
  { label: "runtime run arg", pattern: /['"]run['"]/ },
  { label: "runtime build arg", pattern: /['"]build['"]/ },
  { label: "runtime compose arg", pattern: /['"]compose['"]/ },
  { label: "runtime exec arg", pattern: /['"]exec['"]/ },
  { label: "runtime cp arg", pattern: /['"]cp['"]/ },
  { label: "runtime pull arg", pattern: /['"]pull['"]/ },
];

const reportFormatterForbiddenPatterns = [
  ...workerProcessApiForbiddenPatterns,
  { label: 'docker run', pattern: /docker\s+run/i },
  { label: 'docker rm', pattern: /docker\s+rm\b/i },
  { label: 'docker ps', pattern: /docker\s+ps\b/i },
  { label: 'docker inspect', pattern: /docker\s+inspect\b/i },
  { label: 'docker prune', pattern: /docker\s+(?:container|system)\s+prune\b/i },
];

const cliWrapperForbiddenPatterns = [
  ...workerProcessApiForbiddenPatterns,
  { label: 'src import', pattern: /from\s+['"].*src\// },
  { label: 'docker run command string', pattern: /docker\s+run/i },
  { label: 'docker rm command string', pattern: /docker\s+rm\b/i },
  { label: 'docker ps command string', pattern: /docker\s+ps\b/i },
  { label: 'docker inspect command string', pattern: /docker\s+inspect\b/i },
  { label: 'docker prune command string', pattern: /docker\s+(?:container|system)\s+prune\b/i },
];

const goldenCheckerForbiddenPatterns = [
  ...workerProcessApiForbiddenPatterns,
  { label: 'src import', pattern: /from\s+['"].*src\// },
  { label: 'docker run command string', pattern: /docker\s+run/i },
  { label: 'docker rm command string', pattern: /docker\s+rm\b/i },
  { label: 'docker ps command string', pattern: /docker\s+ps\b/i },
  { label: 'docker inspect command string', pattern: /docker\s+inspect\b/i },
  { label: 'docker prune command string', pattern: /docker\s+(?:container|system)\s+prune\b/i },
];

const docsCheckerForbiddenPatterns = [
  ...workerProcessApiForbiddenPatterns,
  { label: 'src import', pattern: /from\s+['"].*src\// },
  { label: 'docker run command string', pattern: /docker\s+run/i },
  { label: 'docker rm command string', pattern: /docker\s+rm\b/i },
  { label: 'docker ps command string', pattern: /docker\s+ps\b/i },
  { label: 'docker inspect command string', pattern: /docker\s+inspect\b/i },
  { label: 'docker prune command string', pattern: /docker\s+(?:container|system)\s+prune\b/i },
];

const telemetryFileForbiddenPatterns = [
  ...workerProcessApiForbiddenPatterns,
  { label: 'src import', pattern: /from\s+['"].*src\// },
  { label: 'fetch(', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /XMLHttpRequest/ },
  { label: 'Supabase client import', pattern: /@supabase\/supabase-js/ },
  { label: 'process.env read', pattern: /process\.env/ },
  { label: 'fs.write', pattern: /fs\.write/ },
  { label: 'writeFile', pattern: /writeFile/ },
  { label: 'appendFile', pattern: /appendFile/ },
  { label: 'docker run command string', pattern: /docker\s+run/i },
  { label: 'docker rm command string', pattern: /docker\s+rm\b/i },
  { label: 'docker ps command string', pattern: /docker\s+ps\b/i },
  { label: 'docker inspect command string', pattern: /docker\s+inspect\b/i },
  { label: 'docker prune command string', pattern: /docker\s+(?:container|system)\s+prune\b/i },
];

const workspacePathPolicyForbiddenPatterns = [
  ...workerProcessApiForbiddenPatterns,
  { label: 'src import', pattern: /from\s+['"].*src\// },
  { label: 'node fs import', pattern: /from\s+['"]node:fs/ },
  { label: 'fs import', pattern: /from\s+['"]fs/ },
  { label: 'node path import', pattern: /from\s+['"]node:path/ },
  { label: 'path import', pattern: /from\s+['"]path/ },
  { label: 'readFile', pattern: /\breadFile\b/ },
  { label: 'writeFile', pattern: /\bwriteFile\b/ },
  { label: 'appendFile', pattern: /\bappendFile\b/ },
  { label: 'readdir', pattern: /\breaddir\b/ },
  { label: 'stat(', pattern: /\bstat\s*\(/ },
  { label: 'lstat', pattern: /\blstat\b/ },
  { label: 'realpath', pattern: /\brealpath\b/ },
  { label: 'process.env read', pattern: /process\.env/ },
  { label: 'fetch(', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /XMLHttpRequest/ },
  { label: 'Supabase client import', pattern: /@supabase\/supabase-js/ },
  { label: 'docker run command string', pattern: /docker\s+run/i },
  { label: 'docker rm command string', pattern: /docker\s+rm\b/i },
  { label: 'docker ps command string', pattern: /docker\s+ps\b/i },
  { label: 'docker inspect command string', pattern: /docker\s+inspect\b/i },
  { label: 'docker prune command string', pattern: /docker\s+(?:container|system)\s+prune\b/i },
];

const goldenFixtureForbiddenPatterns = [
  { label: 'API key assignment', pattern: /\b[A-Z0-9_]*API_KEY\s*=/i },
  { label: 'token assignment', pattern: /\b[A-Z0-9_]*TOKEN\s*=/i },
  { label: 'secret assignment', pattern: /\b[A-Z0-9_]*SECRET\s*=/i },
  { label: 'SERVICE_ROLE', pattern: /SERVICE_ROLE/i },
  { label: '.env reference', pattern: /\.env/i },
  { label: 'Windows home path', pattern: /[A-Z]:[\\/]+Users[\\/]/i },
  { label: 'Linux home path', pattern: /\/home\//i },
  { label: 'macOS home path', pattern: /\/Users\//i },
];

const reviewedWorkerProcessApiAllowlist = new Set([
  path.normalize('tools/local-dev-worker/localDevWorkerVersionExecutionAdapter.ts'),
  path.normalize('tools/local-dev-worker/localDevWorkerDockerReadinessAdapter.ts'),
  path.normalize('tools/local-dev-worker/localDevWorkerDockerContainerSmokeAdapter.ts'),
  path.normalize('tools/local-dev-worker/localDevWorkerDockerCleanupAdapter.ts'),
]);

const cleanupAdapterAllowlist = new Set([
  path.normalize('tools/local-dev-worker/localDevWorkerDockerCleanupAdapter.ts'),
]);

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const browserSandboxRoot = path.join(
  repoRoot,
  'src',
  'features',
  'dremo-code',
  'sandbox',
);
const srcRoot = path.join(repoRoot, 'src');
const workerRoot = path.join(repoRoot, 'tools', 'local-dev-worker');

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(fullPath)));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function scanFiles(files, patterns, scope) {
  const violations = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const forbidden of patterns) {
        if (forbidden.pattern.test(line)) {
          violations.push({
            scope,
            file: path.relative(repoRoot, file),
            line: index + 1,
            label: forbidden.label,
            text: line.trim(),
          });
        }
      }
    });
  }

  return violations;
}

const browserSandboxFiles = await listSourceFiles(browserSandboxRoot);
const srcFiles = await listSourceFiles(srcRoot);
const workerFiles = await listSourceFiles(workerRoot);
const lifecycleFiles = workerFiles.filter((file) =>
  path.basename(file).includes('Lifecycle'),
);
const reportFormatterFiles = workerFiles.filter((file) =>
  [
    'localDevWorkerDockerSmokeLifecycleReport.ts',
    'localDevWorkerDockerSmokeLifecycleReportPolicy.ts',
  ].includes(path.basename(file)),
);
const cliWrapperFiles = workerFiles.filter((file) =>
  [
    'localDevWorkerDockerSmokeLifecycleCli.ts',
    'localDevWorkerDockerSmokeLifecycleCliRequests.ts',
    'localDevWorkerDockerSmokeLifecycleCliFixtures.ts',
  ].includes(path.basename(file)),
);
const goldenCheckerFiles = workerFiles.filter((file) =>
  [
    'localDevWorkerGoldenReportCheck.ts',
    'localDevWorkerDockerSmokeLifecycleGoldenCheck.ts',
  ].includes(path.basename(file)),
);
const docsCheckerFiles = workerFiles.filter((file) =>
  ['localDevWorkerDocsLinkCheck.ts'].includes(path.basename(file)),
);
const telemetryFiles = workerFiles.filter((file) =>
  [
    'localDevWorkerLifecycleTelemetrySchema.ts',
    'localDevWorkerLifecycleTelemetryPolicy.ts',
    'localDevWorkerLifecycleTelemetryEvents.ts',
    'localDevWorkerLifecycleTelemetryFixtures.ts',
    'localDevWorkerTelemetryGoldenCheck.ts',
  ].includes(path.basename(file)),
);
const telemetryFixtureFiles = workerFiles.filter((file) =>
  ['localDevWorkerLifecycleTelemetryFixtures.ts'].includes(path.basename(file)),
);
const workspacePathPolicyFiles = workerFiles.filter((file) =>
  [
    'localDevWorkerWorkspacePathPolicy.ts',
    'localDevWorkerWorkspacePathPolicyFixtures.ts',
  ].includes(path.basename(file)),
);
const goldenFixtureFiles = [
  path.join(workerRoot, 'golden', 'docker-smoke-lifecycle.fixture.md'),
  path.join(workerRoot, 'golden', 'docker-smoke-lifecycle.fixture.json'),
  path.join(workerRoot, 'golden', 'local-dev-worker-telemetry.fixture.json'),
];
const workerProcessApiFiles = workerFiles.filter(
  (file) =>
    !reviewedWorkerProcessApiAllowlist.has(path.normalize(path.relative(repoRoot, file))),
);
const reviewedProcessApiFiles = workerFiles.filter((file) =>
  reviewedWorkerProcessApiAllowlist.has(path.normalize(path.relative(repoRoot, file))),
);
const cleanupAdapterFiles = reviewedProcessApiFiles.filter((file) =>
  cleanupAdapterAllowlist.has(path.normalize(path.relative(repoRoot, file))),
);
const reviewedProcessApiFilesWithoutCleanup = reviewedProcessApiFiles.filter(
  (file) =>
    !cleanupAdapterAllowlist.has(path.normalize(path.relative(repoRoot, file))),
);
const violations = [
  ...(await scanFiles(
    browserSandboxFiles,
    browserSandboxForbiddenPatterns,
    'browser-bundled-sandbox',
  )),
  ...(await scanFiles(srcFiles, srcBoundaryForbiddenPatterns, 'src-boundary')),
  ...(await scanFiles(
    workerProcessApiFiles,
    workerProcessApiForbiddenPatterns,
    'worker-process-api-boundary',
  )),
  ...(await scanFiles(
    reviewedProcessApiFilesWithoutCleanup,
    workerCleanupExecutionForbiddenPatterns,
    'worker-cleanup-execution-boundary',
  )),
  ...(await scanFiles(
    cleanupAdapterFiles,
    cleanupAdapterForbiddenPatterns,
    'worker-cleanup-adapter-boundary',
  )),
  ...(await scanFiles(
    reportFormatterFiles,
    reportFormatterForbiddenPatterns,
    'worker-report-formatter-boundary',
  )),
  ...(await scanFiles(
    cliWrapperFiles,
    cliWrapperForbiddenPatterns,
    'worker-lifecycle-cli-boundary',
  )),
  ...(await scanFiles(
    goldenCheckerFiles,
    goldenCheckerForbiddenPatterns,
    'worker-golden-checker-boundary',
  )),
  ...(await scanFiles(
    docsCheckerFiles,
    docsCheckerForbiddenPatterns,
    'worker-docs-checker-boundary',
  )),
  ...(await scanFiles(
    telemetryFiles,
    telemetryFileForbiddenPatterns,
    'worker-telemetry-schema-boundary',
  )),
  ...(await scanFiles(
    workspacePathPolicyFiles,
    workspacePathPolicyForbiddenPatterns,
    'worker-workspace-path-policy-boundary',
  )),
  ...(await scanFiles(
    telemetryFixtureFiles,
    goldenFixtureForbiddenPatterns,
    'worker-telemetry-fixture-safety',
  )),
  ...(await scanFiles(
    goldenFixtureFiles,
    goldenFixtureForbiddenPatterns,
    'worker-golden-fixture-safety',
  )),
];

console.log(
  `Scanned browser sandbox root: ${path.relative(repoRoot, browserSandboxRoot)}`,
);
console.log(`Browser sandbox files scanned: ${browserSandboxFiles.length}`);
console.log(`Scanned src root for worker imports: ${path.relative(repoRoot, srcRoot)}`);
console.log(`Total src files scanned: ${srcFiles.length}`);
console.log(
  `Worker files scanned for process API boundary: ${workerProcessApiFiles.length}`,
);
console.log(
  `Lifecycle files included in process API boundary scan: ${lifecycleFiles.length}`,
);
console.log(
  `Report formatter files scanned for process APIs and new Docker commands: ${reportFormatterFiles.length}`,
);
console.log(
  `Lifecycle CLI wrapper files scanned for process APIs and new Docker command strings: ${cliWrapperFiles.length}`,
);
console.log(
  `Golden checker files scanned for process APIs and new Docker command strings: ${goldenCheckerFiles.length}`,
);
console.log(
  `Docs checker files scanned for process APIs, src imports, and new Docker command strings: ${docsCheckerFiles.length}`,
);
console.log(
  `Telemetry schema files scanned for process APIs, network calls, file writes, src imports, and new Docker command strings: ${telemetryFiles.length}`,
);
console.log(
  `Workspace path policy files scanned for process APIs, filesystem access, src imports, env reads, network calls, and Docker command strings: ${workspacePathPolicyFiles.length}`,
);
console.log(
  `Telemetry fixture files scanned for unsafe static text: ${telemetryFixtureFiles.length}`,
);
console.log(`Golden fixture files scanned for unsafe static text: ${goldenFixtureFiles.length}`);
console.log(
  `Reviewed process adapter files scanned for cleanup commands: ${reviewedProcessApiFilesWithoutCleanup.length}`,
);
console.log(
  `Reviewed cleanup adapter files scanned for arbitrary cleanup/runtime commands: ${cleanupAdapterFiles.length}`,
);
console.log(
  'Allowed process API file: tools/local-dev-worker/localDevWorkerVersionExecutionAdapter.ts',
);
console.log(
  'Allowed process API file: tools/local-dev-worker/localDevWorkerDockerReadinessAdapter.ts',
);
console.log(
  'Allowed process API file: tools/local-dev-worker/localDevWorkerDockerContainerSmokeAdapter.ts',
);
console.log(
  'Allowed process API file: tools/local-dev-worker/localDevWorkerDockerCleanupAdapter.ts',
);
console.log(`Violations found: ${violations.length}`);

if (violations.length > 0) {
  console.error('Dremo browser-bundle sandbox safety scan failed.');
  console.error(JSON.stringify(violations, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    'Dremo browser-bundle sandbox and worker-boundary safety scan passed.',
  );
}
