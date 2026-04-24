import React from 'react';
import { Link } from 'react-router-dom';

interface LockedRoutePageProps {
  title: string;
  message: string;
}

export const LockedRoutePage: React.FC<LockedRoutePageProps> = ({
  title,
  message,
}) => {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center px-4 py-10">
      <div className="dashboard-glass-panel w-full max-w-2xl rounded-[2rem] border border-white/20 p-10 text-center">
        <span className="material-symbols-outlined icon-filled text-5xl text-primary">
          lock
        </span>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-primary">
          Dashboard Module
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
          {message}
        </p>
        <Link
          className="mt-8 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5"
          to="/dashboard"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
};
