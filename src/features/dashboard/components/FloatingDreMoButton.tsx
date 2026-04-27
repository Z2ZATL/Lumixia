import React from 'react';
import { useDashboard } from '../context/DashboardContext';

export const FloatingDreMoButton: React.FC = () => {
  const { openPopup } = useDashboard();

  return (
    <button
      aria-label="Open DreMo preview"
      className="group fixed bottom-4 right-4 z-[100] transition-all duration-300 active:scale-95 md:bottom-8 md:right-8"
      type="button"
      onClick={() => openPopup('DreMo is unlocking in a future Lumixia phase.')}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl md:blur-2xl md:motion-safe:animate-pulse" />
        <img
          alt="DreMo Icon"
          className="relative z-10 h-[72px] w-[72px] object-contain drop-shadow-[0_0_16px_rgba(161,201,255,0.35)] md:h-[120px] md:w-[120px] md:drop-shadow-[0_0_20px_rgba(161,201,255,0.4)]"
          src="https://lumixia-ui-assets-prod.s3.ap-southeast-1.amazonaws.com/DreMo-Icon.svg"
        />
      </div>
    </button>
  );
};
