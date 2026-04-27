import { getSupabaseClient } from '../../../lib/supabase';
import type {
  DashboardAgent,
  DashboardContentBundle,
  DashboardSection,
  DashboardSectionItem,
  DashboardTrendingSearch,
  ExecutionLogRecord,
  ExecutionProviderLog,
  ExecutionProviderMode,
  ExecutionSessionRecord,
  ExecutionSessionStatus,
  UserDashboardPreferences,
  UserLifestyleEvent,
} from '../types';

const PLANE_EMOJI = '\u2708\uFE0F';
const SUSHI_EMOJI = '\u{1F363}';
const LEGACY_PRODUCTIVITY_SECTION_SLUGS = new Set([
  'productivity-work',
  'productivity-work-hacks',
]);

const DEFAULT_LIFESTYLE_EVENTS = [
  {
    emoji: PLANE_EMOJI,
    title: 'Phuket Weekend Getaway',
    subtitle: 'In 3 days. AI itinerary is ready.',
    status: 'upcoming',
    sort_order: 1,
  },
  {
    emoji: SUSHI_EMOJI,
    title: 'Omakase at Thonglor',
    subtitle: 'Tomorrow, 19:00. Budget allocated.',
    status: 'upcoming',
    sort_order: 2,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getDefaultLifestyleEmoji(index: number) {
  return index === 0 ? PLANE_EMOJI : SUSHI_EMOJI;
}

function normalizeLifestyleEmoji(value: unknown, title: string) {
  const loweredTitle = title.toLowerCase();

  if (loweredTitle.includes('phuket')) {
    return PLANE_EMOJI;
  }

  if (loweredTitle.includes('omakase') || loweredTitle.includes('thonglor')) {
    return SUSHI_EMOJI;
  }

  if (typeof value === 'string') {
    if (value === 'plane' || value === PLANE_EMOJI) {
      return PLANE_EMOJI;
    }

    if (value === 'dining' || value === SUSHI_EMOJI) {
      return SUSHI_EMOJI;
    }
  }

  return loweredTitle.includes('phuket') ? PLANE_EMOJI : SUSHI_EMOJI;
}

function normalizeSectionTitle(slug: string, title: string) {
  if (LEGACY_PRODUCTIVITY_SECTION_SLUGS.has(slug)) {
    return 'Productivity & Work';
  }

  return title;
}

function normalizeDashboardError(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    const code = typeof error.code === 'string' ? error.code : '';

    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      (message.includes('relation') && message.includes('does not exist')) ||
      message.includes('schema cache')
    ) {
      return new Error(
        'The Lumixia dashboard schema is missing in Supabase. Run supabase/sql/schema/dashboard_schema_v1.sql, then verify the tables and try again.',
      );
    }

    if (code === '42703' || message.includes('column')) {
      return new Error(
        'Your Lumixia dashboard schema is out of date. Re-apply supabase/sql/schema/dashboard_schema_v1.sql and try again.',
      );
    }

    if (
      code === '42501' ||
      message.includes('row-level security') ||
      message.includes('permission denied')
    ) {
      return new Error(
        'Your Lumixia dashboard permissions are incomplete in Supabase. Re-apply supabase/sql/ops/dashboard_permissions_repair_v1.sql and try again.',
      );
    }

    return new Error(error.message);
  }

  return new Error('We could not load the Lumixia dashboard schema.');
}

function mapDashboardAgent(row: Record<string, unknown>): DashboardAgent {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    authorName: String(row.author_name),
    iconName: String(row.icon_name),
    artworkUrl: String(row.artwork_url),
    category: String(row.category),
    summary: typeof row.summary === 'string' ? row.summary : null,
    heroBadge: typeof row.hero_badge === 'string' ? row.hero_badge : null,
    isFeatured: row.is_featured === true,
    isActive: row.is_active !== false,
    launchMode: row.launch_mode === 'workspace' ? 'workspace' : 'locked',
    lockedMessage:
      typeof row.locked_message === 'string' ? row.locked_message : null,
    executionCost: toNumber(row.execution_cost, 150),
    workspaceTitle:
      typeof row.workspace_title === 'string' ? row.workspace_title : null,
    workspaceSubtitle:
      typeof row.workspace_subtitle === 'string'
        ? row.workspace_subtitle
        : null,
    previewCode: typeof row.preview_code === 'string' ? row.preview_code : null,
    sortOrder: toNumber(row.sort_order, 0),
  };
}

