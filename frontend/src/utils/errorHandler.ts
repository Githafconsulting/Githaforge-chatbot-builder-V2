/**
 * Error Handling Utility
 * Centralized error handling with user-friendly toast notifications
 */

import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface ErrorResponse {
  detail?: string | { msg: string; type: string }[];
  message?: string;
  error?: string;
}

/**
 * Extract error message from various error formats
 */
export const getErrorMessage = (error: unknown): string => {
  // Handle AxiosError
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ErrorResponse>;

    // Server returned error response
    if (axiosError.response?.data) {
      const data = axiosError.response.data;

      // Handle FastAPI validation errors (array format)
      if (Array.isArray(data.detail)) {
        const messages = data.detail.map(err => err.msg).join(', ');
        return messages || 'Validation error occurred';
      }

      // Handle string detail
      if (typeof data.detail === 'string') {
        return data.detail;
      }

      // Handle message field
      if (data.message) {
        return data.message;
      }

      // Handle error field
      if (data.error) {
        return data.error;
      }
    }

    // Network errors
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Network error. Please check your connection.';
    }

    // Timeout errors
    if (axiosError.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }

    // HTTP status code messages
    if (axiosError.response?.status) {
      switch (axiosError.response.status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'Authentication failed. Please log in again.';
        case 403:
          return 'Access denied. You do not have permission for this action.';
        case 404:
          return 'Resource not found.';
        case 409:
          return 'Conflict. The resource already exists or cannot be modified.';
        case 422:
          return 'Validation error. Please check your input.';
        case 429:
          return 'Too many requests. Please slow down.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
          return 'Bad gateway. The server is temporarily unavailable.';
        case 503:
          return 'Service unavailable. Please try again later.';
        default:
          return `Request failed with status ${axiosError.response.status}`;
      }
    }

    // Generic axios error message
    return axiosError.message || 'An error occurred';
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Unknown error type
  return 'An unexpected error occurred';
};

/**
 * Show error toast notification
 */
export const showErrorToast = (error: unknown, customMessage?: string): void => {
  const message = customMessage || getErrorMessage(error);
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      background: '#1e293b',
      color: '#f1f5f9',
      border: '1px solid #ef4444',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#1e293b',
    },
  });
};

/**
 * Show success toast notification
 */
export const showSuccessToast = (message: string): void => {
  toast.success(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#1e293b',
      color: '#f1f5f9',
      border: '1px solid #10b981',
    },
    iconTheme: {
      primary: '#10b981',
      secondary: '#1e293b',
    },
  });
};

/**
 * Show warning toast notification
 */
export const showWarningToast = (message: string): void => {
  toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      background: '#1e293b',
      color: '#f1f5f9',
      border: '1px solid #f59e0b',
    },
  });
};

/**
 * Show info toast notification
 */
export const showInfoToast = (message: string): void => {
  toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#1e293b',
      color: '#f1f5f9',
      border: '1px solid #3b82f6',
    },
  });
};

/**
 * Handle async operation with automatic error handling
 */
export const handleAsyncOperation = async <T>(
  operation: () => Promise<T>,
  successMessage?: string,
  errorMessage?: string
): Promise<T | null> => {
  try {
    const result = await operation();
    if (successMessage) {
      showSuccessToast(successMessage);
    }
    return result;
  } catch (error) {
    showErrorToast(error, errorMessage);
    return null;
  }
};

/**
 * Error boundary fallback component helper
 */
export const getErrorBoundaryMessage = (error: Error): string => {
  if (error.message.includes('chunk')) {
    return 'Failed to load application module. Please refresh the page.';
  }
  if (error.message.includes('network')) {
    return 'Network connection lost. Please check your internet connection.';
  }
  return 'Something went wrong. Please refresh the page and try again.';
};
