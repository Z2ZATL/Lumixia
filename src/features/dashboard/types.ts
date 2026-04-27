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
