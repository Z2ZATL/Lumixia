export interface LocalDevWorkerGoldenReportSafetyIssue {
  code: string;
  message: string;
}

export interface LocalDevWorkerGoldenReportComparison {
  matches: boolean;
  expectedName: string;
  actualName: string;
  mismatchSummary: string;
  safetyIssues: LocalDevWorkerGoldenReportSafetyIssue[];
}

const FORBIDDEN_REPORT_PATTERNS = [
  {
    code: 'api_key_assignment',
    pattern: /\b[A-Z0-9_]*API_KEY\s*=/i,
    message: 'Report output must not contain API key assignments.',
  },
  {
    code: 'token_assignment',
    pattern: /\b[A-Z0-9_]*TOKEN\s*=/i,
    message: 'Report output must not contain token assignments.',
  },
  {
    code: 'secret_assignment',
    pattern: /\b[A-Z0-9_]*SECRET\s*=/i,
    message: 'Report output must not contain secret assignments.',
  },
  {
    code: 'service_role_marker',
    pattern: /SERVICE_ROLE/i,
    message: 'Report output must not contain service role markers.',
  },
  {
    code: 'env_file_marker',
    pattern: /\.env/i,
    message: 'Report output must not contain .env references.',
  },
  {
    code: 'windows_home_path',
    pattern: /[A-Z]:[\\/]+Users[\\/]/i,
    message: 'Report output must not contain Windows home paths.',
  },
  {
    code: 'linux_home_path',
    pattern: /\/home\//i,
    message: 'Report output must not contain Linux home paths.',
  },
  {
    code: 'mac_home_path',
    pattern: /\/Users\//i,
    message: 'Report output must not contain macOS home paths.',
  },
] as const;

export function normalizeGoldenReportLineEndings(value: string) {
  return value.replace(/\r\n?/g, '\n');
}

export function validateGoldenReportSafety(
  value: string,
): LocalDevWorkerGoldenReportSafetyIssue[] {
  return FORBIDDEN_REPORT_PATTERNS.filter((forbidden) =>
    forbidden.pattern.test(value),
  ).map((forbidden) => ({
    code: forbidden.code,
    message: forbidden.message,
  }));
}

export function createGoldenReportMismatchSummary(input: {
  expected: string;
  actual: string;
  contextLines?: number;
}) {
  const expectedLines = input.expected.split('\n');
  const actualLines = input.actual.split('\n');
  const maxLines = Math.max(expectedLines.length, actualLines.length);
  const mismatchIndex = Array.from({ length: maxLines }).findIndex(
    (_, index) => expectedLines[index] !== actualLines[index],
  );

  if (mismatchIndex === -1) {
    return '';
  }

  const contextLines = input.contextLines ?? 2;
  const start = Math.max(0, mismatchIndex - contextLines);
  const end = Math.min(maxLines, mismatchIndex + contextLines + 1);
  const lines = [
    `First mismatch at line ${mismatchIndex + 1}.`,
    `Expected length: ${input.expected.length} chars.`,
    `Actual length: ${input.actual.length} chars.`,
  ];

  for (let index = start; index < end; index += 1) {
    lines.push(
      `- expected ${index + 1}: ${expectedLines[index] ?? '<missing>'}`,
    );
    lines.push(`+ actual   ${index + 1}: ${actualLines[index] ?? '<missing>'}`);
  }

  return lines.join('\n');
}

export function compareGoldenReportOutput(input: {
  expectedName: string;
  actualName: string;
  expected: string;
  actual: string;
}): LocalDevWorkerGoldenReportComparison {
  const expected = normalizeGoldenReportLineEndings(input.expected);
  const actual = normalizeGoldenReportLineEndings(input.actual);
  const safetyIssues = [
    ...validateGoldenReportSafety(expected),
    ...validateGoldenReportSafety(actual),
  ];
  const matches = expected === actual && safetyIssues.length === 0;

  return {
    matches,
    expectedName: input.expectedName,
    actualName: input.actualName,
    mismatchSummary:
      expected === actual
        ? ''
        : createGoldenReportMismatchSummary({ expected, actual }),
    safetyIssues,
  };
}
