import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Constants [CMV] ────────────────────────────────────────────
const TYPE_LABELS = {
  sale:       'Venta',
  expense:    'Gasto',
  manual_in:  'Ingreso manual',
  manual_out: 'Egreso manual',
};

const TYPE_COLORS = {
  sale:       'bg-emerald-100 text-emerald-700',
  manual_in:  'bg-blue-100 text-blue-700',
  expense:    'bg-rose-100 text-rose-700',
  manual_out: 'bg-orange-100 text-orange-700',
};

const AMOUNT_COLOR = {
  sale:       'text-emerald-700',
  manual_in:  'text-emerald-700',
  expense:    'text-rose-600',
  manual_out: 'text-rose-600',
};

const PERIODS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes' },
  { key: 'custom', label: 'Personalizado' },
];

const TYPE_OPTIONS = [
  { value: '',           label: 'Todos los tipos' },
  { value: 'sale',       label: 'Ventas' },
  { value: 'manual_in',  label: 'Ingresos manuales' },
  { value: 'expense',    label: 'Gastos' },
  { value: 'manual_out', label: 'Egresos manuales' },
];

// ── Helpers ────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getPeriodRange(period, customFrom, customTo) {
  const today = todayStr();
  if (period === 'hoy') return [today, today];
  if (period === 'semana') {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return [d.toISOString().split('T')[0], today];
  }
  if (period === 'mes') {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    return [start.toISOString().split('T')[0], today];
  }
  return [customFrom || today, customTo || today];
}

function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Tarjeta de resumen ─────────────────────────────────────────
function SummaryCard({ label, amount, colorClass, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className={`text-xl font-bold ${colorClass}`}>{fmtMoney(amount)}</p>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function CashMovementsPage() {
  const { hasRole, user } = useAuth();
  const isDueno = user?.role === 'dueno';

  const [movements, setMovements] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [branches, setBranches]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Filters
  const [period, setPeriod]         = useState('hoy');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Load branches for dueño filter
  useEffect(() => {
    if (!isDueno) return;
    api.get('/api/branches')
      .then(data => setBranches(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isDueno]);

  const buildParams = useCallback(() => {
    const [from, to] = getPeriodRange(period, customFrom, customTo);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to + 'T23:59:59');
    if (typeFilter)   params.set('type', typeFilter);
    if (branchFilter) params.set('branch_id', branchFilter);
    return params.toString();
  }, [period, customFrom, customTo, typeFilter, branchFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildParams();
      const [mvData, smData] = await Promise.all([
        api.get(`/api/cash/movements?${qs}`),
        api.get(`/api/cash/movements/summary?${qs}`),
      ]);
      setMovements(Array.isArray(mvData) ? mvData : []);
      setSummary(smData ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Movimientos de Caja</h1>
        <p className="text-sm text-slate-500 mt-0.5">Historial detallado de ingresos y egresos</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Período */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Período</label>
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    period === p.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas custom */}
          {period === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
                <input
                  type="date" value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
                <input
                  type="date" value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Sucursal (solo dueño) */}
          {isDueno && branches.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sucursal</label>
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">{error}</div>
      )}

      {/* Tarjetas de resumen */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total ingresos"
            amount={summary.total_in}
            colorClass="text-emerald-700"
            icon={<span className="text-emerald-400 text-lg font-bold leading-none">↑</span>}
          />
          <SummaryCard
            label="Total egresos"
            amount={summary.total_out}
            colorClass="text-rose-600"
            icon={<span className="text-rose-400 text-lg font-bold leading-none">↓</span>}
          />
          <SummaryCard
            label="Balance neto"
            amount={summary.balance}
            colorClass={summary.balance >= 0 ? 'text-blue-700' : 'text-rose-700'}
            icon={<span className="text-blue-400 text-lg font-bold leading-none">=</span>}
          />
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Por tipo</p>
            <div className="space-y-1">
              {Object.entries(summary.by_type ?? {}).map(([type, total]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[type] ?? 'bg-slate-100 text-slate-600'}`}>
                    {TYPE_LABELS[type] ?? type}
                  </span>
                  <span className={`font-semibold ${AMOUNT_COLOR[type] ?? 'text-slate-700'}`}>
                    {fmtMoney(total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Movimientos</h3>
          {!loading && (
            <span className="text-xs text-slate-400">{movements.length} registros</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : movements.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">
            No hay movimientos para el período seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Fecha</th>
                  {isDueno && <th className="px-5 py-3 text-left hidden sm:table-cell">Sucursal</th>}
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">Descripción</th>
                  <th className="px-5 py-3 text-left hidden lg:table-cell">Usuario</th>
                  <th className="px-5 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap text-xs">
                      {fmtDateTime(m.created_at)}
                    </td>
                    {isDueno && (
                      <td className="px-5 py-3 text-slate-600 hidden sm:table-cell text-xs">
                        {m.branch_name ?? '—'}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[m.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 hidden md:table-cell max-w-xs truncate">
                      {m.description || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 hidden lg:table-cell text-xs">
                      {m.created_by_name ?? '—'}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${AMOUNT_COLOR[m.type] ?? 'text-slate-700'}`}>
                      {m.type === 'expense' || m.type === 'manual_out' ? '−' : '+'}{fmtMoney(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
