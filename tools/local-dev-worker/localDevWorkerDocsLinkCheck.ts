import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface RequiredDocLink {
  file: string;
  links: readonly string[];
}

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const newDocs = [
  'docs/adr/README.md',
  'docs/adr/0001-dremo-local-dev-worker-boundary.md',
  'docs/dremo-code/local-dev-worker-capability-registry.md',
  'docs/dremo-code/local-dev-worker-operator-guide.md',
  'docs/dremo-code/local-dev-worker-troubleshooting.md',
  'docs/dremo-code/local-dev-worker-extension-playbook.md',
] as const;

const requiredDocLinks: readonly RequiredDocLink[] = [
  {
    file: 'docs/dremo-code/README.md',
    links: [
      '../adr/README.md',
      './local-dev-worker-capability-registry.md',
      './local-dev-worker-operator-guide.md',
      './local-dev-worker-troubleshooting.md',
      './local-dev-worker-extension-playbook.md',
    ],
  },
  {
    file: 'tools/local-dev-worker/README.md',
    links: [
      '../../docs/adr/README.md',
      '../../docs/adr/0001-dremo-local-dev-worker-boundary.md',
      '../../docs/dremo-code/local-dev-worker-capability-registry.md',
      '../../docs/dremo-code/local-dev-worker-operator-guide.md',
      '../../docs/dremo-code/local-dev-worker-troubleshooting.md',
      '../../docs/dremo-code/local-dev-worker-extension-playbook.md',
    ],
  },
  {
    file: 'docs/dremo-code/docker-execution-security-checklist.md',
    links: [
      '../adr/README.md',
      '../adr/0001-dremo-local-dev-worker-boundary.md',
      './local-dev-worker-operator-guide.md',
      './local-dev-worker-troubleshooting.md',
      './local-dev-worker-extension-playbook.md',
    ],
  },
  {
    file: 'docs/dremo-code/local-dev-worker-operator-guide.md',
    links: [
      '../adr/README.md',
      '../adr/0001-dremo-local-dev-worker-boundary.md',
      './local-dev-worker-capability-registry.md',
    ],
  },
  {
    file: 'docs/dremo-code/local-dev-worker-extension-playbook.md',
    links: [
      '../adr/README.md',
      '../adr/0001-dremo-local-dev-worker-boundary.md',
      './local-dev-worker-capability-registry.md',
    ],
  },
  {
    file: 'docs/dremo-code/local-dev-worker-troubleshooting.md',
    links: ['./local-dev-worker-capability-registry.md'],
  },
  {
    file: 'docs/adr/0001-dremo-local-dev-worker-boundary.md',
    links: ['../dremo-code/local-dev-worker-capability-registry.md'],
  },
  {
    file: 'docs/dremo-code/sandbox-security.md',
    links: [
      './local-dev-worker-operator-guide.md',
      './local-dev-worker-troubleshooting.md',
      './local-dev-worker-extension-playbook.md',
    ],
  },
  {
    file: 'docs/dremo-code/sandbox-provider-decision.md',
    links: [
      './local-dev-worker-operator-guide.md',
      './local-dev-worker-troubleshooting.md',
      './local-dev-worker-extension-playbook.md',
    ],
  },
  {
    file: 'docs/dremo-code/migration-plan.md',
    links: [
      './local-dev-worker-operator-guide.md',
      './local-dev-worker-troubleshooting.md',
      './local-dev-worker-extension-playbook.md',
    ],
  },
];

async function readRepoFile(relativePath: string) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function checkDocs() {
  const failures: string[] = [];

  for (const doc of newDocs) {
    try {
      const content = await readRepoFile(doc);
      if (content.trim().length === 0) {
        failures.push(`${doc} exists but is empty.`);
      }
    } catch {
      failures.push(`${doc} is missing.`);
    }
  }

  for (const required of requiredDocLinks) {
    let content = '';
    try {
      content = await readRepoFile(required.file);
    } catch {
      failures.push(`${required.file} is missing.`);
      continue;
    }

    for (const link of required.links) {
      if (!content.includes(link)) {
        failures.push(`${required.file} must link to ${link}.`);
      }
    }
  }

  return failures;
}

const failures = await checkDocs();

if (failures.length > 0) {
  console.error('Dremo local-dev worker docs link check failed.');
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log('Dremo local-dev worker docs link check passed.');
}
