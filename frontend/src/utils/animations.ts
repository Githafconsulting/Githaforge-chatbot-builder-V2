/**
 * Framer Motion Animation Variants and Utilities
 */

import type { Variants } from 'framer-motion';

// Fade In Animation
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

// Fade In Up Animation
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
};

// Fade In Down Animation
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

// Slide In Right Animation
export const slideInRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.3 } },
};

// Slide In Left Animation
export const slideInLeft: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
  exit: { x: '-100%', opacity: 0, transition: { duration: 0.3 } },
};

// Scale In Animation
export const scaleIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: { scale: 0.8, opacity: 0, transition: { duration: 0.2 } },
};

// Stagger Container
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Stagger Item
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// Modal Animation
export const modalVariants: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.2 } },
};

// Backdrop Animation
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Card Hover Animation
export const cardHoverVariants: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    y: -5,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// Button Tap Animation
export const buttonTapAnimation = {
  scale: 0.95,
  transition: { duration: 0.1 },
};

// Bounce Animation
export const bounceAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

// Pulse Animation
export const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

// Page Transition
export const pageTransition: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.3 },
  },
};

// Loading Spinner Variants
export const spinnerVariants: Variants = {
  start: {
    rotate: 0,
  },
  end: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Notification Toast
export const toastVariants: Variants = {
  hidden: { x: 400, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};
