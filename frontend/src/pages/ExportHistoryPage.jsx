import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// ── Helpers ───────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

function fmtDateTime(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EXPORT_TYPES = [
  { value: '',         label: 'Todos' },
  { value: 'ventas',   label: 'Ventas' },
  { value: 'gastos',   label: 'Gastos' },
  { value: 'ingresos', label: 'Ingresos' },
  { value: 'stock',    label: 'Stock' },
];

// ── Main page ─────────────────────────────────────────────────
export default function ExportHistoryPage() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState(monthStartStr());
  const [filterTo, setFilterTo]     = useState(todayStr());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo)   params.set('to', filterTo);
      const data = await api.get(`/api/export-logs?${params}`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar historial.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  function fmtFilters(filters) {
    if (!filters || typeof filters !== 'object') return '—';
    const parts = [];
    if (filters.from) parts.push(`desde ${filters.from}`);
    if (filters.to)   parts.push(`hasta ${filters.to}`);
    Object.entries(filters).forEach(([k, v]) => {
      if (k !== 'from' && k !== 'to' && v) parts.push(`${k}: ${v}`);
    });
    return parts.length ? parts.join(', ') : '—';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-5 mb-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">Historial de Exportaciones</h1>
        <p className="text-blue-100 text-sm mt-1">Registro de todos los CSV exportados</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {EXPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={load}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          Filtrar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {logs.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-400 text-sm">
              No hay exportaciones registradas en este período
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros aplicados</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Registros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{fmtDateTime(log.exported_at)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{log.user_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
                          {log.type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[260px] truncate">{fmtFilters(log.filters)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{log.row_count ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
