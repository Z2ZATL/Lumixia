import type { ReactNode } from 'react';
import type {
  CreditState,
  CreditsMode,
} from '../auth/lib/credits';

export type DashboardAgentLaunchMode = 'workspace' | 'locked';
export type DashboardCardVariant = 'featured' | 'standard';
export type ExecutionSessionStatus =
  | 'idle'
  | 'booting'
  | 'running'
  | 'completed'
  | 'failed';
export type ExecutionLogKind = 'system' | 'progress' | 'success' | 'error';
export type ExecutionProviderMode = 'mock' | 'api';
export type DremoTaskStatus =
  | 'created'
  | 'queued'
  | 'planning'
  | 'awaiting_approval'
  | 'running'
  | 'verifying'
  | 'repairing'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type DremoCreditState =
  | 'not_required'
  | 'quoted'
  | 'reserved'
  | 'running'
  | 'completed_charged'
  | 'failed_refunded'
  | 'cancelled_released'
  | 'disputed'
  | 'manual_review';
export type DremoEventType =
  | 'task_created'
  | 'task_started'
  | 'repo_scanned'
  | 'repo_scan_started'
  | 'repo_scan_completed'
  | 'repo_scan_failed'
  | 'plan_created'
  | 'approval_required'
  | 'approval_resolved'
  | 'tool_call_started'
  | 'tool_call_output'
  | 'tool_call_completed'
  | 'terminal_output'
  | 'file_read'
  | 'file_changed'
  | 'diff_created'
  | 'verification_started'
  | 'verification_result'
  | 'self_review_started'
  | 'self_review_result'
  | 'repair_started'
  | 'final_report_created'
  | 'artifact_created'
  | 'task_completed'
  | 'task_failed'
  | 'task_cancelled'
  | 'sandbox_requested'
  | 'sandbox_starting'
  | 'sandbox_ready'
  | 'sandbox_stopping'
  | 'sandbox_stopped'
  | 'sandbox_failed'
  | 'tool_call_requested'
  | 'tool_approval_required'
  | 'tool_approval_approved'
  | 'tool_approval_rejected'
  | 'tool_call_blocked'
  | 'tool_call_stubbed';
export type DremoEventChannel =
  | 'system'
  | 'agent'
  | 'terminal'
  | 'tool'
  | 'approval'
  | 'artifact'
  | 'billing';
export type DremoEventSeverity = 'debug' | 'info' | 'warning' | 'error';
export type DremoSandboxStatus =
  | 'not_requested'
  | 'requested'
  | 'starting'
  | 'creating'
  | 'ready'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'destroyed'
  | 'failed'
  | 'quarantined';
export type DremoRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DremoApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';
export type DremoApprovalDecision = 'approved' | 'rejected';

export interface DashboardAgent {
  id: string;
  slug: string;
  name: string;
  authorName: string;
  iconName: string;
  artworkUrl: string;
  category: string;
  summary: string | null;
  heroBadge: string | null;
  isFeatured: boolean;
  isActive: boolean;
  launchMode: DashboardAgentLaunchMode;
  lockedMessage: string | null;
  executionCost: number;
  workspaceTitle: string | null;
  workspaceSubtitle: string | null;
  previewCode: string | null;
  sortOrder: number;
}

export interface DashboardSectionItem {
  id: string;
  sectionId: string;
  agentId: string;
  position: number;
  cardVariant: DashboardCardVariant;
}

export interface DashboardSection {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  items: DashboardSectionCard[];
}

export interface DashboardSectionCard extends DashboardSectionItem {
  agent: DashboardAgent;
}

export interface DashboardTrendingSearch {
  id: string;
  label: string;
  iconName: string | null;
  sortOrder: number;
}

export interface UserLifestyleEvent {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  emoji: string;
  status: string;
  sortOrder: number;
  startsAt: string | null;
}

