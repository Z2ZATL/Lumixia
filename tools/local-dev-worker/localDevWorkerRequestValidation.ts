import type {
  LocalDevWorkerExpectedEnvironment,
  LocalDevWorkerSource,
} from './localDevWorkerContract.ts';

export type LocalDevWorkerValidationSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface LocalDevWorkerDryRunRequest {
  requestId: string;
  command: string;
  args: readonly string[];
  source: LocalDevWorkerSource;
  expectedEnvironment: LocalDevWorkerExpectedEnvironment;
  reason: string;
  createdBy: 'local-dev-worker-dry-run-harness';
}

export interface LocalDevWorkerValidationIssue {
  code: string;
  message: string;
  field: string;
  severity: LocalDevWorkerValidationSeverity;
}

export interface LocalDevWorkerValidationResult {
  valid: boolean;
  issues: LocalDevWorkerValidationIssue[];
}

const MAX_REQUEST_ID_LENGTH = 120;
const MAX_COMMAND_LENGTH = 160;
const MAX_ARG_COUNT = 8;
const MAX_ARG_LENGTH = 80;
const MAX_REASON_LENGTH = 300;

function issue(
  code: string,
  message: string,
  field: string,
  severity: LocalDevWorkerValidationSeverity = 'high',
): LocalDevWorkerValidationIssue {
  return { code, message, field, severity };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasNullByte(value: string) {
  return value.includes('\0');
}

function hasMultiline(value: string) {
  return value.includes('\n') || value.includes('\r');
}

function readString(
  record: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = record[field];
  return typeof value === 'string' ? value : undefined;
}

function validateRequiredString(
  record: Record<string, unknown>,
  field: string,
  maxLength: number,
  issues: LocalDevWorkerValidationIssue[],
) {
  const value = readString(record, field);

  if (typeof value !== 'string') {
    issues.push(issue('invalid_type', `${field} must be a string.`, field));
    return;
  }

  if (value.trim().length === 0) {
    issues.push(
      issue('empty_string', `${field} cannot be empty.`, field, 'medium'),
    );
  }

  if (value.length > maxLength) {
    issues.push(
      issue(
        'string_too_long',
        `${field} exceeds the maximum length of ${maxLength}.`,
        field,
      ),
    );
  }

  if (hasMultiline(value)) {
    issues.push(
      issue('multiline_value', `${field} cannot contain newlines.`, field),
    );
  }

  if (hasNullByte(value)) {
    issues.push(
      issue('null_byte_value', `${field} cannot contain null bytes.`, field),
    );
  }
}

export function validateLocalDevWorkerDryRunRequest(
  request: unknown,
): LocalDevWorkerValidationResult {
  const issues: LocalDevWorkerValidationIssue[] = [];

  if (!isPlainRecord(request)) {
    return {
      valid: false,
      issues: [
        issue(
          'invalid_request',
          'Request must be a non-null plain object.',
          'request',
          'critical',
        ),
      ],
    };
  }

  validateRequiredString(request, 'requestId', MAX_REQUEST_ID_LENGTH, issues);
  validateRequiredString(request, 'command', MAX_COMMAND_LENGTH, issues);
  validateRequiredString(request, 'reason', MAX_REASON_LENGTH, issues);

  const args = request.args;
  if (!Array.isArray(args)) {
    issues.push(issue('invalid_type', 'args must be an array.', 'args'));
  } else {
    if (args.length > MAX_ARG_COUNT) {
      issues.push(
        issue(
          'too_many_args',
          `args cannot contain more than ${MAX_ARG_COUNT} entries.`,
          'args',
        ),
      );
    }

    args.forEach((arg, index) => {
      const field = `args[${index}]`;

      if (typeof arg !== 'string') {
        issues.push(issue('invalid_type', `${field} must be a string.`, field));
        return;
      }

      if (arg.length > MAX_ARG_LENGTH) {
        issues.push(
          issue(
            'arg_too_long',
            `${field} exceeds the maximum length of ${MAX_ARG_LENGTH}.`,
            field,
          ),
        );
      }

      if (hasMultiline(arg)) {
        issues.push(
          issue('multiline_value', `${field} cannot contain newlines.`, field),
        );
      }

      if (hasNullByte(arg)) {
        issues.push(
          issue('null_byte_value', `${field} cannot contain null bytes.`, field),
        );
      }
    });
  }

  if (request.source !== 'dremo-local-dev-sandbox') {
    issues.push(
      issue(
        'invalid_source',
        'source must equal dremo-local-dev-sandbox.',
        'source',
      ),
    );
  }

  if (request.expectedEnvironment !== 'local-dev') {
    issues.push(
      issue(
        'invalid_environment',
        'expectedEnvironment must equal local-dev.',
        'expectedEnvironment',
      ),
    );
  }

  if (request.createdBy !== 'local-dev-worker-dry-run-harness') {
    issues.push(
      issue(
        'invalid_created_by',
        'createdBy must equal local-dev-worker-dry-run-harness.',
        'createdBy',
      ),
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function normalizeLocalDevWorkerDryRunRequest(
  request: LocalDevWorkerDryRunRequest,
): LocalDevWorkerDryRunRequest {
  return {
    requestId: request.requestId.trim(),
    command: request.command.trim(),
    args: request.args.map((arg) => arg.trim()).filter(Boolean),
    source: request.source,
    expectedEnvironment: request.expectedEnvironment,
    reason: request.reason.trim(),
    createdBy: request.createdBy,
  };
}

export function createInvalidLocalDevWorkerDryRunRequest(
  request: unknown,
): LocalDevWorkerDryRunRequest {
  const record = isPlainRecord(request) ? request : {};
  const rawArgs = Array.isArray(record.args) ? record.args : [];

  return {
    requestId: readString(record, 'requestId')?.trim() || 'invalid-request',
    command: readString(record, 'command')?.trim() || '',
    args: rawArgs
      .filter((arg): arg is string => typeof arg === 'string')
      .map((arg) => arg.trim()),
    source:
      record.source === 'dremo-local-dev-sandbox'
        ? record.source
        : 'dremo-local-dev-sandbox',
    expectedEnvironment:
      record.expectedEnvironment === 'local-dev'
        ? record.expectedEnvironment
        : 'local-dev',
    reason: readString(record, 'reason')?.trim() || 'invalid dry-run request',
    createdBy: 'local-dev-worker-dry-run-harness',
  };
}
