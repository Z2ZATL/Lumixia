import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { IntentPills } from './IntentPills';
import { SearchBoxWithDropdown } from './SearchBoxWithDropdown';

function getGreetingPrefix() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  }

  if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  }

  return 'Good Night';
}

export const DashboardTopHero: React.FC = () => {
  const { displayName } = useDashboard();
  const greeting = useMemo(
    () => `${getGreetingPrefix()}, ${displayName || 'Lumixia Member'}.`,
    [displayName],
  );

  return (
    <header className="mx-auto mb-12 max-w-4xl">
      <div className="mb-10 text-center">
        <h2 className="mb-1.5 text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
          {greeting}
        </h2>
        <p className="mb-6 text-base font-medium text-on-surface-variant">
          How can I elevate your lifestyle today?
        </p>
        <IntentPills />
        <SearchBoxWithDropdown />
      </div>
    </header>
  );
};
