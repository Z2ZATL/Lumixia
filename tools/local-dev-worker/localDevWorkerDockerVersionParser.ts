export interface LocalDevWorkerDockerVersionParseResult {
  parsed: boolean;
  dockerCliVersion?: string;
  dockerServerVersion?: string;
  rejectionCodes: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readVersion(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const version = value.Version;

  return typeof version === 'string' && version.trim().length > 0
    ? version.trim()
    : undefined;
}

export function parseLocalDevWorkerDockerVersionJson(
  stdout: string,
): LocalDevWorkerDockerVersionParseResult {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return {
      parsed: false,
      rejectionCodes: ['docker_readiness_empty_stdout'],
    };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (!isRecord(parsed)) {
      return {
        parsed: false,
        rejectionCodes: ['docker_readiness_invalid_json_shape'],
      };
    }

    return {
      parsed: true,
      dockerCliVersion: readVersion(parsed.Client),
      dockerServerVersion: readVersion(parsed.Server),
      rejectionCodes: [],
    };
  } catch {
    return {
      parsed: false,
      rejectionCodes: ['docker_readiness_invalid_json'],
    };
  }
}

export function isLikelyDockerDaemonUnavailable(input: {
  stderr: string;
  stdout: string;
  exitCode: number | null;
}) {
  const text = `${input.stderr}\n${input.stdout}`.toLowerCase();

  return (
    input.exitCode !== 0 &&
    (text.includes('cannot connect to the docker daemon') ||
      text.includes('docker daemon') ||
      text.includes('docker engine') ||
      text.includes('error during connect') ||
      text.includes('is the docker daemon running') ||
      text.includes('open //./pipe/docker') ||
      text.includes('open \\\\.\\pipe\\docker'))
  );
}

