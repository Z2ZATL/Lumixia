import React, { useState } from 'react';
import {
  DEFAULT_DREMO_SANDBOX_POLICY,
  approvalRequiredNpmInstallExample,
  deniedRmRfExample,
  deniedSecretEnvExample,
  safeRepoScanExample,
  validateSandboxCommandRequest,
} from '../../dremo-code/sandbox';
import type {
  DremoSandboxCommandRequest,
  DremoSandboxOutputInfo,
  DremoSandboxPolicyValidationResult,
  DremoSandboxResourceRequest,
} from '../../dremo-code/sandbox';

type PolicySmokeFormValues = {
  commandInput: string;
  pathsInput: string;
  envKey: string;
  envValue: string;
  timeoutMs: string;
  maxStdoutBytes: string;
  maxStderrBytes: string;
  maxArtifactBytes: string;
  maxMemoryMb: string;
  maxCpu: string;
  observedStdoutBytes: string;
  observedStderrBytes: string;
  observedArtifactBytes: string;
};

type PolicySmokePreset = {
  label: string;
  description: string;
  request: DremoSandboxCommandRequest;
};

const deniedEnvPathExample = {
  sessionId: 'example-session',
  taskId: 'example-task',
  toolCallId: 'example-tool-dotenv-path',
  command: ['ls'],
  workingDirectory: 'workspace',
  reason: 'Demonstrate blocked dotenv path validation.',
  paths: ['.env'],
} satisfies DremoSandboxCommandRequest;

const timeoutExceedsPolicyExample = {
  sessionId: 'example-session',
  taskId: 'example-task',
  toolCallId: 'example-tool-timeout-cap',
  command: ['git', 'status'],
  workingDirectory: 'workspace',
  reason: 'Demonstrate timeout cap validation.',
  resourceRequest: {
    wallClockTimeoutMs:
      DEFAULT_DREMO_SANDBOX_POLICY.wallClockTimeoutMs + 60_000,
  },
} satisfies DremoSandboxCommandRequest;

const POLICY_SMOKE_PRESETS: PolicySmokePreset[] = [
  {
    label: 'Safe repo scan',
    description: 'Allowlisted git metadata command with bounded output caps.',
    request: safeRepoScanExample.request,
  },
  {
    label: 'Denied rm -rf',
    description: 'Destructive command pattern must be denied.',
    request: deniedRmRfExample.request,
  },
  {
    label: 'Approval required npm install',
    description: 'Package install is routed to approval before execution.',
    request: approvalRequiredNpmInstallExample.request,
  },
  {
    label: 'Denied .env path',
    description: 'Secret-bearing dotenv paths are blocked.',
    request: deniedEnvPathExample,
  },
  {
    label: 'Denied secret env key',
    description: 'Sensitive environment keys are denied by policy.',
    request: deniedSecretEnvExample.request,
  },
  {
    label: 'Timeout exceeds policy',
    description: 'Requested wall-clock timeout exceeds the default cap.',
    request: timeoutExceedsPolicyExample,
  },
];

function compactPayloadPreview(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload, null, 2);

  if (text.length <= 420) {
    return text;
  }

  return `${text.slice(0, 420)}...`;
}

