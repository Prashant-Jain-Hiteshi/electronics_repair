import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type Repair = {
  id: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  brand?: string;
  model?: string;
  issueDescription?: string;
  status: string;
  priority?: string;
  estimatedCost?: number | string | null;
  actualCost?: number | string | null;
  estimatedCompletionDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const statusColors: Record<string, string> = {
  // Dark-friendly pills with subtle borders. Purple accent for progress states.
  pending: 'text-amber-300 bg-amber-400/10 border border-amber-400/20',
  in_progress: 'text-[#A48AFB] bg-[#A48AFB]/10 border border-[#A48AFB]/20',
  awaiting_parts: 'text-[#A48AFB] bg-[#A48AFB]/10 border border-[#A48AFB]/20',
  completed: 'text-emerald-300 bg-emerald-400/10 border border-emerald-400/20',
  delivered: 'text-slate-300 bg-white/5 border border-white/10',
  cancelled: 'text-rose-300 bg-rose-400/10 border border-rose-400/20',
};

function formatCurrency(v: any) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n === 0) return '-';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'INR' });
}

const MyRepairOrders: React.FC = () => {
  const { token } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/repairs/mine');
        if (mounted) setRepairs(data.repairs || []);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.message || 'Failed to fetch');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Initialize filters from URL on first render
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const q = sp.get('q') || '';
    const s = sp.get('status');
    setQuery(q);
    setStatuses(s ? s.split(',').filter(Boolean) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters to URL when they change
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (query) sp.set('q', query); else sp.delete('q');
    if (statuses.length > 0) sp.set('status', statuses.join(',')); else sp.delete('status');
    const next = `${location.pathname}?${sp.toString()}`;
    // Avoid pushing duplicates
    if (next !== `${location.pathname}${location.search}`) navigate(next, { replace: true });
  }, [query, statuses]);

  

  const onCancel = async (id: string) => {
    if (!confirm('Cancel this repair request?')) return;
    try {
      await api.put(`/repairs/${id}/cancel`);
      setRepairs((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to cancel');
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const statusSet = new Set(statuses);
    const filtered = repairs.filter((r) => {
      const matchesText = !q
        || [
          r.id.slice(0, 8),
          (r as any).deviceBrand ?? r.brand,
          (r as any).deviceModel ?? r.model,
          r.issueDescription,
          r.status,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      const matchesStatus = statusSet.size === 0 || statusSet.has(r.status);
      return matchesText && matchesStatus;
    });
    return filtered;
  }, [repairs, query, statuses]);

  return (
    <div className="p-4 sm:p-6 overflow-x-hidden">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">My Repair Orders</h1>
        <Link to="/repairs/new" className="btn">
          + New Order
        </Link>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter chips */}
          {['pending','in_progress','awaiting_parts','completed','delivered','cancelled'].map(s => {
            const active = statuses.includes(s);
            return (
              <button
                key={s}
                className={`filter-chip ${active ? 'is-active' : ''}`}
                onClick={() => setStatuses(prev => active ? prev.filter(x => x!==s) : [...prev, s])}
              >{s}</button>
            );
          })}
          <div className="relative">
            <input
              className="border  border-[#A48AFB] bg-[#0f1218] text-white placeholder-slate-400 rounded-md p-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB] hover:border-[#A48AFB]/50 transition-colors"
              placeholder="Search by ticket, device, issue, status..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {/* Active filters row */}
        {(query || statuses.length>0) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {query && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white">
                q: {query}
                <button className="ml-1 text-slate-300 hover:text-white" onClick={()=>setQuery('')}>✕</button>
              </span>
            )}
            {statuses.map(s => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white">
                status: {s}
                <button className="ml-1 text-slate-300 hover:text-white" onClick={()=>setStatuses(prev=>prev.filter(x=>x!==s))}>✕</button>
              </span>
            ))}
            <button className="ml-1 rounded-md border border-white/10 px-2 py-0.5 text-slate-300 hover:bg-white/5" onClick={()=>{ setQuery(''); setStatuses([]); }}>Clear filters</button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-300">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-slate-400">
          No repair orders yet. <Link to="/repairs/new" className="text-[#A48AFB] hover:text-[#9a86f6] underline-offset-4 hover:underline">Create one</Link>.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-300">
              <th className="py-2 px-3 whitespace-nowrap">Ticket</th>
              <th className="py-2 px-3 whitespace-nowrap">Device</th>
              <th className="py-2 px-3 whitespace-nowrap">Status</th>
              <th className="py-2 px-3 whitespace-nowrap">ETA</th>
              <th className="py-2 px-3 whitespace-nowrap">Estimate</th>
              <th className="py-2 px-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  
                  <td className="py-2 px-3 font-medium whitespace-nowrap">{r.id.slice(0, 8)}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{[(r as any).deviceBrand ?? r.brand, (r as any).deviceModel ?? r.model].filter(Boolean).join(' ') || r.deviceType || '-'}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] || 'text-slate-300 bg-white/5 border border-white/10'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">{r.estimatedCompletionDate ? new Date(r.estimatedCompletionDate).toLocaleDateString() : '-'}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{formatCurrency(r.estimatedCost ?? r.actualCost)}</td>
                  <td className="py-2 px-3 flex gap-2 whitespace-nowrap">
                    <Link
                      to={`/repairs/${r.id}`}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#A48AFB]"
                    >
                      Details
                    </Link>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => onCancel(r.id)}
                        className="rounded-md border border-white/10 px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyRepairOrders;
