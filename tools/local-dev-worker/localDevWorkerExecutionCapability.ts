export type LocalDevWorkerCapabilityRiskLevel = 'low' | 'medium' | 'high';

export type LocalDevWorkerCapabilityCategory =
  | 'version'
  | 'identity'
  | 'metadata'
  | 'smoke';

export type LocalDevWorkerExpectedOutputKind =
  | 'version-string'
  | 'identity-string'
  | 'metadata-string';

export interface LocalDevWorkerExecutionCapability {
  capabilityId: string;
  command: string;
  args: readonly string[];
  riskLevel: LocalDevWorkerCapabilityRiskLevel;
  category: LocalDevWorkerCapabilityCategory;
  networkRequired: false;
  fileWriteRequired: false;
  dockerRequired: boolean;
  shellRequired: false;
  allowedInProduction: false;
  requiresManualReview: true;
  defaultEnabled: false;
  expectedOutputKind: LocalDevWorkerExpectedOutputKind;
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
}

export function normalizeLocalDevWorkerCapabilityCommand(input: {
  command: string;
  args: readonly string[];
}) {
  return [input.command, ...input.args]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function capabilityCommandKey(
  capability: LocalDevWorkerExecutionCapability,
) {
  return normalizeLocalDevWorkerCapabilityCommand({
    command: capability.command,
    args: capability.args,
  });
}
