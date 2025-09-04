import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import AppShell from '@/components/layout/AppShell';
import NotificationsBridge from '@/components/notifications/NotificationsBridge';
import { AppRoutes } from '@/routes';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ConfirmDialog from '@/components/common/ConfirmDialog';
// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { kind?: 'error'|'success'|'info'|'warning'; message?: string } | undefined
      const msg = detail?.message || 'An error occurred.'
      const kind = detail?.kind || 'error'
      const fn = kind === 'success' ? toast.success : kind === 'info' ? toast.info : kind === 'warning' ? toast.warn : toast.error
      fn(msg, {
        className: '!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !shadow-lg !rounded-lg !border !border-gray-200 dark:!border-gray-700',
      })
    }
    window.addEventListener('app:toast', handler as EventListener)
    return () => window.removeEventListener('app:toast', handler as EventListener)
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <AppShell>
                <AppRoutes />
              </AppShell>
              <NotificationsBridge />
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                toastClassName="dark:bg-gray-800 dark:text-white"
                style={{
                  '--toastify-color-progress-light': '#2563eb',
                  '--toastify-color-progress-dark': '#3b82f6'
                } as React.CSSProperties}
              />
              <ReactQueryDevtools initialIsOpen={false} />
              <ConfirmDialog 
                open={false}
                title=""
                message=""
                onConfirm={() => {}}
                onCancel={() => {}}
              />
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
