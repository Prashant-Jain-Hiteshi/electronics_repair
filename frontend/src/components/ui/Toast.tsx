import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ToastMessage } from '@/types';
import { useUIStore } from '@/stores/useUIStore';

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
  autoDismiss?: boolean;
  dismissAfter?: number;
}

const toastIcons = {
  success: (
    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

const toastBgColors = {
  success: 'bg-green-50',
  error: 'bg-red-50',
  info: 'bg-blue-50',
  warning: 'bg-yellow-50',
};

const toastTextColors = {
  success: 'text-green-800',
  error: 'text-red-800',
  info: 'text-blue-800',
  warning: 'text-yellow-800',
};

export const Toast: React.FC<ToastProps> = ({
  message,
  onDismiss,
  autoDismiss = true,
  dismissAfter = 5000,
}) => {
  const timerRef = useRef<NodeJS.Timeout>();
  const { removeToast } = useUIStore();

  useEffect(() => {
    if (autoDismiss) {
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, dismissAfter);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoDismiss, dismissAfter]);

  const handleDismiss = () => {
    removeToast(message.id);
    onDismiss(message.id);
  };

  return (
    <div
      className={`rounded-md ${toastBgColors[message.type]} p-4 mb-2 shadow-lg transition-all duration-300 transform hover:scale-[1.02]`}
      role="alert"
      onClick={handleDismiss}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {toastIcons[message.type]}
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium ${toastTextColors[message.type]}`}>
            {message.message}
          </p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              className={`inline-flex rounded-md ${toastBgColors[message.type]} p-1.5 ${toastTextColors[message.type]} hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600`}
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-xs space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast}
          onDismiss={removeToast}
          autoDismiss
          dismissAfter={5000}
        />
      ))}
    </div>
  );
};
