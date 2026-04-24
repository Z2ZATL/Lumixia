import React from 'react';
import { DashboardTopHero } from '../components/DashboardTopHero';
import { DiscoverySections } from '../components/DiscoverySections';
import { useDashboard } from '../context/DashboardContext';

export const DashboardHomePage: React.FC = () => {
  const { errorMessage, isLoading, refreshDashboard } = useDashboard();

  return (
    <div className="h-full">
      <DashboardTopHero />

      {isLoading ? (
        <div className="mx-auto grid max-w-6xl gap-6 pb-20 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[220px] animate-pulse rounded-[2rem] bg-white shadow-sm"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-error/20 bg-white p-8 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-error">
            Dashboard Error
          </p>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            We couldn&apos;t load your dashboard content
          </h3>
          <p className="mt-3 text-slate-600">{errorMessage}</p>
          <button
            className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5"
            type="button"
            onClick={() => {
              void refreshDashboard();
            }}
          >
            Retry Dashboard Load
          </button>
        </div>
      ) : (
        <DiscoverySections />
      )}
    </div>
  );
};
