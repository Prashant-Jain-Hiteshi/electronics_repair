import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Skeleton, SkeletonText, TableSkeleton } from '@/components/ui/Skeleton';
import VisuallyHidden from '@/components/a11y/VisuallyHidden';
import { useAuth } from '../hooks/use-auth';
import { useRepairs } from '../hooks/use-repairs';
import { RepairOrder, RepairStatus, RepairPriority, DeviceInfo } from '../types/repair';

// Chart component types
type ChartView = 'status' | 'device';

type ChartData = {
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor: string[];
    borderColor?: string[];
    borderWidth?: number;
  }>;
};

// Stats type for the dashboard
type Stats = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  revenue: number;
};

// Extend the RepairOrder type to include any missing properties used in the component
interface ExtendedRepairOrder extends RepairOrder {
  device: string | DeviceInfo;
  issue: string;
  status: RepairStatus;
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Status colors for badges
const statusColors: Record<RepairStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  diagnosis: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  waiting_parts: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  awaiting_parts: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  in_progress: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  delivered: 'bg-green-600 text-white',
  canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
};

// Status labels for display
const statusLabels: Record<RepairStatus, string> = {
  new: 'New',
  diagnosis: 'In Diagnosis',
  waiting_parts: 'Waiting for Parts',
  awaiting_parts: 'Awaiting Parts',
  in_progress: 'In Progress',
  completed: 'Completed',
  delivered: 'Delivered',
  canceled: 'Canceled'
};

// Helper function to get status badge color
const getStatusBadgeColor = (status: RepairStatus): string => {
  return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};

// Remove duplicate type definitions since we're importing them from '../types/repair'

// Small inline icons for metric cards (match admin)
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 7h11v8H3z" />
    <path d="M14 11h4l3 3v1h-7z" />
    <circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
  </svg>
)
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l4 2" />
  </svg>
)
const IconProgress = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
)
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

// Status map for reference
const statusMap: Record<RepairStatus, string> = statusLabels;
 
const formatCurrency = (n: number | null | undefined) =>
  typeof n === 'number' ? n.toLocaleString(undefined, { style: 'currency', currency: 'INR' }) : '-'

// Helper function to get device display name
const getDeviceDisplayName = (device: string | DeviceInfo): string => {
  if (!device) return 'Unknown Device';
  if (typeof device === 'string') return device;
  return `${device.brand} ${device.model}`.trim();
};

