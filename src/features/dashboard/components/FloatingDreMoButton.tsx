import React from 'react';
import { useDashboard } from '../context/DashboardContext';

export const FloatingDreMoButton: React.FC = () => {
  const { openPopup } = useDashboard();

  return (
    <button
      className="group fixed bottom-6 right-6 z-[100] transition-all duration-300 active:scale-95 md:bottom-8 md:right-8"
      type="button"
      onClick={() => openPopup('DreMo is unlocking in a future Lumixia phase.')}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
        <img
          alt="DreMo Icon"
          className="relative z-10 h-[92px] w-[92px] object-contain drop-shadow-[0_0_20px_rgba(161,201,255,0.4)] md:h-[120px] md:w-[120px]"
          src="https://lumixia-ui-assets-prod.s3.ap-southeast-1.amazonaws.com/DreMo-Icon.svg"
        />
      </div>
    </button>
  );
};
