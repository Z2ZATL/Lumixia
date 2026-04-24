import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CreditsModal } from '../../billing/components/CreditsModal';
import { useDashboard } from '../context/DashboardContext';
import { DashboardSidebar } from './DashboardSidebar';
import { FloatingDreMoButton } from './FloatingDreMoButton';
import { PopupModal } from './PopupModal';
import { RightRail } from './RightRail';

export const DashboardShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    closePopup,
    popupMessage,
    preferences,
    setRightRailCollapsed,
    syncLastRoute,
  } = useDashboard();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileRightRailOpen, setIsMobileRightRailOpen] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const isCreditsModalOpen = searchParams.get('billing') === 'center';

  const updateBillingModalState = (nextOpenState: boolean) => {
    const nextSearchParams = new URLSearchParams(location.search);

    if (nextOpenState) {
      nextSearchParams.set('billing', 'center');
    } else {
      nextSearchParams.delete('billing');
    }

    const nextSearch = nextSearchParams.toString();

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: !nextOpenState },
    );
  };

  useEffect(() => {
    void syncLastRoute(location.pathname).catch(() => undefined);
  }, [location.pathname, syncLastRoute]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
    setIsMobileRightRailOpen(false);
  }, [location.pathname]);

  const isRightRailCollapsed = preferences?.rightRailCollapsed ?? false;

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#F4F5F7]">
      <DashboardSidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenCreditsModal={() => updateBillingModalState(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            className="rounded-xl border border-slate-200 p-2 text-slate-700"
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2">
            <img
              alt="Lumixia Logo"
              className="h-8 w-8 object-contain"
              src="https://lumixia-ui-assets-prod.s3.ap-southeast-1.amazonaws.com/logo.svg"
            />
            <span className="text-sm font-bold text-slate-900">Lumixia</span>
          </div>
          <button
            className="rounded-xl border border-slate-200 p-2 text-slate-700"
            type="button"
            onClick={() => setIsMobileRightRailOpen(true)}
          >
            <span className="material-symbols-outlined">dashboard</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto bg-surface px-4 pb-4 pt-8 md:px-6 md:pt-12">
            <div className="mb-6 hidden justify-end xl:flex">
              <button
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
                type="button"
                onClick={() => {
                  void setRightRailCollapsed(!isRightRailCollapsed).catch(() => undefined);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isRightRailCollapsed ? 'right_panel_open' : 'right_panel_close'}
                </span>
                {isRightRailCollapsed ? 'Show Live Rail' : 'Hide Live Rail'}
              </button>
            </div>
            <Outlet />
          </main>

          <div
            className={`hidden h-full overflow-hidden border-l border-slate-200 transition-[width,opacity] duration-300 xl:block ${
              isRightRailCollapsed ? 'xl:w-0 xl:opacity-0' : 'xl:w-[300px] xl:opacity-100'
            }`}
          >
            <RightRail />
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[80] bg-slate-950/30 backdrop-blur-sm transition-opacity xl:hidden ${
          isMobileRightRailOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsMobileRightRailOpen(false)}
      />
      <div
        className={`fixed inset-y-0 right-0 z-[90] w-[88vw] max-w-[320px] transition-transform duration-300 xl:hidden ${
          isMobileRightRailOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <p className="text-sm font-bold text-slate-900">Live Activity</p>
            <button
              className="rounded-xl border border-slate-200 p-2 text-slate-700"
              type="button"
              onClick={() => setIsMobileRightRailOpen(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <RightRail />
          </div>
        </div>
      </div>

      <CreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => updateBillingModalState(false)}
      />
      <PopupModal message={popupMessage} onClose={closePopup} />
      <FloatingDreMoButton />
    </div>
  );
};
