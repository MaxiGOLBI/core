import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Constants [CMV] ────────────────────────────────────────────
const PERIODS = [
  { key: 'mes',    label: 'Este mes' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'custom', label: 'Personalizado' },
];

// ── Helpers ────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getPeriodRange(period, customFrom, customTo) {
  const today = todayStr();
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

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── Tarjeta de resumen ─────────────────────────────────────────
function SummaryCard({ label, amount, colorClass, subLabel }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorClass}`}>{fmtMoney(amount)}</p>
      {subLabel && <p className="text-xs text-slate-400 mt-0.5">{subLabel}</p>}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function CashFlowPage() {
  const { user } = useAuth();

  const [data, setData]         = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Filters
  const [period, setPeriod]           = useState('mes');
  const [customFrom, setCustomFrom]   = useState('');
  const [customTo, setCustomTo]       = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Load branches
  useEffect(() => {
    api.get('/api/branches')
      .then(d => setBranches(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [from, to] = getPeriodRange(period, customFrom, customTo);
      const params = new URLSearchParams({ from, to });
      if (branchFilter) params.set('branch_id', branchFilter);
      const result = await api.get(`/api/reports/cash-flow?${params}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, branchFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const summary = data?.summary ?? null;
  const byDate  = data?.by_date ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Flujo de Caja</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ingresos, egresos y saldo acumulado por día</p>
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

          {/* Fechas personalizadas */}
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

          {/* Sucursal */}
          {branches.length > 0 && (
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
            subLabel={`Ventas: ${fmtMoney(summary.total_sales)}`}
          />
          <SummaryCard
            label="Total egresos"
            amount={summary.total_out}
            colorClass="text-rose-600"
            subLabel={`Gastos: ${fmtMoney(summary.total_expenses)}`}
          />
          <SummaryCard
            label="Resultado neto"
            amount={summary.net}
            colorClass={summary.net >= 0 ? 'text-blue-700' : 'text-rose-700'}
          />
          <SummaryCard
            label="Ventas del período"
            amount={summary.total_sales}
            colorClass="text-slate-700"
            subLabel={`Ingresos extra: ${fmtMoney(summary.total_manual_in)}`}
          />
        </div>
      )}

      {/* Tabla diaria */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Detalle por día</h3>
          {data && (
            <span className="text-xs text-slate-400">
              {data.from} → {data.to}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : byDate.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">
            No hay datos para el período seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-right">Ventas</th>
                  <th className="px-5 py-3 text-right hidden sm:table-cell">Gastos</th>
                  <th className="px-5 py-3 text-right hidden md:table-cell">Ing. manual</th>
                  <th className="px-5 py-3 text-right hidden md:table-cell">Egr. manual</th>
                  <th className="px-5 py-3 text-right">Neto del día</th>
                  <th className="px-5 py-3 text-right">Saldo acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byDate.map(row => (
                  <tr
                    key={row.date}
                    className={`transition-colors ${row.net < 0 ? 'bg-rose-50 hover:bg-rose-100' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {fmtDate(row.date)}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-700 font-medium">
                      {fmtMoney(row.sales)}
                    </td>
                    <td className="px-5 py-3 text-right text-rose-600 hidden sm:table-cell">
                      {fmtMoney(row.expenses)}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-600 hidden md:table-cell">
                      {row.manual_in > 0 ? fmtMoney(row.manual_in) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-rose-500 hidden md:table-cell">
                      {row.manual_out > 0 ? fmtMoney(row.manual_out) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${row.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {row.net >= 0 ? '+' : ''}{fmtMoney(row.net)}
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${row.cumulative_balance >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                      {fmtMoney(row.cumulative_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Fila de totales */}
              {summary && (
                <tfoot>
                  <tr className="bg-slate-100 font-semibold text-sm border-t-2 border-slate-200">
                    <td className="px-5 py-3 text-slate-700">Total</td>
                    <td className="px-5 py-3 text-right text-emerald-700">{fmtMoney(summary.total_sales)}</td>
                    <td className="px-5 py-3 text-right text-rose-600 hidden sm:table-cell">{fmtMoney(summary.total_expenses)}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 hidden md:table-cell">{fmtMoney(summary.total_manual_in)}</td>
                    <td className="px-5 py-3 text-right text-rose-500 hidden md:table-cell">{fmtMoney(summary.total_manual_out)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${summary.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {summary.net >= 0 ? '+' : ''}{fmtMoney(summary.net)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 text-xs">saldo final</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
