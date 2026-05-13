import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const forbiddenPatterns = [
  { label: 'child_process', pattern: /child_process/ },
  { label: 'Deno.Command', pattern: /Deno\.Command/ },
  { label: 'spawn(', pattern: /\bspawn\s*\(/ },
  { label: 'exec(', pattern: /\bexec\s*\(/ },
  { label: 'execFile(', pattern: /\bexecFile\s*\(/ },
  { label: 'fork(', pattern: /\bfork\s*\(/ },
  { label: 'docker run', pattern: /docker\s+run/i },
  { label: 'docker build', pattern: /docker\s+build/i },
  { label: 'docker compose', pattern: /docker\s+compose/i },
  { label: '/var/run/docker.sock', pattern: /\/var\/run\/docker\.sock/ },
  { label: 'service_role', pattern: /service_role/i },
  { label: 'SUPABASE_SERVICE_ROLE', pattern: /SUPABASE_SERVICE_ROLE/ },
  { label: 'fs.write', pattern: /fs\.write/ },
  { label: 'writeFile', pattern: /writeFile/ },
  { label: 'appendFile', pattern: /appendFile/ },
  { label: 'fetch(', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /XMLHttpRequest/ },
];

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const scannedRoot = path.join(
  repoRoot,
  'src',
  'features',
  'dremo-code',
  'sandbox',
);

async function listTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await listTypeScriptFiles(scannedRoot);
const violations = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(line)) {
        violations.push({
          file: path.relative(repoRoot, file),
          line: index + 1,
          label: forbidden.label,
          text: line.trim(),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error('Dremo browser-bundle sandbox safety scan failed.');
  console.error(JSON.stringify(violations, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    `Dremo browser-bundle sandbox safety scan passed (${files.length} files).`,
  );
}
