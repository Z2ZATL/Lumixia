import React from 'react';
import type { AuthLayoutProps } from '../types';
import { BrandHeader } from './BrandHeader';

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  rightPanelContent,
}) => {
  return (
    <main className="min-h-screen bg-surface text-on-surface lg:h-screen">
      <div className="flex min-h-screen lg:h-screen">
        <section className="left-panel-mesh relative z-10 flex w-full items-center justify-center px-12 py-12 lg:w-[45%] lg:px-24">
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
                <img
                  alt="Agentic AI Visualization"
                  className="h-full w-full object-cover brightness-95 transition-all duration-700 group-hover:brightness-100"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDO80zFzbyqu6QZbpkRbYuAOpOddfc1mdskPjMcoGwwD-p1el2B5APvb1qji8NvEp5goWjFWgN_4EKBxV52rJy_Wz7L024alpd3AxLY0PpdCtFMoadc5yLxXCp3v9b3B_ORUyNiYYsNqUBSSYvQ23SCdKSPrYUOy6BCi7ZOOGgRzX7e47xwIeufbpBl_QONDKc4U8fGCSJzQF6IcaPARebHlUwJDzTTjoPtrRZ2eQErpF8dvWP5otmRvZolatvDTJ9_OabbmFrVmPE"
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
