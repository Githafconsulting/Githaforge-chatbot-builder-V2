import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-theme-primary"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full px-4 py-2.5 rounded-lg border-2 transition-all',
              'bg-slate-900/40 backdrop-blur-sm text-[var(--text-primary)]',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                : 'border-slate-700 hover:border-purple-500/50 focus:border-purple-500 focus:ring-purple-500/30',
              icon && iconPosition === 'left' && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              props.disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            {...props}
          />

          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted">
              {icon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-sm text-theme-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';


interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-theme-primary"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg border-2 transition-all resize-none',
            'bg-slate-900/40 backdrop-blur-sm text-[var(--text-primary)]',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
              : 'border-slate-700 hover:border-purple-500/50 focus:border-purple-500 focus:ring-purple-500/30',
            props.disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-sm text-theme-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';


interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      options,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-theme-primary"
          >
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg border-2 transition-all',
            'bg-theme-primary text-theme-primary',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-theme focus:border-primary-500 focus:ring-primary-500',
            props.disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-sm text-theme-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
