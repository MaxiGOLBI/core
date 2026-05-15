import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// ── Constants ─────────────────────────────────────────────────
const PERIODS = [
  { key: 'mes',    label: 'Este mes' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'custom', label: 'Personalizado' },
];

// ── Helpers ───────────────────────────────────────────────────
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

function fmtPct(n) {
  return `${parseFloat(n || 0).toFixed(1)}%`;
}

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── Main page ─────────────────────────────────────────────────
export default function IncomeStatementPage() {
  const [data, setData]           = useState(null);
  const [branches, setBranches]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [period, setPeriod]           = useState('mes');
  const [customFrom, setCustomFrom]   = useState('');
  const [customTo, setCustomTo]       = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [from, to] = getPeriodRange(period, customFrom, customTo);

  useEffect(() => {
    api.get('/api/branches')
      .then(d => setBranches(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [f, t] = getPeriodRange(period, customFrom, customTo);
      const params = new URLSearchParams({ from: f, to: t });
      if (branchFilter) params.set('branch_id', branchFilter);
      const d = await api.get(`/api/reports/income-statement?${params}`);
      setData(d);
    } catch (err) {
      setError(err.message || 'Error al cargar el estado de resultados.');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, branchFilter]);

  useEffect(() => { load(); }, [load]);

  const result     = data?.result ?? 0;
  const isPositive = result >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-5 mb-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">Estado de Resultados</h1>
        <p className="text-blue-100 text-sm mt-1">{fmtDate(from)} — {fmtDate(to)}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Período</label>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        {period === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}
        {branches.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sucursal</label>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <button onClick={load}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : data && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">P &amp; L</h2>
              <p className="text-xs text-slate-400 mt-0.5">{fmtDate(data.from)} — {fmtDate(data.to)}</p>
            </div>
            <table className="w-full">
              <tbody>

                {/* ── INGRESOS ── */}
                <tr className="bg-emerald-50/60">
                  <td className="px-4 py-2 text-xs font-bold text-emerald-700 uppercase tracking-wider" colSpan={3}>
                    Ingresos
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 pl-8 text-sm text-slate-600">(+) Ventas</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium text-slate-700">{fmtMoney(data.revenue?.sales)}</td>
                  <td className="px-4 py-2.5 w-20" />
                </tr>
                <tr>
                  <td className="px-4 py-2.5 pl-8 text-sm text-slate-600">(+) Otros ingresos</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium text-slate-700">{fmtMoney(data.revenue?.other_income)}</td>
                  <td className="px-4 py-2.5 w-20" />
                </tr>
                <tr className="border-t border-slate-200 bg-emerald-50">
                  <td className="px-4 py-2.5 text-sm font-bold text-slate-800">= Total Ingresos</td>
                  <td className="px-4 py-2.5 text-sm text-right font-bold text-emerald-700">{fmtMoney(data.revenue?.total)}</td>
                  <td className="px-4 py-2.5 w-20" />
                </tr>

                {/* ── COSTOS ── */}
                <tr className="bg-red-50/50 border-t-2 border-slate-200">
                  <td className="px-4 py-2 text-xs font-bold text-red-700 uppercase tracking-wider" colSpan={3}>
                    Costos y Gastos
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 pl-8 text-sm text-slate-600">(-) CMV (costo de mercadería vendida)</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium text-red-600">{fmtMoney(data.costs?.cogs)}</td>
                  <td className="px-4 py-2.5 w-20" />
                </tr>
                <tr className="border-t border-slate-100 bg-amber-50">
                  <td className="px-4 py-2.5 text-sm font-bold text-slate-800">= Ganancia Bruta</td>
                  <td className="px-4 py-2.5 text-sm text-right font-bold text-amber-700">{fmtMoney(data.gross_profit)}</td>
                  <td className="px-4 py-2.5 text-xs text-right text-slate-500 font-medium">{fmtPct(data.gross_margin)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 pl-8 text-sm text-slate-600">(-) Gastos operativos</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium text-red-600">{fmtMoney(data.costs?.expenses)}</td>
                  <td className="px-4 py-2.5 w-20" />
                </tr>

                {/* ── RESULTADO NETO ── */}
                <tr className={`border-t-2 border-slate-300 ${isPositive ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <td className="px-4 py-3 text-base font-bold text-slate-900">= Resultado Neto</td>
                  <td className={`px-4 py-3 text-base text-right font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                    {fmtMoney(result)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmtPct(data.net_margin)}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
