import type { Variants } from 'framer-motion';
import type { TransitionDirection } from '../types';

export const ANIMATION_CONFIG = {
  exit: {
    duration: 0.18,
    ease: [0.4, 0, 1, 1] as const,
    translation: 15,
  },
  enter: {
    duration: 0.45,
    ease: [0.22, 1, 0.36, 1] as const,
    stagger: 0.04,
    translation: 25,
  },
};

const getEnterOffset = (direction: TransitionDirection) =>
  direction === 'forward'
    ? ANIMATION_CONFIG.enter.translation
    : -ANIMATION_CONFIG.enter.translation;

const getExitOffset = (direction: TransitionDirection) =>
  direction === 'forward'
    ? -ANIMATION_CONFIG.exit.translation
    : ANIMATION_CONFIG.exit.translation;

export const pageVariants: Variants = {
  initial: (direction: TransitionDirection = 'forward') => ({
    opacity: 0,
    x: getEnterOffset(direction),
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_CONFIG.enter.duration,
      ease: ANIMATION_CONFIG.enter.ease,
      when: 'beforeChildren',
    },
  },
  exit: (direction: TransitionDirection = 'forward') => ({
    opacity: 0,
    x: getExitOffset(direction),
    transition: {
      duration: ANIMATION_CONFIG.exit.duration,
      ease: ANIMATION_CONFIG.exit.ease,
      when: 'afterChildren',
    },
  }),
};

export const childVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_CONFIG.enter.duration,
      ease: ANIMATION_CONFIG.enter.ease,
    },
  },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: ANIMATION_CONFIG.enter.stagger,
      delayChildren: ANIMATION_CONFIG.enter.stagger,
    },
  },
};

export const acceleratedStyle = {
  willChange: 'opacity, transform',
  transform: 'translateZ(0)',
};
