import React from 'react';
import { motion } from 'framer-motion';
import type { BrandHeaderProps } from '../types';
import { acceleratedStyle } from '../config/animations';

const DEFAULT_LOGO = 'https://lumixia-ui-assets-prod.s3.ap-southeast-1.amazonaws.com/logo.svg';
const DEFAULT_TITLE = 'Lumixia';
const DEFAULT_SUBTITLE = 'Agentic AI';

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  logoSrc = DEFAULT_LOGO,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
}) => {
  return (
    <motion.div
      className="hardware-accelerated flex items-center gap-4"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={acceleratedStyle}
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-transparent lg:h-16 lg:w-16">
        <img
          alt="Lumixia Crystal Prism Logo"
          className="h-full w-full object-contain"
          src={logoSrc}
        />
      </div>
      <div>
        <h2 className="text-[1.95rem] font-extrabold leading-none tracking-[-0.04em] text-on-surface lg:text-[2.2rem]">
          {title}
        </h2>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-primary opacity-80 lg:text-[0.82rem]">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
};
