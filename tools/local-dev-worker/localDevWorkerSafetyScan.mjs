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
