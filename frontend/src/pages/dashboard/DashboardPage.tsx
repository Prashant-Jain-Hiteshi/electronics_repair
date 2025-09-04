import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowPathIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import { fetchRepairs } from '@/api/services/repairService';
import { listMyAppointments, Appointment } from '@/api/appointments';
import type { RepairOrder } from '@/types';

export const DashboardPage: React.FC = () => {
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [repairsList, myAppts] = await Promise.all([
        fetchRepairs(),
        listMyAppointments().catch(() => []),
      ]);
      setRepairs(repairsList || []);
      setAppointments(myAppts || []);
    } catch (e) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { totalRepairs, activeCustomers, monthlyRevenue, avgRepairDays } = useMemo(() => {
    const totalRepairs = repairs.length;
    const activeCustomers = new Set(repairs.map(r => r.customerId)).size;
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthlyRevenue = repairs.reduce((sum, r) => {
      const d = new Date(r.updatedAt || r.createdAt);
      const isThisMonth = d.getMonth() === month && d.getFullYear() === year;
      return sum + (isThisMonth && typeof r.actualCost === 'number' ? r.actualCost : 0);
    }, 0);
    const durations: number[] = repairs
      .filter(r => r.completedAt)
      .map(r => {
        const start = new Date(r.createdAt).getTime();
        const end = new Date(r.completedAt as string).getTime();
        return Math.max(0, end - start);
      });
    const avgRepairDays = durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length) / (1000 * 60 * 60 * 24) : 0;
    return { totalRepairs, activeCustomers, monthlyRevenue, avgRepairDays };
  }, [repairs]);

  const recentRepairs = useMemo(() => {
    return [...repairs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [repairs]);

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Refresh
            </button>
            <Link
              to="/repairs/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              New Repair
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700 border border-red-200">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5 flex items-center">
            <ClipboardDocumentListIcon className="h-6 w-6 text-gray-400" />
            <div className="ml-5">
              <div className="text-sm text-gray-500">Total Repairs</div>
              <div className="text-2xl font-semibold text-gray-900">{loading ? '—' : totalRepairs}</div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5 flex items-center">
            <UserGroupIcon className="h-6 w-6 text-gray-400" />
            <div className="ml-5">
              <div className="text-sm text-gray-500">Active Customers</div>
              <div className="text-2xl font-semibold text-gray-900">{loading ? '—' : activeCustomers}</div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5 flex items-center">
            <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
            <div className="ml-5">
              <div className="text-sm text-gray-500">Monthly Revenue</div>
              <div className="text-2xl font-semibold text-gray-900">{loading ? '—' : `$${monthlyRevenue.toFixed(2)}`}</div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5 flex items-center">
            <ClockIcon className="h-6 w-6 text-gray-400" />
            <div className="ml-5">
              <div className="text-sm text-gray-500">Avg. Repair Time</div>
              <div className="text-2xl font-semibold text-gray-900">{loading ? '—' : `${avgRepairDays.toFixed(1)} days`}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Repairs */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg lg:col-span-2">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Repairs</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Latest repair orders and their status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repair ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-sm text-gray-500">Loading...</td>
                  </tr>
                ) : recentRepairs.length ? (
                  recentRepairs.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        <Link to={`/repairs/${r.id}`} className="hover:underline">{r.id}</Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {r.customer?.name || r.customerId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {[r.brand, r.model].filter(Boolean).join(' ') || r.deviceType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {typeof r.actualCost === 'number' ? `$${r.actualCost.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-sm text-gray-500">No repairs to show</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Appointments</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Today's scheduled appointments</p>
            </div>
            <div className="divide-y divide-gray-200">
              {appointments.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {appointments.slice(0, 5).map((a) => {
                    const start = new Date(a.start);
                    const time = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const title = a.mode === 'estimate' ? 'Estimate' : 'Repair';
                    return (
                      <li key={a.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600 truncate">{title}</p>
                            <p className="mt-1 text-sm text-gray-500">{a.location?.name || '—'}</p>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="text-sm text-gray-500">{time}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-12 text-center">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                  <p className="mt-1 text-sm text-gray-500">No appointments scheduled.</p>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-4 py-3 flex justify-end border-t border-gray-200">
              <Link to="/appointments" className="text-sm font-medium text-blue-600 hover:text-blue-500">View all appointments</Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-5 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="bg-white">
              <div className="p-4 space-y-4">
                <Link to="/repairs/new" className="group flex items-center p-3 border border-gray-300 rounded-md shadow-sm hover:bg-blue-50">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Create New Repair</p>
                    <p className="text-xs text-gray-500">Start a new repair order</p>
                  </div>
                </Link>
                <Link to="/appointments/new" className="group flex items-center p-3 border border-gray-300 rounded-md shadow-sm hover:bg-blue-50">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <CalendarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Schedule Appointment</p>
                    <p className="text-xs text-gray-500">Book a new appointment</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
