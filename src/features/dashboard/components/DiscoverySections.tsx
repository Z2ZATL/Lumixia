import React, { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import { ComingSoonVeil } from './ComingSoonVeil';

export const DiscoverySections: React.FC = () => {
  const navigate = useNavigate();
  const { content, openPopup } = useDashboard();
  const scrollerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sections = useMemo(() => content.sections, [content.sections]);

  const scrollSection = (sectionId: string, direction: number) => {
    const scroller = scrollerRefs.current[sectionId];

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      left: direction * 320,
      behavior: 'smooth',
    });
  };

  const handleCardClick = (slug: string) => {
    const agent = content.agents.find((item) => item.slug === slug);

    if (!agent) {
      return;
    }

    if (agent.launchMode === 'workspace') {
      navigate(`/dashboard/workspace/${agent.slug}`);
      return;
    }

    openPopup(agent.lockedMessage || 'This destination is unlocking in a future phase.');
  };

  if (sections.length === 0) {
    return (
      <div className="rounded-[2rem] border border-outline-variant/50 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">
          Dashboard Content
        </p>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-on-surface">
          No curated sections yet
        </h3>
        <p className="mt-3 text-on-surface-variant">
          Apply the Supabase dashboard seed to populate discovery rows, featured
          agents and search trends.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-12 pb-20">
      {sections.map((section, sectionIndex) => {
        const isPrimarySection = sectionIndex === 0;
        const displayTitle = section.title;

        return (
        <section key={section.id} className="group relative">
          <div className="mb-5 flex items-end justify-between px-2">
            <h3 className="text-xl font-black tracking-tight text-slate-900">
              {displayTitle}
            </h3>
            <button
              className="flex items-center gap-1 text-xs font-bold text-primary"
              type="button"
              disabled={!isPrimarySection}
              onClick={() =>
                openPopup(`${displayTitle} gallery is unlocking in a future phase.`)
              }
            >
              View Gallery
              <span className="material-symbols-outlined text-[14px]">
                arrow_right_alt
              </span>
            </button>
          </div>

          <div className="relative">
            <button
              className={`dashboard-nav-arrow absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-xl hover:text-primary ${
                !isPrimarySection ? 'pointer-events-none opacity-0' : ''
              }`}
              type="button"
              onClick={() => scrollSection(section.id, -1)}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            <div
              ref={(element) => {
                scrollerRefs.current[section.id] = element;
              }}
              className={`no-scrollbar flex gap-5 overflow-x-auto scroll-smooth ${
                !isPrimarySection ? 'pointer-events-none blur-[4px] saturate-[0.78]' : ''
              }`}
            >
              {section.items.map((item, itemIndex) => {
                const widthClass = item.cardVariant === 'featured'
                  ? 'w-[320px] md:w-[360px]'
                  : 'w-[240px] md:w-[270px]';
                const isUnlockedCard = isPrimarySection && itemIndex === 0;

                return (
                  <div
                    key={item.id}
                    className={`relative shrink-0 ${widthClass} ${
                      !isUnlockedCard ? 'pointer-events-none' : ''
                    }`}
                  >
                    <button
                      className={`dashboard-photo-card relative w-full rounded-3xl p-5 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        !isUnlockedCard ? 'blur-[4px] saturate-[0.78]' : ''
                      }`}
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.72)), url('${item.agent.artworkUrl}')`,
                      }}
                      type="button"
                      disabled={!isUnlockedCard}
                      onClick={() => handleCardClick(item.agent.slug)}
                    >
                      {item.agent.heroBadge && (
                        <div className="absolute left-4 top-4 rounded-full border border-sky-400/30 bg-sky-500/20 px-2.5 py-1 text-[10px] font-bold text-sky-100 shadow-[0_0_10px_rgba(14,165,233,0.3)]">
                          {item.agent.heroBadge}
                        </div>
                      )}

                      <div className="relative z-10 flex h-full flex-col justify-end">
                        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-md">
                          <span className="material-symbols-outlined text-sm">
                            {item.agent.iconName}
                          </span>
                        </div>
                        <h4 className="truncate text-sm font-bold text-white">
                          {item.agent.name}
                        </h4>
                        <p className="text-[10px] font-medium text-white/70">
                          {item.agent.authorName}
                        </p>
                      </div>
                    </button>
                    {!isUnlockedCard && <ComingSoonVeil className="rounded-3xl" />}
                  </div>
                );
              })}
            </div>
            {!isPrimarySection && (
              <ComingSoonVeil className="rounded-[2rem]" label="Coming soon" />
            )}

            <button
              className={`dashboard-nav-arrow absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-xl hover:text-primary ${
                !isPrimarySection ? 'pointer-events-none opacity-0' : ''
              }`}
              type="button"
              onClick={() => scrollSection(section.id, 1)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </section>
      )})}
    </div>
  );
};
