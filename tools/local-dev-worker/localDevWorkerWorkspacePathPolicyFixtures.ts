import {
  type LocalDevWorkerWorkspacePathDecision,
  type LocalDevWorkerWorkspacePathPolicyInput,
} from './localDevWorkerWorkspacePathPolicy.ts';

export interface LocalDevWorkerWorkspacePathPolicyFixture {
  name: string;
  input: LocalDevWorkerWorkspacePathPolicyInput;
  expectedOk: boolean;
  expectedDecision: LocalDevWorkerWorkspacePathDecision;
  expectedNormalizedSyntheticPath: string | null;
  expectedRejectionCodes: readonly string[];
}

function createWorkspacePathPolicyInput(
  requestedPath: string,
  overrides: Partial<
    Pick<
      LocalDevWorkerWorkspacePathPolicyInput,
      'accessMode' | 'followsSymlinks'
    >
  > = {},
): LocalDevWorkerWorkspacePathPolicyInput {
  return {
    syntheticWorkspaceRoot: '/workspace',
    requestedPath,
    accessMode: overrides.accessMode ?? 'read',
    followsSymlinks: overrides.followsSymlinks ?? false,
    source: 'synthetic-fixture-only',
  };
}

const allowedFixture = (
  name: string,
  requestedPath: string,
  expectedNormalizedSyntheticPath: string,
): LocalDevWorkerWorkspacePathPolicyFixture => ({
  name,
  input: createWorkspacePathPolicyInput(requestedPath),
  expectedOk: true,
  expectedDecision: 'allowed_synthetic_readonly_path',
  expectedNormalizedSyntheticPath,
  expectedRejectionCodes: [],
});

const blockedFixture = (
  name: string,
  requestedPath: string,
  expectedDecision: LocalDevWorkerWorkspacePathDecision,
  expectedRejectionCodes: readonly string[],
  overrides: Partial<
    Pick<
      LocalDevWorkerWorkspacePathPolicyInput,
      'accessMode' | 'followsSymlinks'
    >
  > = {},
  expectedNormalizedSyntheticPath: string | null = null,
): LocalDevWorkerWorkspacePathPolicyFixture => ({
  name,
  input: createWorkspacePathPolicyInput(requestedPath, overrides),
  expectedOk: false,
  expectedDecision,
  expectedNormalizedSyntheticPath,
  expectedRejectionCodes,
});

export const localDevWorkerWorkspacePathPolicyFixtures: readonly LocalDevWorkerWorkspacePathPolicyFixture[] =
  [
    allowedFixture(
      'allow src index synthetic read',
      'src/index.ts',
      '/workspace/src/index.ts',
    ),
    allowedFixture(
      'allow package json synthetic read',
      'package.json',
      '/workspace/package.json',
    ),
    allowedFixture(
      'allow README synthetic read',
      'README.md',
      '/workspace/README.md',
    ),
    allowedFixture(
      'allow docs guide synthetic read',
      'docs/guide.md',
      '/workspace/docs/guide.md',
    ),
    allowedFixture(
      'allow tests example synthetic read',
      'tests/example.test.ts',
      '/workspace/tests/example.test.ts',
    ),
    blockedFixture(
      'block parent traversal',
      '../package.json',
      'blocked_parent_traversal',
      ['workspace_parent_traversal_denied'],
    ),
    blockedFixture(
      'block absolute POSIX host path',
      '/etc/passwd',
      'blocked_absolute_path',
      ['workspace_absolute_path_denied'],
    ),
    blockedFixture(
      'block Windows home path fixture',
      'C:\\Users\\LENOVO\\.ssh\\id_rsa',
      'blocked_home_path',
      ['workspace_home_path_denied'],
    ),
    blockedFixture(
      'block Linux home path fixture',
      '/home/user/.ssh/id_rsa',
      'blocked_home_path',
      ['workspace_home_path_denied'],
    ),
    blockedFixture(
      'block macOS home path fixture',
      '/Users/user/.ssh/id_rsa',
      'blocked_home_path',
      ['workspace_home_path_denied'],
    ),
    blockedFixture(
      'block dotenv file',
      '.env',
      'blocked_env_file',
      ['workspace_env_file_denied'],
      {},
      '/workspace/.env',
    ),
    blockedFixture(
      'block dotenv local file',
      '.env.local',
      'blocked_env_file',
      ['workspace_env_file_denied'],
      {},
      '/workspace/.env.local',
    ),
    blockedFixture(
      'block traversal toward dotenv',
      'src/../.env',
      'blocked_parent_traversal',
      ['workspace_parent_traversal_denied'],
    ),
    blockedFixture(
      'block git directory config',
      '.git/config',
      'blocked_git_directory',
      ['workspace_git_directory_denied'],
      {},
      '/workspace/.git/config',
    ),
    blockedFixture(
      'block node modules path',
      'node_modules/package/index.js',
      'blocked_node_modules',
      ['workspace_node_modules_denied'],
      {},
      '/workspace/node_modules/package/index.js',
    ),
    blockedFixture(
      'block secrets json',
      'secrets.json',
      'blocked_secret_file',
      ['workspace_secret_file_denied'],
      {},
      '/workspace/secrets.json',
    ),
    blockedFixture(
      'block service role key text',
      'service-role-key.txt',
      'blocked_secret_file',
      ['workspace_secret_file_denied'],
      {},
      '/workspace/service-role-key.txt',
    ),
    blockedFixture(
      'block symlink follow marker',
      'src/link-to-secret',
      'blocked_symlink',
      ['workspace_symlink_follow_denied'],
      { followsSymlinks: true },
      '/workspace/src/link-to-secret',
    ),
    blockedFixture(
      'block write access',
      'src/index.ts',
      'blocked_write_attempt',
      ['workspace_write_denied'],
      { accessMode: 'write' },
      '/workspace/src/index.ts',
    ),
    blockedFixture(
      'block execute access',
      'scripts/build.js',
      'blocked_execute_attempt',
      ['workspace_execute_denied'],
      { accessMode: 'execute' },
      '/workspace/scripts/build.js',
    ),
    blockedFixture(
      'block null byte path',
      'src/index.ts\0.png',
      'blocked_null_byte',
      ['workspace_null_byte_denied'],
    ),
    blockedFixture(
      'block shell metacharacter path',
      'src/index.ts; rm -rf /',
      'blocked_shell_metacharacter',
      ['workspace_shell_metacharacter_denied'],
    ),
    blockedFixture(
      'block empty path',
      '',
      'blocked_empty_path',
      ['workspace_empty_path_denied'],
    ),
    blockedFixture(
      'block whitespace-only path',
      '   ',
      'blocked_empty_path',
      ['workspace_empty_path_denied'],
    ),
  ] as const;
