import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useNotifications } from '@/hooks/useNotifications';
import SkipLink from '@/components/a11y/SkipLink';
import { LiveRegion } from '@/components/a11y/LiveRegion';

// (Theme toggle icons removed; app locked to dark)

interface AppShellProps {
  children: ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isConnected: isSocketConnected } = useSocket();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  

  // Navigation items
  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'My Devices', path: '/my-devices', icon: 'devices' },
    { name: 'Repair Orders', path: '/my-repairs', icon: 'build' },
    { name: 'Create Repair', path: '/create-repair', icon: 'add_circle' },
  ];

  const authPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
  const shelllessPrefixes = ['/admin', '/technician'];
  const isAuthRoute = authPaths.some((p) => location.pathname.startsWith(p));
  const isShelllessRoute = shelllessPrefixes.some((p) => location.pathname.startsWith(p));

  if (isAuthRoute || isShelllessRoute) {
    // Render children without app chrome on auth pages and on routes with their own shells (admin/technician)
    return (
      <>{children}</>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white flex flex-col">
      <SkipLink />
      {/* Live region to announce route changes */}
      <LiveRegion politeness="polite" />
      {/* Header */}
      <header className="bg-[#12151d] shadow-sm border-b border-white/10" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <img
                  className="h-8 w-auto"
                  src="/logo.svg"
                  alt="Electronics Repair"
                />
                <span className="ml-2 text-xl font-semibold text-white">
                  Electronics Repair
                </span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-1.5 rounded-md bg-white/5 border border-white/10">
                <span className={`h-2.5 w-2.5 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
                <span className="text-sm font-medium text-slate-300">
                  {isSocketConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {user ? (
                <div className="ml-4 flex items-center">
                  {/* Notifications */}
                  <Link
                    to="/notifications"
                    className="relative rounded-md border border-white/10 bg-white/5 px-3 py-2 mr-3 hover:bg-white/10"
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] h-5 min-w-[1.25rem] px-1">{unreadCount}</span>
                    )}
                  </Link>
                  <div className="relative">
                    {(() => {
                      const f = (user as any)?.firstName?.[0] || (user as any)?.displayName?.[0] || (user as any)?.email?.[0] || 'U';
                      const l = (user as any)?.lastName?.[0] || '';
                      const initials = `${String(f)}${String(l)}`.toUpperCase().slice(0, 2);
                      return (
                        <Link
                          to="/profile"
                          className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          id="user-menu-button"
                          aria-label="Open profile"
                          title="Profile"
                        >
                          <span className="sr-only">Open profile</span>
                          <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-semibold">
                            {initials}
                          </div>
                        </Link>
                      );
                    })()}
                  </div>
                  <button
                    onClick={logout}
                    className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <Link
                    to="/login"
                    className="px-4 py-2 border border-white/10 text-sm font-medium rounded-md text-blue-300 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-700 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden items-stretch">
        {/* Sidebar */}
        {user && (
          <nav className="hidden md:flex bg-[#12151d] w-64 flex-col border-r border-white/10 flex-none relative z-20" aria-label="Primary">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex-1 px-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center gap-3 px-3 h-10 text-sm leading-5 font-medium rounded-md min-w-0 ${
                      location.pathname === item.path
                        ? 'bg-white/10 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                    title={item.name}
                  >
                    <span className="material-icons-outlined flex-none h-6 w-6">{item.icon}</span>
                    <span className="flex-1 truncate">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        )}

        {/* Page content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1218] min-w-0 relative z-10">
          <MainContent>
            <div className="container mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </MainContent>
        </div>
      </div>
    </div>
  );
};

export default AppShell;

// Internal component to manage focus and landmark roles for main content
const MainContent: React.FC<{ children: ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLElement>(null)
  const location = useLocation()

  useEffect(() => {
    // Move focus to main on route changes
    ref.current?.focus({ preventScroll: true })
    // Announce the route change for screen readers
    const title = document.title || 'Page updated'
    const ev = new CustomEvent('app:announce', { detail: title })
    // Bridge to LiveRegion via a small listener in App.tsx (optional) or use LiveRegion directly
    window.dispatchEvent(ev)
  }, [location.pathname])

  return (
    <main
      id="main-content"
      ref={ref}
      role="main"
      tabIndex={-1}
      className="flex-1 overflow-y-auto focus:outline-none py-6 text-white"
    >
      {children}
    </main>
  )
}
