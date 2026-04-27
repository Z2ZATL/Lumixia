import React from 'react';
import type { AuthLayoutProps } from '../types';
import { BrandHeader } from './BrandHeader';

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  rightPanelContent,
}) => {
  return (
    <main className="min-h-dvh bg-surface text-on-surface lg:h-dvh">
      <div className="flex min-h-dvh lg:h-dvh">
        <section className="left-panel-mesh relative z-10 flex w-full items-center justify-center px-4 py-10 sm:px-8 sm:py-12 lg:w-[45%] lg:px-24">
          <div className="relative flex w-full max-w-md flex-col gap-12 overflow-visible">
            <BrandHeader />
            {children}
          </div>
        </section>

        <section className="relative hidden w-[55%] overflow-hidden bg-surface-container-low p-8 lg:flex">
          <div className="ambient-glow absolute right-[-10%] top-[-10%] h-[600px] w-[600px] bg-primary/10 blur-[120px]" />
          <div className="ambient-glow absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] bg-primary/5 blur-[100px]" />

          <div className="glass-panel reflection-map relative z-20 flex h-full w-full max-w-full flex-col overflow-hidden rounded-glass border border-white/40 p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-80">
                UNLOCK INFINITE POTENTIAL: Lumixia Agentic AI
              </h3>
            </div>

            <div className="group relative flex-1 overflow-hidden rounded-[1.75rem] bg-surface-container-highest">
              {rightPanelContent || (
                <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(182,220,255,0.82),transparent_36%),linear-gradient(135deg,#e7f2fb_0%,#d7e8f8_38%,#c2daf0_100%)] p-8">
                  <div className="absolute inset-x-10 top-10 h-40 rounded-[2rem] border border-white/50 bg-white/35 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl" />
                  <div className="absolute right-8 top-24 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                  <div className="absolute bottom-12 left-10 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />

                  <div className="relative z-10 max-w-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-primary/70">
                      Private Agentic Intelligence
                    </p>
                    <h4 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                      Secure orchestration for a premium AI ecosystem.
                    </h4>
                    <p className="mt-4 text-base leading-relaxed text-slate-600">
                      Lumixia pairs passwordless access, managed billing, and
                      guided execution flows without exposing raw payment or
                      workspace internals to the browser.
                    </p>
                  </div>

                  <div className="relative z-10 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-white/60 bg-white/55 p-5 backdrop-blur-xl">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
                        Agent security
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">
                        Checkout-first billing, gated execution, and session-aware
                        profile hydration.
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/60 bg-white/55 p-5 backdrop-blur-xl">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
                        White-glove UX
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">
                        Split-screen onboarding, clean wallet states, and refined
                        live-workspace surfaces.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
