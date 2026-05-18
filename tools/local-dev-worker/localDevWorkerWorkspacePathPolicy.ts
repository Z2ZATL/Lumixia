export type LocalDevWorkerWorkspacePathDecision =
  | 'allowed_synthetic_readonly_path'
  | 'blocked_absolute_path'
  | 'blocked_parent_traversal'
  | 'blocked_home_path'
  | 'blocked_env_file'
  | 'blocked_secret_file'
  | 'blocked_node_modules'
  | 'blocked_git_directory'
  | 'blocked_symlink'
  | 'blocked_write_attempt'
  | 'blocked_execute_attempt'
  | 'blocked_null_byte'
  | 'blocked_shell_metacharacter'
  | 'blocked_empty_path'
  | 'blocked_unknown_path';

export interface LocalDevWorkerWorkspacePathPolicyInput {
  syntheticWorkspaceRoot: '/workspace';
  requestedPath: string;
  accessMode: 'read' | 'write' | 'execute';
  followsSymlinks: boolean;
  source: 'synthetic-fixture-only';
}

export interface LocalDevWorkerWorkspacePathPolicyResult {
  ok: boolean;
  noFilesystemAccess: true;
  decision: LocalDevWorkerWorkspacePathDecision;
  normalizedSyntheticPath: string | null;
  rejectionCodes: readonly string[];
  safetyMetadata: {
    syntheticOnly: true;
    realWorkspaceRead: false;
    realWorkspaceWrite: false;
    executionAllowed: false;
    symlinkFollowAllowed: false;
    homePathAllowed: false;
    envFileAllowed: false;
    secretsAllowed: false;
  };
}

const SYNTHETIC_WORKSPACE_ROOT = '/workspace' as const;

