import { sanitizeWorkerOutput } from './localDevWorkerOutputSanitizer.ts';
import {
  LOCAL_DEV_WORKER_LIFECYCLE_TELEMETRY_SCHEMA_VERSION,
  type LocalDevWorkerTelemetryEvent,
} from './localDevWorkerLifecycleTelemetrySchema.ts';

export interface LocalDevWorkerTelemetryValidationIssue {
  code: string;
  message: string;
  field: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface LocalDevWorkerTelemetryValidationResult {
  safe: boolean;
  issues: LocalDevWorkerTelemetryValidationIssue[];
}

const TELEMETRY_STRING_BYTE_CAP = 2048;
const SECRET_LIKE_PATTERNS = [
  { code: 'api_key_marker', pattern: /\b[A-Z0-9_]*API_KEY\s*=/i },
  { code: 'token_marker', pattern: /\b[A-Z0-9_]*TOKEN\s*=/i },
  { code: 'secret_marker', pattern: /\b[A-Z0-9_]*SECRET\s*=/i },
  { code: 'service_role_marker', pattern: /\b(?:SUPABASE_)?SERVICE_ROLE/i },
  {
    code: 'jwt_like_marker',
    pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  },
];
const HOST_PATH_PATTERNS = [
  { code: 'windows_home_path', pattern: /\b[A-Z]:\\Users\\/i },
  { code: 'linux_home_path', pattern: /\/home\//i },
  { code: 'macos_home_path', pattern: /\/Users\//i },
  { code: 'env_file_marker', pattern: /\.env/i },
];
const DENIED_FIELD_NAMES = new Set([
  'rawStdout',
  'rawStderr',
  'rawOutput',
  'userPrompt',
  'prompt',
  'processEnv',
  'envVars',
  'environmentValues',
  'absoluteWorkspacePath',
  'workspacePath',
  'homePath',
  'repoPath',
  'serviceRoleKey',
  'apiKey',
  'token',
  'secret',
]);

function issue(
  code: string,
  message: string,
  field: string,
  severity: LocalDevWorkerTelemetryValidationIssue['severity'] = 'high',
): LocalDevWorkerTelemetryValidationIssue {
  return {
    code,
    message,
    field,
    severity,
  };
}

function walkTelemetryValue(
  value: unknown,
  field: string,
  issues: LocalDevWorkerTelemetryValidationIssue[],
) {
  if (typeof value === 'string') {
    for (const forbidden of [...SECRET_LIKE_PATTERNS, ...HOST_PATH_PATTERNS]) {
      if (forbidden.pattern.test(value)) {
        issues.push(
          issue(
            forbidden.code,
            'Telemetry string contains a denied secret-like marker, host path, or .env reference.',
            field,
            'critical',
          ),
        );
      }
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkTelemetryValue(item, `${field}[${index}]`, issues),
    );
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childField = field ? `${field}.${key}` : key;
    if (DENIED_FIELD_NAMES.has(key)) {
      issues.push(
        issue(
          'denied_field_present',
          `Telemetry must not include denied field "${key}".`,
          childField,
          'critical',
        ),
      );
    }
    walkTelemetryValue(child, childField, issues);
  }
}

export function sanitizeLocalDevWorkerTelemetryString(value: string) {
  return sanitizeWorkerOutput(value, TELEMETRY_STRING_BYTE_CAP).value.replace(
    /\b[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET)[A-Z0-9_]*=\[REDACTED_SECRET\]/gi,
    '[REDACTED_SECRET]',
  );
}

export function validateLocalDevWorkerTelemetryEvent(
  event: LocalDevWorkerTelemetryEvent,
): LocalDevWorkerTelemetryValidationResult {
  const issues: LocalDevWorkerTelemetryValidationIssue[] = [];

  if (event.schemaVersion !== LOCAL_DEV_WORKER_LIFECYCLE_TELEMETRY_SCHEMA_VERSION) {
    issues.push(
      issue(
        'schema_version_mismatch',
        'Telemetry schema version must match the local-dev worker telemetry schema.',
        'schemaVersion',
        'critical',
      ),
    );
  }

  if (event.localDevOnly !== true) {
    issues.push(
      issue('local_dev_only_required', 'Telemetry must be local-dev only.', 'localDevOnly'),
    );
  }

  if (event.source !== 'tools/local-dev-worker') {
    issues.push(
      issue(
        'source_not_worker',
        'Telemetry source must remain tools/local-dev-worker.',
        'source',
      ),
    );
  }

  if (event.productionUiPath !== false || event.srcImportPath !== false) {
    issues.push(
      issue(
        'browser_or_production_path_denied',
        'Telemetry must not model a browser, src, or production UI path.',
        'productionUiPath/srcImportPath',
        'critical',
      ),
    );
  }

  if (
    event.containsSecrets !== false ||
    event.containsHostPaths !== false ||
    event.containsUserPrompt !== false ||
    event.containsEnvironment !== false
  ) {
    issues.push(
      issue(
        'sensitive_content_flag_denied',
        'Telemetry sensitive-content flags must remain false.',
        'contains*',
        'critical',
      ),
    );
  }

  walkTelemetryValue(event, '', issues);

  return {
    safe: issues.length === 0,
    issues,
  };
}

export function assertLocalDevWorkerTelemetrySafe<T extends LocalDevWorkerTelemetryEvent>(
  event: T,
): T {
  const result = validateLocalDevWorkerTelemetryEvent(event);

  if (!result.safe) {
    throw new Error(
      `Unsafe local-dev worker telemetry event: ${result.issues
        .map((item) => `${item.code}:${item.field}`)
        .join(', ')}`,
    );
  }

  return event;
}
