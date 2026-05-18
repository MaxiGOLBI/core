import { useState, useEffect, useCallback, useRef } from 'react';
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

// ── Gráfico de área premium ────────────────────────────────────
function WaveChart({ byDate }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  if (!byDate || byDate.length === 0) return null;

  const W   = 900;
  const H   = 260;
  const PAD = { top: 30, right: 30, bottom: 44, left: 72 };
  const cW  = W - PAD.left - PAD.right;
  const cH  = H - PAD.top  - PAD.bottom;

  const salesVals = byDate.map(d => d.sales || 0);
  const netVals   = byDate.map(d => d.net   || 0);
  const maxVal = Math.max(...salesVals, ...netVals, 1);
  const minVal = Math.min(...netVals, 0);
  const range  = maxVal - minVal || 1;
  const n      = byDate.length;

  const xPos = i => PAD.left + (i / Math.max(n - 1, 1)) * cW;
  const yPos = v => PAD.top  + ((maxVal - v) / range) * cH;

  function linePath(vals) {
    if (!vals.length) return '';
    let d = `M ${xPos(0)} ${yPos(vals[0])}`;
    for (let i = 1; i < vals.length; i++) {
      const cx = (xPos(i - 1) + xPos(i)) / 2;
      d += ` C ${cx} ${yPos(vals[i - 1])} ${cx} ${yPos(vals[i])} ${xPos(i)} ${yPos(vals[i])}`;
    }
    return d;
  }

  function areaPath(vals) {
    const base = Math.min(yPos(0), PAD.top + cH);
    return `${linePath(vals)} L ${xPos(n - 1)} ${base} L ${xPos(0)} ${base} Z`;
  }

  const ticks = Array.from({ length: 5 }, (_, i) => {
    const v = minVal + (range / 4) * i;
    return { v, y: yPos(v) };
  });

  function fmtTick(v) {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000)    return `${sign}${(abs / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  }

  const step = Math.ceil(n / 9);

  function handleMouseMove(e) {
    const svg = svgRef.current;
    if (!svg || n < 2) return;
    const rect  = svg.getBoundingClientRect();
    const mx    = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xPos(i) - mx);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setHoverIdx(best);
  }

  // Tooltip geometry
  const tip = hoverIdx !== null ? byDate[hoverIdx] : null;
  const tipX = tip ? Math.min(Math.max(xPos(hoverIdx), PAD.left + 68), W - PAD.right - 68) : 0;
  const tipY = PAD.top + 4;
  const tipW = 136;
  const tipH = 72;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0c1a3a 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight">Evolución del período</h3>
          <p className="text-slate-400 text-xs mt-0.5">Ventas y resultado neto por día</p>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="w-5 h-0.5 rounded bg-cyan-400 opacity-90" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </span>
            Ventas
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <span className="inline-flex items-center gap-1">
              <span className="w-5 h-0.5 rounded bg-violet-400 opacity-90" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            </span>
            Neto diario
          </span>
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair select-none"
        style={{ height: 270 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          {/* Gradient fills */}
          <linearGradient id="cfGS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.45" />
            <stop offset="75%"  stopColor="#22d3ee" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cfGN" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0.40" />
            <stop offset="75%"  stopColor="#a78bfa" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
          {/* Glow filters */}
          <filter id="cfGlowC" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="cfGlowV" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Horizontal grid */}
        {ticks.map(({ v, y }, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="white"
              strokeOpacity={v === 0 ? 0.25 : 0.07}
              strokeWidth={v === 0 ? 1.5 : 1}
              strokeDasharray={v === 0 && minVal < 0 ? '5 4' : undefined}
            />
            <text x={PAD.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.35)" fontFamily="system-ui">
              {fmtTick(v)}
            </text>
          </g>
        ))}

        {/* Hover vertical line */}
        {hoverIdx !== null && (
          <line
            x1={xPos(hoverIdx)} y1={PAD.top}
            x2={xPos(hoverIdx)} y2={H - PAD.bottom}
            stroke="white" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 3"
          />
        )}

        {/* Area fills */}
        <path d={areaPath(salesVals)} fill="url(#cfGS)" />
        <path d={areaPath(netVals)}   fill="url(#cfGN)" />

        {/* Lines with glow */}
        <path d={linePath(salesVals)} fill="none" stroke="#22d3ee" strokeWidth="2.5"
          strokeLinecap="round" filter="url(#cfGlowC)" />
        <path d={linePath(netVals)} fill="none" stroke="#a78bfa" strokeWidth="2.5"
          strokeLinecap="round" filter="url(#cfGlowV)" />

        {/* Dots — always show when few points, only hovered otherwise */}
        {byDate.map((_, i) => {
          const show = n <= 14 || hoverIdx === i;
          if (!show) return null;
          const r = hoverIdx === i ? 5.5 : 3.5;
          return (
            <g key={i}>
              {hoverIdx === i && <>
                <circle cx={xPos(i)} cy={yPos(salesVals[i])} r="10" fill="#22d3ee" fillOpacity="0.15" />
                <circle cx={xPos(i)} cy={yPos(netVals[i])}   r="10" fill="#a78bfa" fillOpacity="0.15" />
              </>}
              <circle cx={xPos(i)} cy={yPos(salesVals[i])} r={r} fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
              <circle cx={xPos(i)} cy={yPos(netVals[i])}   r={r} fill="#0f172a" stroke="#a78bfa" strokeWidth="2" />
            </g>
          );
        })}

        {/* X axis labels */}
        {byDate.map((d, i) => {
          if (n > 1 && i % step !== 0 && i !== n - 1) return null;
          const [, m, day] = d.date.split('-');
          return (
            <text key={i} x={xPos(i)} y={H - 10} textAnchor="middle" fontSize="11"
              fill="rgba(255,255,255,0.35)" fontFamily="system-ui">
              {`${day}/${m}`}
            </text>
          );
        })}

        {/* Tooltip */}
        {tip && (() => {
          const [, tm, tday] = tip.date.split('-');
          return (
            <g>
              <rect x={tipX - tipW / 2} y={tipY} width={tipW} height={tipH} rx="10"
                fill="#1e293b" fillOpacity="0.97"
                stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <text x={tipX} y={tipY + 17} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)" fontFamily="system-ui">
                {`${tday}/${tm}`}
              </text>
              {/* Sales row */}
              <circle cx={tipX - tipW / 2 + 16} cy={tipY + 34} r="4" fill="#22d3ee" />
              <text x={tipX - tipW / 2 + 26} y={tipY + 38} fontSize="11" fill="rgba(255,255,255,0.7)" fontFamily="system-ui">Ventas</text>
              <text x={tipX + tipW / 2 - 8} y={tipY + 38} textAnchor="end" fontSize="12" fill="#22d3ee" fontWeight="bold" fontFamily="system-ui">
                ${(tip.sales || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
              </text>
              {/* Net row */}
              <circle cx={tipX - tipW / 2 + 16} cy={tipY + 54} r="4" fill="#a78bfa" />
              <text x={tipX - tipW / 2 + 26} y={tipY + 58} fontSize="11" fill="rgba(255,255,255,0.7)" fontFamily="system-ui">Neto</text>
              <text x={tipX + tipW / 2 - 8} y={tipY + 58} textAnchor="end" fontSize="12"
                fill={tip.net >= 0 ? '#a78bfa' : '#f87171'} fontWeight="bold" fontFamily="system-ui">
                {tip.net >= 0 ? '' : '−'}${Math.abs(tip.net || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Bottom padding */}
      <div className="h-3" />
    </div>
  );
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
  const [tableOpen, setTableOpen] = useState(false);

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

      {/* Gráfico de ola */}
      {!loading && byDate.length > 0 && <WaveChart byDate={byDate} />}

      {/* Tabla diaria — desplegable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setTableOpen(o => !o)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <h3 className="font-semibold text-slate-800">Detalle por día</h3>
          <div className="flex items-center gap-3">
            {data && (
              <span className="text-xs text-slate-400">{data.from} → {data.to}</span>
            )}
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${tableOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {tableOpen && loading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {tableOpen && !loading && byDate.length === 0 && (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">
            No hay datos para el período seleccionado.
          </p>
        )}
        {tableOpen && !loading && byDate.length > 0 && (
          <div className="overflow-x-auto border-t border-slate-100">
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
