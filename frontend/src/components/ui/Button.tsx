import React from 'react';
import { motion } from 'framer-motion';
import { buttonTapAnimation } from '../../utils/animations';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  iconOnly = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 shadow-sm hover:shadow-md active:shadow-primary dark:bg-primary-500 dark:hover:bg-primary-600',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus-visible:ring-secondary-500 shadow-sm hover:shadow-md active:shadow-secondary dark:bg-secondary-500 dark:hover:bg-secondary-600',
    accent: 'bg-accent-600 text-white hover:bg-accent-700 focus-visible:ring-accent-500 shadow-sm hover:shadow-md active:shadow-accent dark:bg-accent-500 dark:hover:bg-accent-600',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-500 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20',
    ghost: 'text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm hover:shadow-md dark:bg-red-500 dark:hover:bg-red-600',
    success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-sm hover:shadow-md dark:bg-green-500 dark:hover:bg-green-600',
  };

  const sizeClasses = {
    xs: iconOnly ? 'p-1.5 text-xs' : 'px-2.5 py-1.5 text-xs',
    sm: iconOnly ? 'p-2 text-sm' : 'px-3 py-2 text-sm',
    md: iconOnly ? 'p-2.5 text-base' : 'px-4 py-2.5 text-base',
    lg: iconOnly ? 'p-3 text-lg' : 'px-5 py-3 text-lg',
    xl: iconOnly ? 'p-4 text-xl' : 'px-6 py-4 text-xl',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  return (
    <motion.button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      whileTap={disabled || isLoading ? undefined : buttonTapAnimation}
      whileHover={disabled || isLoading ? undefined : { scale: 1.02 }}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading ? (
        <>
          <motion.div
            className={clsx(
              'border-2 border-white border-t-transparent rounded-full',
              iconSizes[size]
            )}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          {!iconOnly && <span>Loading...</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className={iconSizes[size]}>{icon}</span>}
          {!iconOnly && children}
          {icon && iconPosition === 'right' && <span className={iconSizes[size]}>{icon}</span>}
          {iconOnly && icon && <span className={iconSizes[size]}>{icon}</span>}
        </>
      )}
    </motion.button>
  );
};
