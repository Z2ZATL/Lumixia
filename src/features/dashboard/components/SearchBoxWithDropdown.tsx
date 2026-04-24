import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const SearchBoxWithDropdown: React.FC = () => {
  const { content } = useDashboard();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

  const filteredSearches = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return content.trendingSearches;
    }

    return content.trendingSearches.filter((item) =>
      item.label.toLowerCase().includes(normalized),
    );
  }, [content.trendingSearches, query]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="search-container relative mx-auto max-w-2xl">
      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
        <span className="material-symbols-outlined text-[18px] text-slate-400">
          search
        </span>
      </div>
      <input
        className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-6 text-sm text-on-surface placeholder:text-slate-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
        placeholder="Search wealth strategies, rituals..."
        type="text"
        value={query}
        onBlur={() => {
          if (blurTimeoutRef.current) {
            window.clearTimeout(blurTimeoutRef.current);
          }

          blurTimeoutRef.current = window.setTimeout(() => {
            setIsFocused(false);
            blurTimeoutRef.current = null;
          }, 120);
        }}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsFocused(true)}
      />

      <div
        className={`absolute left-0 top-[calc(100%+8px)] z-[60] w-full rounded-3xl border border-white/50 bg-white/90 p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          isFocused
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-900">
          Trending Searches
        </h4>

        {filteredSearches.length === 0 ? (
          <p className="rounded-2xl px-3 py-3 text-sm text-slate-500">
            No matches yet. Try another phrase.
          </p>
        ) : (
          <ul className="space-y-0.5" role="listbox">
            {filteredSearches.map((item) => (
              <li
                key={item.id}
                className="group"
              >
                <button
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                  type="button"
                  onMouseDown={() => {
                    setQuery(item.label);
                    setIsFocused(false);
                  }}
                >
                  <span className="text-sm font-medium text-slate-600">
                    {item.label}
                  </span>
                  <span className="material-symbols-outlined ml-auto text-xs text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
                    {item.iconName || 'trending_up'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
