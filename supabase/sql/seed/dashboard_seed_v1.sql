-- Lumixia Dashboard v1 - Seed data
-- Run this after sql/schema/dashboard_schema_v1.sql succeeds.

insert into public.dashboard_sections (slug, title, sort_order, is_active)
values
('productivity-work', 'Productivity & Work', 1, true),
  ('solo-lifestyle-travel', 'Solo Lifestyle & Travel', 2, true),
  ('wellness', 'Wellness', 3, true)
on conflict (slug) do update
set
  title = excluded.title,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.dashboard_agents (
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
)
values (
  'code-architect',
  'Code Architect AI',
  '@NeuralDev',
  'code',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=900',
  'productivity',
  'Designs, reviews and executes architecture-aware implementation flows.',
  'Featured Agent',
  true,
  true,
  'workspace',
  null,
  150,
  'Code Architect AI',
  '@NeuralDev - Session Active',
  'import { NeuralRouter } from ''./router''; export class ExecutionEngine { private router: NeuralRouter; constructor() { this.router = new NeuralRouter(); } async executeTask(payload: TaskPayload): Promise<Result> { const context = await this.router.mapArchitecture(payload); return this.process(context); } }',
  1
)
on conflict (slug) do update
set
  name = excluded.name,
  author_name = excluded.author_name,
  icon_name = excluded.icon_name,
  artwork_url = excluded.artwork_url,
  category = excluded.category,
  summary = excluded.summary,
  hero_badge = excluded.hero_badge,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  launch_mode = excluded.launch_mode,
  locked_message = excluded.locked_message,
  execution_cost = excluded.execution_cost,
  workspace_title = excluded.workspace_title,
  workspace_subtitle = excluded.workspace_subtitle,
  preview_code = excluded.preview_code,
  sort_order = excluded.sort_order;

insert into public.dashboard_agents (
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
)
values (
  'flowstate-ai',
  'FlowState AI',
  '@Neuro',
  'terminal',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=720',
  'productivity',
  'Helps you reduce context switching and reclaim focused work blocks.',
  null,
  false,
  true,
  'locked',
  'FlowState AI is unlocking in a future Lumixia phase.',
  120,
  null,
  null,
  null,
  2
)
on conflict (slug) do update
set
  name = excluded.name,
  author_name = excluded.author_name,
  icon_name = excluded.icon_name,
  artwork_url = excluded.artwork_url,
  category = excluded.category,
  summary = excluded.summary,
  hero_badge = excluded.hero_badge,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  launch_mode = excluded.launch_mode,
  locked_message = excluded.locked_message,
  execution_cost = excluded.execution_cost,
  workspace_title = excluded.workspace_title,
  workspace_subtitle = excluded.workspace_subtitle,
  preview_code = excluded.preview_code,
  sort_order = excluded.sort_order;

insert into public.dashboard_agents (
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
)
values (
  'tax-optimizer',
  'Tax Optimizer',
  '@Fiscal',
  'account_balance',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=720',
  'wealth',
  'Surfaces tax-sensitive portfolio and lifestyle optimization opportunities.',
  null,
  false,
  true,
  'locked',
  'Tax Optimizer is reserved for the next rollout.',
  120,
  null,
  null,
  null,
  3
)
on conflict (slug) do update
set
  name = excluded.name,
  author_name = excluded.author_name,
  icon_name = excluded.icon_name,
  artwork_url = excluded.artwork_url,
  category = excluded.category,
  summary = excluded.summary,
  hero_badge = excluded.hero_badge,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  launch_mode = excluded.launch_mode,
  locked_message = excluded.locked_message,
  execution_cost = excluded.execution_cost,
  workspace_title = excluded.workspace_title,
  workspace_subtitle = excluded.workspace_subtitle,
  preview_code = excluded.preview_code,
  sort_order = excluded.sort_order;

insert into public.dashboard_agents (
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
)
values (
  'sleep-sage',
  'Sleep Sage',
  '@Wellness',
  'bedtime',
  'https://images.unsplash.com/photo-1541781719197-0830fd58b2d4?auto=format&fit=crop&q=80&w=720',
  'wellness',
  'Builds restorative routines around work cadence, travel and stress load.',
  null,
  false,
  true,
  'locked',
  'Sleep Sage is still being tuned for the next phase.',
  90,
  null,
  null,
  null,
  4
)
on conflict (slug) do update
set
  name = excluded.name,
  author_name = excluded.author_name,
  icon_name = excluded.icon_name,
  artwork_url = excluded.artwork_url,
  category = excluded.category,
  summary = excluded.summary,
  hero_badge = excluded.hero_badge,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  launch_mode = excluded.launch_mode,
  locked_message = excluded.locked_message,
  execution_cost = excluded.execution_cost,
  workspace_title = excluded.workspace_title,
  workspace_subtitle = excluded.workspace_subtitle,
  preview_code = excluded.preview_code,
  sort_order = excluded.sort_order;

