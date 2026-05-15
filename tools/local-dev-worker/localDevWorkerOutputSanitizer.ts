export interface LocalDevWorkerSanitizedOutput {
  value: string;
  truncated: boolean;
  originalBytes: number;
  sanitizedBytes: number;
}

export interface LocalDevWorkerSanitizedOutputs {
  stdout: LocalDevWorkerSanitizedOutput;
  stderr: LocalDevWorkerSanitizedOutput;
}

const DEFAULT_OUTPUT_BYTE_CAP = 4096;
const SECRET_ASSIGNMENT_PATTERN =
  /\b([A-Z0-9_]*(?:API_KEY|TOKEN|SECRET)[A-Z0-9_]*)\s*=\s*([^\s"'`]+)/gi;
const SERVICE_ROLE_PATTERN = /\b(?:SUPABASE_)?SERVICE_ROLE(?:_KEY)?\b(?:\s*=\s*[^\s"'`]+)?/gi;
const JWT_LIKE_PATTERN = /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g;
const WINDOWS_HOME_PATH_PATTERN = /\b[A-Z]:\\Users\\[^\s"'`]+/gi;
const POSIX_HOME_PATH_PATTERN = /(?:^|[\s"'`])(?:\/home|\/Users)\/[^\s"'`]+/g;
const ENV_FILE_PATTERN = /\.env(?:\.[A-Za-z0-9_-]+)?/g;

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function redactSensitiveText(value: string) {
  return value
    .replace(SECRET_ASSIGNMENT_PATTERN, '$1=[REDACTED_SECRET]')
    .replace(SERVICE_ROLE_PATTERN, '[REDACTED_SERVICE_ROLE]')
    .replace(JWT_LIKE_PATTERN, '[REDACTED_JWT]')
    .replace(WINDOWS_HOME_PATH_PATTERN, '[REDACTED_HOME_PATH]')
    .replace(POSIX_HOME_PATH_PATTERN, (match) => {
      const leading = match.match(/^[\s"'`]/)?.[0] ?? '';

      return `${leading}[REDACTED_HOME_PATH]`;
    })
    .replace(ENV_FILE_PATTERN, '[REDACTED_ENV_FILE]');
}

function truncateToBytes(value: string, maxBytes: number) {
  const byteCap = Math.max(0, maxBytes);
  const buffer = Buffer.from(value, 'utf8');

  if (buffer.byteLength <= byteCap) {
    return {
      value,
      truncated: false,
    };
  }

  return {
    value: buffer.subarray(0, byteCap).toString('utf8'),
    truncated: true,
  };
}

export function sanitizeWorkerOutput(
  value: string,
  maxBytes = DEFAULT_OUTPUT_BYTE_CAP,
): LocalDevWorkerSanitizedOutput {
  const normalized = normalizeLineEndings(String(value ?? ''));
  const redacted = redactSensitiveText(normalized);
  const truncated = truncateToBytes(redacted, maxBytes);

  return {
    value: truncated.value,
    truncated: truncated.truncated,
    originalBytes: Buffer.from(normalized, 'utf8').byteLength,
    sanitizedBytes: Buffer.from(truncated.value, 'utf8').byteLength,
  };
}

export function sanitizeWorkerOutputs(input: {
  stdout: string;
  stderr: string;
  maxStdoutBytes?: number;
  maxStderrBytes?: number;
}): LocalDevWorkerSanitizedOutputs {
  return {
    stdout: sanitizeWorkerOutput(
      input.stdout,
      input.maxStdoutBytes ?? DEFAULT_OUTPUT_BYTE_CAP,
    ),
    stderr: sanitizeWorkerOutput(
      input.stderr,
      input.maxStderrBytes ?? DEFAULT_OUTPUT_BYTE_CAP,
    ),
  };
}
