import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppSession } from '../../../app/AppSessionContext';

const DASHBOARD_NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: 'home', end: true },
  { to: '/dashboard/discover', label: 'Discover', icon: 'explore' },
  { to: '/dashboard/studio', label: 'Studio', icon: 'architecture' },
  { to: '/dashboard/split-pay', label: 'Split & Pay', icon: 'payments' },
  { to: '/dashboard/settings', label: 'Settings', icon: 'settings' },
];

interface DashboardSidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenCreditsModal: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  onOpenCreditsModal,
}) => {
  const {
    creditAccountStatus,
    creditBalance,
    creditState,
    displayName,
    handleSignOut,
    isSigningOut,
  } =
    useAppSession();

  const userInitial = (displayName.trim().charAt(0) || 'L').toUpperCase();
  const creditLabel =
    creditState === 'ready' && creditBalance !== null
      ? creditBalance.toLocaleString()
      : creditState === 'loading'
        ? 'Syncing...'
        : 'Unavailable';
  const walletStatusLabel =
    creditAccountStatus === 'restricted'
      ? 'Restricted'
      : creditAccountStatus === 'closed'
        ? 'Closed'
        : creditAccountStatus === 'active'
          ? 'Active'
          : null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity md:hidden ${
          isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-5 py-8 transition-transform duration-300 md:static md:w-[92px] md:translate-x-0 xl:w-[230px] ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="mb-10 flex items-center gap-3">
            <img
              alt="Lumixia Logo"
              className="h-9 w-9 object-contain"
              src="https://lumixia-ui-assets-prod.s3.ap-southeast-1.amazonaws.com/logo.svg"
            />
            <div className="md:hidden xl:block">
              <h1 className="leading-none text-lg font-extrabold tracking-tight text-slate-900">
                Lumixia
              </h1>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                AI Lifestyle Ecosystem
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {DASHBOARD_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'border-r-[3px] border-r-[#005A9C] bg-[#005A9C]/5 font-semibold text-[#005A9C]'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`
                }
                onClick={onCloseMobile}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                <span className="md:hidden xl:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {userInitial}
            </div>
            <div className="min-w-0 md:hidden xl:block">
              <p className="truncate text-sm font-bold text-slate-900">
                {displayName || 'Lumixia Member'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-white/70 px-3 py-2">
            <span className="material-symbols-outlined icon-filled text-base text-primary">
              toll
            </span>
            <div className="min-w-0 md:hidden xl:block">
              <p className="mb-0.5 text-xs leading-none text-slate-500">
                Lumixia Credits
              </p>
              <p className="text-sm font-extrabold tracking-tight text-primary">
                {creditLabel}
              </p>
              {walletStatusLabel && (
                <p
                  className={`mt-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                    walletStatusLabel === 'Restricted'
                      ? 'text-amber-600'
                      : walletStatusLabel === 'Closed'
                        ? 'text-red-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {walletStatusLabel}
                </p>
              )}
            </div>
            <button
              aria-label="Open Lumixia billing center"
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-primary/20 px-2 py-1 text-[10px] font-semibold text-primary/70 transition-colors hover:border-primary/35 hover:text-primary"
              type="button"
              onClick={() => {
                onCloseMobile();
                onOpenCreditsModal();
              }}
            >
              <span className="material-symbols-outlined text-[14px]">
                open_in_new
              </span>
              <span className="hidden xl:inline">Billing</span>
            </button>
          </div>

          <button
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isSigningOut}
            onClick={() => {
              onCloseMobile();
              void handleSignOut();
            }}
          >
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>
    </>
  );
};