export interface UserDashboardPreferences {
  userId: string;
  lastRoute: string;
  rightRailCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionSessionRecord {
  id: string;
  userId: string;
  agentSlug: string;
  agentName: string;
  status: ExecutionSessionStatus;
  executionCost: number;
  providerMode: ExecutionProviderMode;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionLogRecord {
  id: string;
  sessionId: string;
  userId: string;
  kind: ExecutionLogKind;
  message: string;
  createdAt: string;
}

export interface DremoTask {
  id: string;
  userId: string;
  status: DremoTaskStatus;
  title: string | null;
  prompt: string;
  repoUrl: string | null;
  repoBranch: string | null;
  sandboxId: string | null;
  modelProvider: string | null;
  modelId: string | null;
  creditState: DremoCreditState;
  creditReservationId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  failureReason: string | null;
}

export interface DremoTaskEvent {
  id: string;
  taskId: string;
  userId: string;
  sequence: number;
  eventType: DremoEventType;
  channel: DremoEventChannel;
  severity: DremoEventSeverity;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface DremoSandboxSession {
  id: string;
  taskId: string;
  userId: string;
  provider: string;
  providerSandboxId: string | null;
  status: DremoSandboxStatus;
  resourceLimits: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  failureReason: string | null;
}

export interface DremoApproval {
  id: string;
  taskId: string;
  userId: string;
  approvalType: string;
  status: DremoApprovalStatus;
  riskLevel: DremoRiskLevel;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown> | null;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface DremoRepoScanSummary {
  mode: 'stub';
  source: 'request' | 'task_metadata' | 'none';
  repoUrl: string | null;
  repoBranch: string | null;
  taskTitle: string | null;
  promptLength: number;
  languageHints: string[];
  limitations: string[];
}

export interface DremoFinalReportStub {
  mode: 'stub';
  title: string | null;
  promptPreview: string;
  promptLength: number;
  taskStatus: DremoTaskStatus;
  eventCounts: {
    total: number;
    byType: Record<string, number>;
    byChannel: Record<string, number>;
  };
  signals: {
    hasSandboxLifecycle: boolean;
    hasRepoScanCompleted: boolean;
    hasApprovalEvents: boolean;
    wasCancelled: boolean;
  };
  safety: {
    noCommandExecution: boolean;
    noFilesystemAccess: boolean;
    noModelCalls: boolean;
    noBillingChanges: boolean;
    noStorageFileCreated: boolean;
  };
  limitations: string[];
}

export interface DremoArtifact {
  id: string;
  taskId: string;
  userId: string;
  artifactType: string;
  name: string;
  storagePath: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ExecutionProviderLog {
  kind: ExecutionLogKind;
  message: string;
}

export interface ExecutionProviderSession {
  title: string;
  subtitle: string;
  status: ExecutionSessionStatus;
  providerMode: ExecutionProviderMode;
  executionCost: number;
}

export interface ExecutionExecutionResult {
  session: ExecutionSessionRecord;
  logs: ExecutionLogRecord[];
}

export interface ExecutionWorkspaceSessionResult {
  session: ExecutionSessionRecord;
  logs: ExecutionLogRecord[];
  providerSession: ExecutionProviderSession;
}

export interface ExecutionProvider {
  createSession: (input: {
    agent: DashboardAgent;
    userId: string;
  }) => Promise<ExecutionWorkspaceSessionResult>;
  execute: (input: {
    agent: DashboardAgent;
    sessionId: string;
    userId: string;
  }) => Promise<ExecutionExecutionResult>;
}

export interface DashboardContentBundle {
  agents: DashboardAgent[];
  sections: DashboardSection[];
  trendingSearches: DashboardTrendingSearch[];
}

export interface DashboardContextValue {
  userId: string;
  displayName: string;
  creditBalance: number | null;
  creditState: CreditState;
  creditsMode: CreditsMode;
  executionProviderNotice: string | null;
  content: DashboardContentBundle;
  lifestyleEvents: UserLifestyleEvent[];
  preferences: UserDashboardPreferences | null;
  isLoading: boolean;
  errorMessage: string | null;
  popupMessage: string | null;
  openPopup: (message: string) => void;
  closePopup: () => void;
  refreshDashboard: () => Promise<void>;
  getAgentBySlug: (slug: string) => DashboardAgent | undefined;
  syncLastRoute: (route: string) => Promise<void>;
  setRightRailCollapsed: (value: boolean) => Promise<void>;
  createWorkspaceSession: (
    agentSlug: string,
  ) => Promise<ExecutionWorkspaceSessionResult>;
  executeWorkspaceAction: (
    sessionId: string,
    agentSlug: string,
  ) => Promise<{
    session: ExecutionSessionRecord;
    logs: ExecutionLogRecord[];
  }>;
}

export interface DashboardProviderProps {
  userId: string;
  children: ReactNode;
}