insert into public.dashboard_agents (
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
)
values (
  'rare-finds',
  'Rare Finds',
  '@Shopping',
  'shopping_bag',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=720',
  'shopping',
  'Finds limited inventory offers and elevated deal windows across categories.',
  null,
  false,
  true,
  'locked',
  'Rare Finds will unlock with the next commerce release.',
  90,
  null,
  null,
  null,
  5
)
on conflict (slug) do update
set
  name = excluded.name,
  author_name = excluded.author_name,
  icon_name = excluded.icon_name,
  artwork_url = excluded.artwork_url,
  category = excluded.category,
  summary = excluded.summary,
  hero_badge = excluded.hero_badge,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  launch_mode = excluded.launch_mode,
  locked_message = excluded.locked_message,
  execution_cost = excluded.execution_cost,
  workspace_title = excluded.workspace_title,
  workspace_subtitle = excluded.workspace_subtitle,
  preview_code = excluded.preview_code,
  sort_order = excluded.sort_order;

insert into public.dashboard_agents (
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
)
values (
  'nomad-soul',
  'Nomad Soul',
  '@Traveler',
  'flight',
  'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=720',
  'travel',
  'Builds premium solo itineraries, routing ideas and mood-based escapes.',
  null,
  false,
  true,
  'locked',
  'Nomad Soul is opening soon in the travel phase.',
  110,
  null,
  null,
  null,
  6
)
on conflict (slug) do update
set
  name = excluded.name,
  author_name = excluded.author_name,
  icon_name = excluded.icon_name,
  artwork_url = excluded.artwork_url,
  category = excluded.category,
  summary = excluded.summary,
  hero_badge = excluded.hero_badge,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  launch_mode = excluded.launch_mode,
  locked_message = excluded.locked_message,
  execution_cost = excluded.execution_cost,
  workspace_title = excluded.workspace_title,
  workspace_subtitle = excluded.workspace_subtitle,
  preview_code = excluded.preview_code,
  sort_order = excluded.sort_order;

insert into public.dashboard_trending_searches (label, icon_name, sort_order)
values
  ('Tax Optimizer AI', 'trending_up', 1),
  ('Tokyo Solo Trip', 'travel_explore', 2),
  ('Mutelu Color Matcher', 'palette', 3),
  ('Night Routine Planner', 'bedtime', 4)
on conflict (label) do update
set
  icon_name = excluded.icon_name,
  sort_order = excluded.sort_order;

insert into public.dashboard_section_items (section_id, agent_id, position, card_variant)
select
  ds.id,
  da.id,
  seed.position,
  seed.card_variant
from (
  values
('productivity-work', 'code-architect', 1, 'featured'),
('productivity-work', 'flowstate-ai', 2, 'standard'),
('productivity-work', 'tax-optimizer', 3, 'standard'),
('productivity-work', 'sleep-sage', 4, 'standard'),
('productivity-work', 'rare-finds', 5, 'standard'),
    ('solo-lifestyle-travel', 'nomad-soul', 1, 'featured'),
    ('solo-lifestyle-travel', 'flowstate-ai', 2, 'standard'),
    ('solo-lifestyle-travel', 'tax-optimizer', 3, 'standard'),
    ('solo-lifestyle-travel', 'rare-finds', 4, 'standard'),
    ('solo-lifestyle-travel', 'sleep-sage', 5, 'standard'),
    ('wellness', 'sleep-sage', 1, 'featured'),
    ('wellness', 'rare-finds', 2, 'standard'),
    ('wellness', 'nomad-soul', 3, 'standard'),
    ('wellness', 'flowstate-ai', 4, 'standard'),
    ('wellness', 'tax-optimizer', 5, 'standard')
) as seed(section_slug, agent_slug, position, card_variant)
join public.dashboard_sections ds on ds.slug = seed.section_slug
join public.dashboard_agents da on da.slug = seed.agent_slug
on conflict (section_id, position) do update
set
  agent_id = excluded.agent_id,
  card_variant = excluded.card_variant;