function parseCommandInput(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function parsePathsInput(value: string) {
  return value
    .split(/[\n,]/)
    .map((path) => path.trim())
    .filter(Boolean);
}

function parseOptionalNumber(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return parsed;
}

function firstEnvironmentEntry(request: DremoSandboxCommandRequest) {
  return Object.entries(request.environment ?? {})[0] ?? ['', ''];
}

function policyFormFromRequest(
  request: DremoSandboxCommandRequest,
): PolicySmokeFormValues {
  const [envKey, envValue] = firstEnvironmentEntry(request);
  const resourceRequest = request.resourceRequest ?? {};
  const outputInfo = request.outputInfo ?? {};

  return {
    commandInput: request.command.join(' '),
    pathsInput: (request.paths ?? []).join('\n'),
    envKey,
    envValue,
    timeoutMs:
      resourceRequest.wallClockTimeoutMs?.toString() ??
      request.timeoutMs?.toString() ??
      '',
    maxStdoutBytes:
      resourceRequest.maxStdoutBytes?.toString() ??
      request.maxOutputBytes?.toString() ??
      '',
    maxStderrBytes:
      resourceRequest.maxStderrBytes?.toString() ??
      request.maxOutputBytes?.toString() ??
      '',
    maxArtifactBytes: resourceRequest.maxArtifactBytes?.toString() ?? '',
    maxMemoryMb: resourceRequest.maxMemoryMb?.toString() ?? '',
    maxCpu: resourceRequest.maxCpu?.toString() ?? '',
    observedStdoutBytes: outputInfo.stdoutBytes?.toString() ?? '',
    observedStderrBytes: outputInfo.stderrBytes?.toString() ?? '',
    observedArtifactBytes: outputInfo.artifactBytes?.toString() ?? '',
  };
}

function buildPolicySmokeRequest(
  form: PolicySmokeFormValues,
): DremoSandboxCommandRequest {
  const resourceRequest: DremoSandboxResourceRequest = {};
  const outputInfo: DremoSandboxOutputInfo = {};
  const timeoutMs = parseOptionalNumber(form.timeoutMs, 'Timeout');
  const maxStdoutBytes = parseOptionalNumber(
    form.maxStdoutBytes,
    'Max stdout bytes',
  );
  const maxStderrBytes = parseOptionalNumber(
    form.maxStderrBytes,
    'Max stderr bytes',
  );
  const maxArtifactBytes = parseOptionalNumber(
    form.maxArtifactBytes,
    'Max artifact bytes',
  );
  const maxMemoryMb = parseOptionalNumber(form.maxMemoryMb, 'Max memory MB');
  const maxCpu = parseOptionalNumber(form.maxCpu, 'Max CPU');
  const observedStdoutBytes = parseOptionalNumber(
    form.observedStdoutBytes,
    'Observed stdout bytes',
  );
  const observedStderrBytes = parseOptionalNumber(
    form.observedStderrBytes,
    'Observed stderr bytes',
  );
  const observedArtifactBytes = parseOptionalNumber(
    form.observedArtifactBytes,
    'Observed artifact bytes',
  );

  if (timeoutMs !== undefined) {
    resourceRequest.wallClockTimeoutMs = timeoutMs;
  }

  if (maxStdoutBytes !== undefined) {
    resourceRequest.maxStdoutBytes = maxStdoutBytes;
  }

  if (maxStderrBytes !== undefined) {
    resourceRequest.maxStderrBytes = maxStderrBytes;
  }

  if (maxArtifactBytes !== undefined) {
    resourceRequest.maxArtifactBytes = maxArtifactBytes;
  }

  if (maxMemoryMb !== undefined) {
    resourceRequest.maxMemoryMb = maxMemoryMb;
  }

  if (maxCpu !== undefined) {
    resourceRequest.maxCpu = maxCpu;
  }

  if (observedStdoutBytes !== undefined) {
    outputInfo.stdoutBytes = observedStdoutBytes;
  }

  if (observedStderrBytes !== undefined) {
    outputInfo.stderrBytes = observedStderrBytes;
  }

  if (observedArtifactBytes !== undefined) {
    outputInfo.artifactBytes = observedArtifactBytes;
  }

  return {
    sessionId: 'policy-smoke-session',
    taskId: 'policy-smoke-task',
    toolCallId: 'policy-smoke-tool',
    command: parseCommandInput(form.commandInput),
    workingDirectory: 'workspace',
    reason: 'Dremo Lab local policy validation smoke test.',
    paths: parsePathsInput(form.pathsInput),
    ...(form.envKey.trim()
      ? { environment: { [form.envKey.trim()]: form.envValue } }
      : {}),
    ...(Object.keys(resourceRequest).length > 0 ? { resourceRequest } : {}),
    ...(Object.keys(outputInfo).length > 0 ? { outputInfo } : {}),
  };
}

export const DremoPolicyValidationSmoke: React.FC = () => {
  const [policySmokeForm, setPolicySmokeForm] =
    useState<PolicySmokeFormValues>(() =>
      policyFormFromRequest(safeRepoScanExample.request),
    );
  const [policySmokeResult, setPolicySmokeResult] =
    useState<DremoSandboxPolicyValidationResult | null>(null);
  const [policySmokeError, setPolicySmokeError] = useState<string | null>(null);

  function updatePolicySmokeField(
    field: keyof PolicySmokeFormValues,
    value: string,
  ) {
    setPolicySmokeForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handlePolicySmokeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const request = buildPolicySmokeRequest(policySmokeForm);
      const result = validateSandboxCommandRequest(
        DEFAULT_DREMO_SANDBOX_POLICY,
        request,
      );

      setPolicySmokeResult(result);
      setPolicySmokeError(null);
    } catch (error) {
      setPolicySmokeResult(null);
      setPolicySmokeError(
        error instanceof Error
          ? error.message
          : 'Unable to validate the sandbox policy request.',
      );
    }
  }

  function handlePolicyPreset(preset: PolicySmokePreset) {
    const nextForm = policyFormFromRequest(preset.request);

    setPolicySmokeForm(nextForm);
    setPolicySmokeResult(
      validateSandboxCommandRequest(
        DEFAULT_DREMO_SANDBOX_POLICY,
        preset.request,
      ),
    );
    setPolicySmokeError(null);
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
            Policy Validation Smoke
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Policy validation only - no command is executed.
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            This section runs the pure TypeScript sandbox policy validator in
            the browser. It does not call <span className="font-bold">dremo-api</span>,
            write database rows, create events, touch files, use the network, or
            run commands.
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          noExecution: true
        </span>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <form
          className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
          onSubmit={handlePolicySmokeSubmit}
        >
          <label className="block text-sm font-bold text-slate-700">
            Command tokens
            <input
              className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="git status"
              type="text"
              value={policySmokeForm.commandInput}
              onChange={(event) =>
                updatePolicySmokeField('commandInput', event.target.value)
              }
            />
          </label>

          <label className="block text-sm font-bold text-slate-700">
            Optional paths
            <textarea
              className="mt-2 min-h-20 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="src&#10;.env"
              value={policySmokeForm.pathsInput}
              onChange={(event) =>
                updatePolicySmokeField('pathsInput', event.target.value)
              }
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">
              Env key
              <input
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="OPENAI_API_KEY"
                type="text"
                value={policySmokeForm.envKey}
                onChange={(event) =>
                  updatePolicySmokeField('envKey', event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Env value
              <input
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 font-mono text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="example-secret"
                type="text"
                value={policySmokeForm.envValue}
                onChange={(event) =>
                  updatePolicySmokeField('envValue', event.target.value)
                }
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-bold text-slate-700">
              Timeout ms
              <input
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                inputMode="numeric"
                type="text"
                value={policySmokeForm.timeoutMs}
                onChange={(event) =>
                  updatePolicySmokeField('timeoutMs', event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Max stdout bytes
              <input
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                inputMode="numeric"
                type="text"
                value={policySmokeForm.maxStdoutBytes}
                onChange={(event) =>
                  updatePolicySmokeField('maxStdoutBytes', event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Max stderr bytes
              <input
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                inputMode="numeric"
                type="text"
                value={policySmokeForm.maxStderrBytes}
                onChange={(event) =>
                  updatePolicySmokeField('maxStderrBytes', event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Max artifact bytes
              <input
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                inputMode="numeric"
                type="text"
                value={policySmokeForm.maxArtifactBytes}
                onChange={(event) =>
                  updatePolicySmokeField('maxArtifactBytes', event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Memory MB
              <input
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                inputMode="numeric"
                type="text"
                value={policySmokeForm.maxMemoryMb}
                onChange={(event) =>
                  updatePolicySmokeField('maxMemoryMb', event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              CPU
              <input
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                inputMode="decimal"
                type="text"
                value={policySmokeForm.maxCpu}
                onChange={(event) =>
                  updatePolicySmokeField('maxCpu', event.target.value)
                }
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Optional observed output sizes
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-bold text-slate-700">
                Stdout bytes
                <input
                  className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  inputMode="numeric"
                  type="text"
                  value={policySmokeForm.observedStdoutBytes}
                  onChange={(event) =>
                    updatePolicySmokeField(
                      'observedStdoutBytes',
                      event.target.value,
                    )
                  }
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Stderr bytes
                <input
                  className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  inputMode="numeric"
                  type="text"
                  value={policySmokeForm.observedStderrBytes}
                  onChange={(event) =>
                    updatePolicySmokeField(
                      'observedStderrBytes',
                      event.target.value,
                    )
                  }
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Artifact bytes
                <input
                  className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  inputMode="numeric"
                  type="text"
                  value={policySmokeForm.observedArtifactBytes}
                  onChange={(event) =>
                    updatePolicySmokeField(
                      'observedArtifactBytes',
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          </div>

          <button
            className="min-h-12 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5"
            type="submit"
          >
            Validate Policy
          </button>
        </form>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
              Preset Examples
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {POLICY_SMOKE_PRESETS.map((preset) => (
                <button
                  className="min-h-16 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white"
                  key={preset.label}
                  type="button"
                  onClick={() => handlePolicyPreset(preset)}
                >
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-900">
                    {preset.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {policySmokeError && (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
              {policySmokeError}
            </p>
          )}

          {policySmokeResult ? (
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Validation Result
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {policySmokeResult.decision}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
                      policySmokeResult.allowed
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    allowed: {policySmokeResult.allowed ? 'true' : 'false'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-600">
                    noExecution: true
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Violations
                  </p>
                  {policySmokeResult.reasons.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {policySmokeResult.reasons.map((reason, index) => (
                        <div
                          className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800"
                          key={`${reason.code}-${index}`}
                        >
                          <p className="font-black uppercase tracking-widest">
                            {reason.code} / {reason.severity}
                          </p>
                          <p className="mt-1">{reason.message}</p>
                          {reason.field && (
                            <p className="mt-1 font-mono text-[11px]">
                              field: {reason.field}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      No violations. The request passes policy validation, but
                      this lab still does not execute it.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Warnings
                  </p>
                  {policySmokeResult.warnings.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {policySmokeResult.warnings.map((warning, index) => (
                        <div
                          className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800"
                          key={`${warning.code}-${index}`}
                        >
                          <p className="font-black uppercase tracking-widest">
                            {warning.code} / {warning.severity}
                          </p>
                          <p className="mt-1">{warning.message}</p>
                          {warning.field && (
                            <p className="mt-1 font-mono text-[11px]">
                              field: {warning.field}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      No warnings.
                    </p>
                  )}
                </div>
              </div>

              <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-xs leading-6 text-slate-700">
                {compactPayloadPreview(
                  policySmokeResult.normalizedRequest ?? {},
                )}
              </pre>
            </article>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Choose a preset or edit the fields, then validate. The result is
              local-only and does not create Dremo task events.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