const SHELL_METACHARACTER_PATTERN = /[;&|`$<>]/;
const WINDOWS_DRIVE_PATH_PATTERN = /^[A-Za-z]:\//;
const WINDOWS_HOME_PATH_PATTERN = /^[A-Za-z]:\/Users\//i;
const POSIX_HOME_PATH_PATTERN = /^\/(?:home|Users)\//i;
const SECRET_SEGMENT_PATTERN =
  /(?:secret|service[-_]?role|token|credential|private[-_]?key|id_rsa)/i;

function createWorkspacePathPolicyResult(
  decision: LocalDevWorkerWorkspacePathDecision,
  rejectionCodes: readonly string[],
  normalizedSyntheticPath: string | null,
): LocalDevWorkerWorkspacePathPolicyResult {
  return {
    ok: decision === 'allowed_synthetic_readonly_path',
    noFilesystemAccess: true,
    decision,
    normalizedSyntheticPath,
    rejectionCodes,
    safetyMetadata: {
      syntheticOnly: true,
      realWorkspaceRead: false,
      realWorkspaceWrite: false,
      executionAllowed: false,
      symlinkFollowAllowed: false,
      homePathAllowed: false,
      envFileAllowed: false,
      secretsAllowed: false,
    },
  };
}

function normalizeSlashDirection(input: string) {
  return input.replace(/\\/g, '/');
}

function normalizeSyntheticSegments(pathValue: string) {
  return pathValue
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.');
}

function normalizeSyntheticPathFromSegments(segments: readonly string[]) {
  return `${SYNTHETIC_WORKSPACE_ROOT}/${segments.join('/')}`;
}

export function evaluateLocalDevWorkerWorkspacePathPolicy(
  input: LocalDevWorkerWorkspacePathPolicyInput,
): LocalDevWorkerWorkspacePathPolicyResult {
  if (
    input.syntheticWorkspaceRoot !== SYNTHETIC_WORKSPACE_ROOT ||
    input.source !== 'synthetic-fixture-only'
  ) {
    return createWorkspacePathPolicyResult(
      'blocked_unknown_path',
      ['workspace_policy_source_not_synthetic_fixture'],
      null,
    );
  }

  const requestedPath = input.requestedPath.trim();

  if (requestedPath.length === 0) {
    return createWorkspacePathPolicyResult(
      'blocked_empty_path',
      ['workspace_empty_path_denied'],
      null,
    );
  }

  if (requestedPath.includes('\0')) {
    return createWorkspacePathPolicyResult(
      'blocked_null_byte',
      ['workspace_null_byte_denied'],
      null,
    );
  }

  if (SHELL_METACHARACTER_PATTERN.test(requestedPath)) {
    return createWorkspacePathPolicyResult(
      'blocked_shell_metacharacter',
      ['workspace_shell_metacharacter_denied'],
      null,
    );
  }

  const slashNormalizedPath = normalizeSlashDirection(requestedPath);

  if (
    WINDOWS_HOME_PATH_PATTERN.test(slashNormalizedPath) ||
    POSIX_HOME_PATH_PATTERN.test(slashNormalizedPath)
  ) {
    return createWorkspacePathPolicyResult(
      'blocked_home_path',
      ['workspace_home_path_denied'],
      null,
    );
  }

  if (
    WINDOWS_DRIVE_PATH_PATTERN.test(slashNormalizedPath) ||
    (slashNormalizedPath.startsWith('/') &&
      !slashNormalizedPath.startsWith(`${SYNTHETIC_WORKSPACE_ROOT}/`) &&
      slashNormalizedPath !== SYNTHETIC_WORKSPACE_ROOT)
  ) {
    return createWorkspacePathPolicyResult(
      'blocked_absolute_path',
      ['workspace_absolute_path_denied'],
      null,
    );
  }

  const withoutSyntheticRoot =
    slashNormalizedPath === SYNTHETIC_WORKSPACE_ROOT
      ? ''
      : slashNormalizedPath.startsWith(`${SYNTHETIC_WORKSPACE_ROOT}/`)
        ? slashNormalizedPath.slice(`${SYNTHETIC_WORKSPACE_ROOT}/`.length)
        : slashNormalizedPath;

  const rawSegments = withoutSyntheticRoot.split('/');

  if (rawSegments.some((segment) => segment === '..')) {
    return createWorkspacePathPolicyResult(
      'blocked_parent_traversal',
      ['workspace_parent_traversal_denied'],
      null,
    );
  }

  const segments = normalizeSyntheticSegments(withoutSyntheticRoot);

  if (segments.length === 0) {
    return createWorkspacePathPolicyResult(
      'blocked_empty_path',
      ['workspace_empty_path_denied'],
      null,
    );
  }

  if (input.accessMode === 'write') {
    return createWorkspacePathPolicyResult(
      'blocked_write_attempt',
      ['workspace_write_denied'],
      normalizeSyntheticPathFromSegments(segments),
    );
  }

  if (input.accessMode === 'execute') {
    return createWorkspacePathPolicyResult(
      'blocked_execute_attempt',
      ['workspace_execute_denied'],
      normalizeSyntheticPathFromSegments(segments),
    );
  }

  if (input.followsSymlinks) {
    return createWorkspacePathPolicyResult(
      'blocked_symlink',
      ['workspace_symlink_follow_denied'],
      normalizeSyntheticPathFromSegments(segments),
    );
  }

  if (segments.some((segment) => segment === '.git')) {
    return createWorkspacePathPolicyResult(
      'blocked_git_directory',
      ['workspace_git_directory_denied'],
      normalizeSyntheticPathFromSegments(segments),
    );
  }

  if (segments.some((segment) => segment === 'node_modules')) {
    return createWorkspacePathPolicyResult(
      'blocked_node_modules',
      ['workspace_node_modules_denied'],
      normalizeSyntheticPathFromSegments(segments),
    );
  }

  if (segments.some((segment) => segment === '.env' || segment.startsWith('.env.'))) {
    return createWorkspacePathPolicyResult(
      'blocked_env_file',
      ['workspace_env_file_denied'],
      normalizeSyntheticPathFromSegments(segments),
    );
  }

  if (segments.some((segment) => SECRET_SEGMENT_PATTERN.test(segment))) {
    return createWorkspacePathPolicyResult(
      'blocked_secret_file',
      ['workspace_secret_file_denied'],
      normalizeSyntheticPathFromSegments(segments),
    );
  }

  return createWorkspacePathPolicyResult(
    'allowed_synthetic_readonly_path',
    [],
    normalizeSyntheticPathFromSegments(segments),
  );
}