// Consolidated types are defined once at the top of the file.

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const displayName = (user as any)?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || (user as any)?.name || (user as any)?.email || 'Customer'
  const { repairs = [], loading, error } = useRepairs();
  const [query, setQuery] = useState('');
  const [chartView, setChartView] = useState<ChartView>('status');
  
  // Calculate stats
  const stats = useMemo<Stats>(() => ({
    total: repairs.length,
    completed: repairs.filter(r => r.status === 'completed').length,
    inProgress: repairs.filter(r => r.status === 'in_progress').length,
    pending: repairs.filter(r => r.status === 'awaiting_parts' || r.status === 'waiting_parts').length,
    revenue: repairs.reduce((sum, r) => sum + ((r as any).estimatedCost ?? (r as any).actualCost ?? 0), 0)
  }), [repairs]);

  // Filter repairs based on search query
  const filteredData = useMemo(() => {
    if (!query.trim()) return repairs;
    
    const q = query.toLowerCase().trim();
    return repairs.filter((repair) => {
      if (!repair) return false;
      
      // Check device name (handle both string and DeviceInfo)
      const deviceName = getDeviceDisplayName(repair.device).toLowerCase();
      
      return (
        deviceName.includes(q) ||
        repair.issue?.toLowerCase().includes(q) ||
        repair.status?.toLowerCase().includes(q) ||
        repair.id?.toLowerCase().includes(q)
      );
    });
  }, [query, repairs]);
  
  // Prepare chart data
  const chartData = useMemo(() => {
    if (chartView === 'status') {
      return {
        labels: ['Completed', 'In Progress', 'Pending'],
        datasets: [{
          data: [stats.completed, stats.inProgress, stats.pending],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(249, 115, 22, 0.8)'
          ]
        }]
      };
    } else {
      // Group by device type
      const deviceCounts = repairs.reduce((acc, repair) => {
        const device = getDeviceDisplayName(repair.device);
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        labels: Object.keys(deviceCounts),
        datasets: [{
          data: Object.values(deviceCounts),
          backgroundColor: Object.keys(deviceCounts).map((_, i) => 
            `hsl(${(i * 137.508) % 360}, 70%, 60%)`
          )
        }]
      };
    }
  }, [chartView, repairs, stats]);

  // Removed duplicate chartView state and legacy filtering effect
  const [chartMode, setChartMode] = useState<'line' | 'pie'>('line');
  
  // Status badges for repair orders
  const statusBadges = useMemo(() => {
    if (!repairs || repairs.length === 0) return [];
    
    // Count status occurrences
    const statusCount = repairs.reduce<Record<RepairStatus, number>>(
      (acc, repair) => {
        acc[repair.status] = (acc[repair.status] || 0) + 1;
        return acc;
      },
      {
        new: 0,
        diagnosis: 0,
        waiting_parts: 0,
        in_progress: 0,
        completed: 0,
        delivered: 0,
        canceled: 0,
        awaiting_parts: 0
      } as Record<RepairStatus, number>
    );

    return Object.entries(statusCount)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        status: status as RepairStatus,
        count,
        label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        color: statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      }));
  }, [repairs]);

  // Removed duplicate stats array block (kept typed Stats object above)

  const filtered = useMemo(() => {
    if (!repairs) return [];
    const q = query.trim().toLowerCase();
    if (!q) return repairs;
    
    return repairs.filter((r) =>
      [r.id, getDeviceDisplayName(r.device), r.issue, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [repairs, query]);

  // Status counts for the chart
  const { statusCounts, pieData } = useMemo(() => {
    type StatusCounts = Record<RepairStatus, number> & {
      total: number;
    };

    const defaultStatus: StatusCounts = {
      new: 0,
      diagnosis: 0,
      waiting_parts: 0,
      in_progress: 0,
      completed: 0,
      delivered: 0,
      canceled: 0,
      awaiting_parts: 0,
      total: 0
    };

    if (!repairs || repairs.length === 0) {
      return {
        statusCounts: defaultStatus,
        pieData: [] as Array<{ label: string; value: number; color: string }>
      };
    }
    
    const byStatus = repairs.reduce<Record<RepairStatus, number>>(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {
        new: 0,
        diagnosis: 0,
        waiting_parts: 0,
        in_progress: 0,
        completed: 0,
        delivered: 0,
        canceled: 0,
        awaiting_parts: 0
      } as Record<RepairStatus, number>
    );
    
    const statusCounts = {
      total: repairs.length,
      byStatus
    };
    
    const pieData = [
      { 
        label: 'New', 
        value: byStatus.new, 
        color: '#3B82F6' // blue-500
      },
      { 
        label: 'In Progress', 
        value: byStatus.in_progress, 
        color: '#7C6FF1' // indigo-400
      },
      { 
        label: 'Awaiting Parts', 
        value: byStatus.awaiting_parts + byStatus.waiting_parts, 
        color: '#F59E0B' // amber-500
      },
      { 
        label: 'Completed', 
        value: byStatus.completed, 
        color: '#10B981' // emerald-500
      },
      { 
        label: 'Delivered', 
        value: byStatus.delivered, 
        color: '#8B5CF6' // violet-500
      },
      { 
        label: 'Canceled', 
        value: byStatus.canceled, 
        color: '#EF4444' // red-500
      }
    ].filter(item => item.value > 0); // Only show statuses with counts > 0
    
    return { statusCounts, pieData };
  }, [repairs]);

  const seriesData = useMemo(() => {
    if (!repairs || repairs.length === 0) return [];
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
    const currentYear = new Date().getFullYear();
    
    // Initialize data for all months with 0
    const monthlyData = months.reduce<Record<typeof months[number], number>>(
      (acc, month) => {
        acc[month] = 0;
        return acc;
      },
      {} as Record<typeof months[number], number>
    );
    
    // Count repairs per month
    repairs.forEach(repair => {
      if (!repair.updatedAt) return;
      
      const date = new Date(repair.updatedAt);
      // Only include dates from the current year
      if (date.getFullYear() === currentYear) {
        const month = months[date.getMonth()];
        if (month) { // Ensure month is defined
          monthlyData[month] = (monthlyData[month] || 0) + 1;
        }
      }
    });
    
    return Object.entries(monthlyData).map(([label, value]) => ({
      label,
      value
    }));
  }, [repairs]);

  // Loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Dashboard</h1>
            <div className="relative">
              <Skeleton className="h-9 w-64" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-xl p-6 mb-8 bg-white border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <SkeletonText lines={2} />
            <div className="mt-4 flex gap-3">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-44" />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-2"><Skeleton className="h-6 w-12" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-5 w-20" />
            </div>
            <TableSkeleton rows={5} cols={6} />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="alert" aria-live="assertive">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 text-lg">Error loading repairs: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <label htmlFor="search-repairs" className="sr-only">Search repairs</label>
              <input
                type="text"
                placeholder="Search repairs..."
                className="w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                id="search-repairs"
                aria-label="Search repairs"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl p-6 mb-8 bg-white border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {displayName}!</h2>
          <p className="text-gray-600 dark:text-gray-300">Track your device repairs and manage new orders here.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/my-repairs" className="rounded-md px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/30">
              View all orders
            </Link>
            <Link to="/create-repair" className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors dark:bg-blue-600 dark:hover:bg-blue-500">
              Create Repair Order
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { 
              name: 'Total Repairs', 
              value: repairs.length,
              icon: <WrenchScrewdriverIcon className="h-6 w-6 text-blue-500" />
            },
            { 
              name: 'In Progress', 
              value: repairs.filter(r => r.status === 'in_progress').length,
              icon: <ClockIcon className="h-6 w-6 text-yellow-500" />
            },
            { 
              name: 'Awaiting Parts', 
              value: repairs.filter(r => r.status === 'awaiting_parts').length,
              icon: <CubeIcon className="h-6 w-6 text-purple-500" />
            },
            { 
              name: 'Completed', 
              value: repairs.filter(r => r.status === 'completed').length,
              icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />
            }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-md p-3">
                    {stat.icon}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {stat.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stat.value}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Repairs */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Repairs</h2>
            <Link to="/my-repairs" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              View all
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {repairs.slice(0, 5).map((repair) => (
                <li key={repair.id}>
                  <Link to={`/repairs/${repair.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="px-4 py-4 sm:px-6">
                      <div key={repair.id} className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {getDeviceDisplayName(repair.device)}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              Ticket #{repair.id.slice(0, 8)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(repair.status)}`}>
                            {statusLabels[repair.status] || repair.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 line-clamp-2">
                          {repair.issue}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                          <span>
                            {repair.createdAt ? `Created ${format(new Date(repair.createdAt), 'MMM d, yyyy')}` : 'No date'}
                          </span>
                          <Link 
                            to={`/repairs/${repair.id}`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {new Date(repair.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                          <CurrencyDollarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {formatCurrency((repair as any).estimatedCost ?? (repair as any).actualCost)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Overview + Chart grid to resemble the sample two-column layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-0 lg:col-span-2 overflow-hidden dark:border-white/10 dark:bg-[#12151d]">
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
            <h3 className="text-gray-900 dark:text-white font-semibold">Repair Overview</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setChartMode('line')}
                      className={`px-3 py-1.5 rounded-full text-xs border ${chartMode==='line' ? 'bg-gray-200 text-gray-900 border-gray-300 dark:bg-violet-600/80 dark:text-white dark:border-violet-500' : 'text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'}`}>Line</button>
              <button onClick={() => setChartMode('pie')}
                      className={`px-3 py-1.5 rounded-full text-xs border ${chartMode==='pie' ? 'bg-gray-200 text-gray-900 border-gray-300 dark:bg-violet-600/80 dark:text-white dark:border-violet-500' : 'text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'}`}>Pie</button>
            </div>
          </div>
          {/* Legend */}
          <div className="px-4 pb-2">
            {chartMode === 'line' ? (
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-6 rounded-full" style={{ background: '#7C6FF1' }} />
                  Total Requests
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600 dark:text-slate-300">
                {pieData.map((p, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          {chartMode === 'line' ? (
            <LineAreaChart data={seriesData} />
          ) : (
            <AdminPieChart data={pieData} />
          )}
        </div>

        {/* Right side overview cards - 5 metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card min-w-0 dark:border-white/10 dark:bg-[#12151d]">
            <p className="text-xs text-gray-600 dark:text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-emerald-600 dark:text-emerald-300 shrink-0"><IconCheck /></span> <span className="truncate whitespace-nowrap" title="Completed">Completed</span></p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{(statusCounts as any).byStatus?.completed || 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card min-w-0 dark:border-white/10 dark:bg-[#12151d]">
            <p className="text-xs text-gray-600 dark:text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-gray-600 dark:text-slate-300 shrink-0"><IconTruck /></span> <span className="truncate whitespace-nowrap" title="Delivered">Delivered</span></p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{(statusCounts as any).byStatus?.delivered || 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card min-w-0 dark:border-white/10 dark:bg-[#12151d]">
            <p className="text-xs text-gray-600 dark:text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-amber-600 dark:text-amber-300 shrink-0"><IconClock /></span> <span className="truncate whitespace-nowrap" title="Pending">Pending</span></p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{((statusCounts as any).byStatus?.awaiting_parts || 0) + ((statusCounts as any).byStatus?.waiting_parts || 0)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card min-w-0 dark:border-white/10 dark:bg-[#12151d]">
            <p className="text-xs text-gray-600 dark:text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-violet-600 dark:text-[#A48AFB] shrink-0"><IconProgress /></span> <span className="truncate whitespace-nowrap" title="In Progress">In Progress</span></p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{(statusCounts as any).byStatus?.in_progress || 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card md:col-span-2 lg:col-span-1 min-w-0 dark:border-white/10 dark:bg-[#12151d]">
            <p className="text-xs text-gray-600 dark:text-slate-300 flex items-center gap-2 overflow-hidden"><span className="text-gray-600 dark:text-slate-300 shrink-0"><IconGrid /></span> <span className="truncate whitespace-nowrap" title="Total">Total</span></p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{(statusCounts as any).total}</p>
          </div>
        </div>
      </section>

      {/* Removed secondary KPI chips to avoid duplicate information */}

      {/* Mobile CTA to view orders when table is hidden */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-card lg:hidden dark:border-white/10 dark:bg-[#12151d]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">My Repair Orders</h2>
            <p className="text-xs text-gray-600 dark:text-slate-300">View and manage all your repair requests.</p>
          </div>
          <Link to="/my-repairs" className="btn whitespace-nowrap">Open</Link>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-card hidden lg:block dark:border-white/10 dark:bg-[#12151d]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Repair Orders</h2>
          <div className="flex items-center gap-3">
            <Link to="/my-repairs" className="rounded-md border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap dark:text-white dark:hover:bg-white/5">View all</Link>
            <Link to="/create-repair" className="btn whitespace-nowrap">Create Repair Order</Link>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-300">Loading your repairs...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-slate-300">No repair orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm rounded-lg overflow-hidden text-gray-900 dark:text-white">
              <thead>
                <tr className="text-left text-gray-600 dark:text-slate-300">
                  <th className="py-2 px-3">Ticket</th>
                  <th className="py-2 px-3">Device</th>
                  <th className="py-2 px-3">Issue</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Estimate</th>
                  <th className="py-2 px-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 3).map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 0 ? 'border-t border-gray-200 dark:border-white/10' : 'border-t border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'}>
                    <td className="py-2 px-3 font-medium">{r.id.slice(0, 8)}</td>
                    <td className="py-2 px-3">{getDeviceDisplayName(r.device as any)}</td>
                    <td className="py-2 px-3 max-w-[420px] truncate" title={r.issue || ''}>
                      {r.issue || '-'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] || 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-100'}`}>
                        {statusLabels[r.status] || (r.status as any) || '-'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{formatCurrency((r as any).estimatedCost ?? (r as any).actualCost)}</td>
                    <td className="py-2 px-3">{new Date(r.updatedAt as any).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
          </div>
        )}
      </section>
      {/* Chart styles not needed now; using simple SVG pie */}
      </main>
      {/* Local animation keyframes to match auth theme */}
      <style>{`
        @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes floatYrev { 0%,100% { transform: translateY(0) } 50% { transform: translateY(6px) } }
        .anim-float-slow { animation: floatY 10s ease-in-out infinite; }
        .anim-float-rev { animation: floatYrev 11s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// Donut pie chart (same as admin, with hover center info)
const AdminPieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const width = 320, height = 200
  const cx = width / 2, cy = 100
  const outerR = 70, innerR = 42
  const total = Math.max(1, data.reduce((s, d) => s + (d.value || 0), 0))
  const [hover, setHover] = useState<number | null>(null)
  let start = -Math.PI / 2
  const arcs = data.map((d) => {
    const angle = ((d.value || 0) / total) * 2 * Math.PI
    const end = start + angle
    const largeArc = angle > Math.PI ? 1 : 0
    const sx = cx + outerR * Math.cos(start)
    const sy = cy + outerR * Math.sin(start)
    const x1 = cx + outerR * Math.cos(end),   y1 = cy + outerR * Math.sin(end)
    const xi0 = cx + innerR * Math.cos(end),  yi0 = cy + innerR * Math.sin(end)
    const xi1 = cx + innerR * Math.cos(start),yi1 = cy + innerR * Math.sin(start)
    const dPath = `M ${sx} ${sy} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1} ${y1} L ${xi0} ${yi0} A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi1} ${yi1} Z`
    const mid = (start + end) / 2
    const lx = cx + (outerR + 16) * Math.cos(mid)
    const ly = cy + (outerR + 16) * Math.sin(mid)
    const percent = Math.round(((d.value || 0) / total) * 100)
    start = end
    return { dPath, color: d.color, label: d.label, value: d.value || 0, lx, ly, percent }
  })
  // Auto-cycling highlight state (manual hover overrides it)
  const nonZeroIdx = arcs
    .map((a, i) => ({ i, v: a.value }))
    .filter(x => x.v > 0)
    .map(x => x.i)
  const [autoIndex, setAutoIndex] = React.useState<number | null>(nonZeroIdx.length ? nonZeroIdx[0] : null)

  React.useEffect(() => {
    if (!nonZeroIdx.length) { setAutoIndex(null); return }
    // Ensure current autoIndex is valid
    setAutoIndex((prev) => (prev !== null && nonZeroIdx.includes(prev)) ? prev : nonZeroIdx[0])
    const id = setInterval(() => {
      setAutoIndex((prev) => {
        if (!nonZeroIdx.length) return null
        const curr = (prev === null) ? nonZeroIdx[0] : prev
        const pos = nonZeroIdx.indexOf(curr)
        const next = nonZeroIdx[(pos + 1) % nonZeroIdx.length]
        return next
      })
    }, 2500)
    return () => clearInterval(id)
  }, [data.map(d => d.value).join(','), nonZeroIdx.length])

  const effectiveHover = hover !== null ? hover : (autoIndex !== null ? autoIndex : null)
  const focus = effectiveHover !== null ? arcs[effectiveHover] : null
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 mx-auto block">
      {/* Rotating arcs (no outside labels) */}
      <g>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="12s" repeatCount="indefinite" />
        {arcs.map((a, i) => (
          <g key={i}
             onMouseEnter={() => setHover(i)}
             onMouseLeave={() => setHover(null)}
             onFocus={() => setHover(i)}
             onBlur={() => setHover(null)}
             role="button" tabIndex={0} style={{cursor:'pointer'}}>
            <path d={a.dPath}
                  fill={a.color}
                  opacity={effectiveHover === null ? (a.value === 0 ? 0.25 : 0.95) : (effectiveHover === i ? 1 : 0.18)}
                  stroke={effectiveHover === i ? '#ffffff' : 'none'} strokeWidth={effectiveHover === i ? 1.5 : 0}
            />
          </g>
        ))}
      </g>
      {/* center text (static) */}
      <circle cx={cx} cy={cy} r={innerR} className="fill-white dark:fill-[#0b0d12]" />
      {focus ? (
        <>
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="#cbd5e1">{focus.label}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="18" fill="#ffffff" fontWeight={700}>{focus.value} ({focus.percent}%)</text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="12" className="fill-gray-600 dark:fill-[#cbd5e1]">Total</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" className="fill-gray-900 dark:fill-white" fontWeight={700}>{total}</text>
        </>
      )}
      
    </svg>
  )
}

// Animated Line + Area chart with gradient fill and auto marker
function LineAreaChart({ data }: { data: { label: string; value: number }[] }) {
  const width = 640
  const height = 220
  const padding = { left: 24, right: 24, top: 16, bottom: 34 }
  const w = width - padding.left - padding.right
  const h = height - padding.top - padding.bottom

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const nonZero = data?.some(d => d.value > 0)
  const series = (nonZero && data?.length) ? data : [5,7,4,9,12,8,11,6,10,7,9,13].map((v,i)=>({label:months[i], value:v}))

  const maxV = Math.max(1, ...series.map(d => d.value))
  const stepX = series.length > 1 ? (w / (series.length - 1)) : w
  const points = series.map((d, i) => {
    const x = padding.left + i * stepX
    const y = padding.top + (h - (d.value / maxV) * h)
    return { x, y }
  })

  const pathD = (() => {
    if (!points.length) return ''
    const d: string[] = []
    d.push(`M ${points[0].x} ${points[0].y}`)
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const cx = (p0.x + p1.x) / 2
      d.push(`C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`)
    }
    return d.join(' ')
  })()

  const areaD = pathD
    ? `${pathD} L ${padding.left + (series.length - 1) * stepX} ${padding.top + h} L ${padding.left} ${padding.top + h} Z`
    : ''

  const gradId = React.useRef(`grad-${Math.random().toString(36).slice(2)}`).current
  const pathId = React.useRef(`path-${Math.random().toString(36).slice(2)}`).current

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 block">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A48AFB" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#A48AFB" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* area */}
      <path d={areaD} fill={`url(#${gradId})`} />
      {/* line with draw animation */}
      <path id={pathId} d={pathD} fill="none" stroke="#7C6FF1" strokeWidth={3}>
        <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="1.1s" fill="freeze" />
      </path>

      {/* moving marker along path */}
      <circle r={6} fill="#ffffff" stroke="#7C6FF1" strokeWidth={3}>
        <animateMotion dur="10s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>

      {/* x-axis labels */}
      <g>
        {series.map((d, i) => (
          <text key={i} x={padding.left + i * stepX} y={height - 10} textAnchor="middle" fontSize="10" className="fill-gray-600 dark:fill-[#cbd5e1]">{d.label}</text>
        ))}
      </g>
    </svg>
  )
}

export default CustomerDashboard