function mapDashboardSectionItem(
  row: Record<string, unknown>,
): DashboardSectionItem {
  return {
    id: String(row.id),
    sectionId: String(row.section_id),
    agentId: String(row.agent_id),
    position: toNumber(row.position, 0),
    cardVariant: row.card_variant === 'featured' ? 'featured' : 'standard',
  };
}

function mapTrendingSearch(
  row: Record<string, unknown>,
): DashboardTrendingSearch {
  return {
    id: String(row.id),
    label: String(row.label),
    iconName: typeof row.icon_name === 'string' ? row.icon_name : null,
    sortOrder: toNumber(row.sort_order, 0),
  };
}

function mapExecutionLog(row: Record<string, unknown>): ExecutionLogRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    userId: String(row.user_id),
    kind:
      row.kind === 'progress' ||
      row.kind === 'success' ||
      row.kind === 'error'
        ? row.kind
        : 'system',
    message: String(row.message),
    createdAt: String(row.created_at),
  };
}

function mapPreferences(
  row: Record<string, unknown>,
): UserDashboardPreferences {
  return {
    userId: String(row.user_id),
    lastRoute:
      typeof row.last_route === 'string' ? row.last_route : '/dashboard',
    rightRailCollapsed: row.right_rail_collapsed === true,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapLifestyleEvent(row: Record<string, unknown>): UserLifestyleEvent {
  const title = String(row.title);

  return {
    id: String(row.id),
    userId: String(row.user_id),
    title,
    subtitle: String(row.subtitle),
    emoji: normalizeLifestyleEmoji(row.emoji, title),
    status: String(row.status ?? 'upcoming'),
    sortOrder: toNumber(row.sort_order, 0),
    startsAt: typeof row.starts_at === 'string' ? row.starts_at : null,
  };
}

export async function fetchDashboardContent(): Promise<DashboardContentBundle> {
  const supabase = getSupabaseClient();

  const [
    { data: sectionsData, error: sectionsError },
    { data: itemsData, error: itemsError },
    { data: agentsData, error: agentsError },
    { data: searchesData, error: searchesError },
  ] = await Promise.all([
    supabase
      .from('dashboard_sections')
      .select('id, slug, title, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('dashboard_section_items')
      .select('id, section_id, agent_id, position, card_variant')
      .order('position'),
    supabase
      .from('dashboard_agents')
      .select(`
        id,
        slug,
        name,
        author_name,
        icon_name,
        artwork_url,
        category,
        summary,
        hero_badge,
        is_featured,
        is_active,
        launch_mode,
        locked_message,
        execution_cost,
        workspace_title,
        workspace_subtitle,
        preview_code,
        sort_order
      `)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('dashboard_trending_searches')
      .select('id, label, icon_name, sort_order')
      .order('sort_order'),
  ]);

  if (sectionsError) {
    throw normalizeDashboardError(sectionsError);
  }

  if (itemsError) {
    throw normalizeDashboardError(itemsError);
  }

  if (agentsError) {
    throw normalizeDashboardError(agentsError);
  }

  if (searchesError) {
    throw normalizeDashboardError(searchesError);
  }

  const agents = (agentsData ?? []).map((row) =>
    mapDashboardAgent(row as Record<string, unknown>),
  );
  const items = (itemsData ?? []).map((row) =>
    mapDashboardSectionItem(row as Record<string, unknown>),
  );
  const trendingSearches = (searchesData ?? []).map((row) =>
    mapTrendingSearch(row as Record<string, unknown>),
  );

  const agentMap = new Map(agents.map((agent) => [agent.id, agent]));

  const sections = (sectionsData ?? []).map((row) => {
    const sectionItems = items
      .filter((item) => item.sectionId === String((row as { id: string }).id))
      .map((item) => ({
        ...item,
        agent: agentMap.get(item.agentId),
      }))
      .filter(
        (
          item,
        ): item is DashboardSection['items'][number] => Boolean(item.agent),
      );

    return {
      id: String((row as { id: string }).id),
      slug: String((row as { slug: string }).slug),
      title: normalizeSectionTitle(
        String((row as { slug: string }).slug),
        String((row as { title: string }).title),
      ),
      sortOrder: toNumber((row as { sort_order?: unknown }).sort_order, 0),
      items: sectionItems,
    } satisfies DashboardSection;
  });

  return {
    agents,
    sections,
    trendingSearches,
  };
}

export async function ensureUserDashboardState(userId: string) {
  const supabase = getSupabaseClient();

  const { data: existingPreferences, error: preferencesReadError } =
    await supabase
      .from('user_dashboard_preferences')
      .select(
        'user_id, last_route, right_rail_collapsed, created_at, updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle();

  if (preferencesReadError) {
    throw normalizeDashboardError(preferencesReadError);
  }

  let preferencesData = existingPreferences;

  if (!preferencesData) {
    const { data: createdPreferences, error: createPreferencesError } =
      await supabase
        .from('user_dashboard_preferences')
        .insert({
          user_id: userId,
          last_route: '/dashboard',
          right_rail_collapsed: false,
        })
        .select(
          'user_id, last_route, right_rail_collapsed, created_at, updated_at',
        )
        .single();

    if (createPreferencesError) {
      throw normalizeDashboardError(createPreferencesError);
    }

    preferencesData = createdPreferences;
  }

  const { data: eventRows, error: eventsError } = await supabase
    .from('user_lifestyle_events')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (eventsError) {
    throw normalizeDashboardError(eventsError);
  }

  if (!eventRows || eventRows.length === 0) {
    const { error: insertEventsError } = await supabase
      .from('user_lifestyle_events')
      .insert(
        DEFAULT_LIFESTYLE_EVENTS.map((event, index) => ({
          user_id: userId,
          ...event,
          emoji: getDefaultLifestyleEmoji(index),
        })),
      );

    if (insertEventsError) {
      throw normalizeDashboardError(insertEventsError);
    }
  }

  return mapPreferences(preferencesData as Record<string, unknown>);
}

export async function fetchUserDashboardPreferences(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('user_dashboard_preferences')
    .select('user_id, last_route, right_rail_collapsed, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw normalizeDashboardError(error);
  }

  return data ? mapPreferences(data as Record<string, unknown>) : null;
}

export async function upsertUserDashboardPreferences(
  userId: string,
  patch: Partial<
    Pick<UserDashboardPreferences, 'lastRoute' | 'rightRailCollapsed'>
  >,
) {
  const payload: Record<string, unknown> = {
    user_id: userId,
  };

  if (typeof patch.lastRoute === 'string') {
    payload.last_route = patch.lastRoute;
  }

  if (typeof patch.rightRailCollapsed === 'boolean') {
    payload.right_rail_collapsed = patch.rightRailCollapsed;
  }

  const { data, error } = await getSupabaseClient()
    .from('user_dashboard_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id, last_route, right_rail_collapsed, created_at, updated_at')
    .single();

  if (error) {
    throw normalizeDashboardError(error);
  }

  return mapPreferences(data as Record<string, unknown>);
}

export async function fetchUserLifestyleEvents(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('user_lifestyle_events')
    .select('id, user_id, title, subtitle, emoji, status, sort_order, starts_at')
    .eq('user_id', userId)
    .order('sort_order');

  if (error) {
    throw normalizeDashboardError(error);
  }

  return (data ?? []).map((row) =>
    mapLifestyleEvent(row as Record<string, unknown>),
  );
}

export async function createExecutionSessionRecord(input: {
  agentSlug: string;
  agentName: string;
  executionCost: number;
  providerMode: ExecutionProviderMode;
  status: ExecutionSessionStatus;
  userId: string;
}) {
  void input;
  throw new Error(
    'Execution sessions are server-owned. Start workspaces through the secure execution API.',
  );
}

export async function updateExecutionSessionRecord(
  sessionId: string,
  patch: Partial<Pick<ExecutionSessionRecord, 'status'>>,
) {
  void sessionId;
  void patch;
  throw new Error(
    'Execution session status is server-owned. Update status through the secure execution API.',
  );
}

export async function fetchExecutionLogs(sessionId: string) {
  const { data, error } = await getSupabaseClient()
    .from('execution_logs')
    .select('id, session_id, user_id, kind, message, created_at')
    .eq('session_id', sessionId)
    .order('created_at');

  if (error) {
    throw normalizeDashboardError(error);
  }

  return (data ?? []).map((row) =>
    mapExecutionLog(row as Record<string, unknown>),
  );
}

export async function appendExecutionLogs(input: {
  logs: ExecutionProviderLog[];
  sessionId: string;
  userId: string;
}) {
  void input;
  throw new Error(
    'Execution logs are server-owned. Append logs through the secure execution API.',
  );
}

