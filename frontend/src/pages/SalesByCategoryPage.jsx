import { useState, useEffect, useCallback, useRef } from 'react';
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

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── Paleta de colores ─────────────────────────────────────────
const PALETTE = [
  '#6366f1','#22d3ee','#10b981','#f59e0b','#ec4899',
  '#8b5cf6','#f97316','#3b82f6','#84cc16','#ef4444',
];

function fmtShort(n) {
  const v = parseFloat(n) || 0;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `$${(v / 1000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

// ── Gráfico comparativo ────────────────────────────────────────
function CategoryChart({ categories, grandTotal }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!categories || categories.length === 0) return null;

  const cats    = categories.slice(0, 10); // máximo 10
  const maxVal  = cats[0]?.total || 1;
  const R       = 72;
  const CX      = 90;
  const CY      = 90;
  const CIRC    = 2 * Math.PI * R;

  // Build donut segments
  let cumPct = 0;
  const segments = cats.map((cat, i) => {
    const pct    = (cat.total / (grandTotal || 1));
    const arcLen = pct * CIRC;
    const offset = CIRC - cumPct * CIRC;
    cumPct += pct;
    return { cat, pct, arcLen, offset, color: PALETTE[i % PALETTE.length] };
  });

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl mb-6"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0c1a3a 100%)' }}
    >
      <div className="px-6 pt-5 pb-2">
        <h3 className="text-white font-bold text-lg tracking-tight">Ingresos por Rubro</h3>
        <p className="text-slate-400 text-xs mt-0.5">Comparativa de ventas por categoría en el período</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 px-6 pb-6 pt-2">

        {/* ── Donut chart ── */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center">
          <svg width="180" height="180" viewBox="0 0 180 180" className="overflow-visible">
            {/* Track ring */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="22" />

            {/* Segments */}
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={hoverIdx === i ? 26 : 22}
                strokeDasharray={`${seg.arcLen} ${CIRC}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="butt"
                style={{
                  transform: `rotate(-90deg)`,
                  transformOrigin: `${CX}px ${CY}px`,
                  transition: 'stroke-width 0.15s ease',
                  filter: hoverIdx === i ? `drop-shadow(0 0 8px ${seg.color})` : undefined,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            ))}

            {/* Center: hovered or total */}
            {hoverIdx !== null ? (
              <>
                <text x={CX} y={CY - 10} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">
                  {(segments[hoverIdx].cat.category_name || 'Sin cat.').slice(0, 14)}
                </text>
                <text x={CX} y={CY + 6} textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">
                  {fmtShort(segments[hoverIdx].cat.total)}
                </text>
                <text x={CX} y={CY + 22} textAnchor="middle" fontSize="11" fill={segments[hoverIdx].color}>
                  {parseFloat(segments[hoverIdx].cat.share_pct ?? 0).toFixed(1)}%
                </text>
              </>
            ) : (
              <>
                <text x={CX} y={CY - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)">
                  Total
                </text>
                <text x={CX} y={CY + 10} textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">
                  {fmtShort(grandTotal)}
                </text>
              </>
            )}
          </svg>
        </div>

        {/* ── Horizontal bars ── */}
        <div className="flex-1 flex flex-col gap-2.5 justify-center">
          {cats.map((cat, i) => {
            const color   = PALETTE[i % PALETTE.length];
            const barPct  = ((cat.total / maxVal) * 100).toFixed(1);
            const isHover = hoverIdx === i;
            return (
              <div
                key={cat.category_id ?? i}
                className="group cursor-default"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {/* Label row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color, boxShadow: isHover ? `0 0 8px ${color}` : undefined }}
                    />
                    <span className="text-xs font-medium text-slate-300 truncate max-w-[160px]">
                      {cat.category_name || 'Sin categoría'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-500">{(cat.units ?? 0)} u.</span>
                    <span className="text-xs font-bold text-white">{fmtShort(cat.total)}</span>
                    <span
                      className="text-xs font-semibold w-10 text-right"
                      style={{ color }}
                    >
                      {parseFloat(cat.share_pct ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="h-2 rounded-full overflow-hidden bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: color,
                      boxShadow: isHover ? `0 0 10px ${color}` : undefined,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function SalesByCategoryPage() {
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
      const d = await api.get(`/api/reports/sales-by-category?${params}`);
      setData(d);
    } catch (err) {
      setError(err.message || 'Error al cargar ventas por categoría.');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, branchFilter]);

  useEffect(() => { load(); }, [load]);

  const topCategory = data?.categories?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-5 mb-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">Ventas por Categoría</h1>
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
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Ventas</p>
              <p className="text-xl font-bold text-slate-900">{fmtMoney(data.grand_total)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Unidades</p>
              <p className="text-xl font-bold text-slate-900">{(data.grand_units ?? 0).toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Categoría Top</p>
              <p className="text-xl font-bold text-blue-700">{topCategory?.category_name || '—'}</p>
              {topCategory && <p className="text-xs text-slate-400 mt-0.5">{fmtMoney(topCategory.total)}</p>}
            </div>
          </div>

          {/* Comparative chart */}
          {data.categories?.length > 0 && (
            <CategoryChart categories={data.categories} grandTotal={data.grand_total} />
          )}

          {/* Table */}
          {data.categories?.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-slate-400 text-sm">
              No hay ventas en este período
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ventas ($)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidades</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">% del Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.categories.map((cat, idx) => (
                      <tr key={cat.category_id || cat.category_name} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{cat.category_name || 'Sin categoría'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{fmtMoney(cat.total)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{(cat.units ?? 0).toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(cat.share_pct ?? 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600 w-10 text-right">
                              {parseFloat(cat.share_pct ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
