import React from 'react';

interface ComingSoonVeilProps {
  className?: string;
  label?: string;
}

export const ComingSoonVeil: React.FC<ComingSoonVeilProps> = ({
  className = '',
  label = 'Coming soon',
}) => {
  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/35 backdrop-blur-md ${className}`}
    >
      <div className="rounded-full border border-white/60 bg-white/85 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-primary shadow-lg">
        {label}
      </div>
    </div>
  );
};
