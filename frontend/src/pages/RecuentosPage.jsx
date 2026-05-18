import { useState, useEffect, useCallback, Fragment } from 'react';
import { api } from '../lib/api';
import { showToast } from '../components/Toast';

// ── Helpers ────────────────────────────────────────────────────
function round2(n) { return Math.round(parseFloat(n || 0) * 100) / 100; }

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

// ── Badge de diferencia con color ──────────────────────────────
function DiffBadge({ diff }) {
  if (diff === null || diff === undefined) return <span className="text-slate-400 text-xs">—</span>;
  if (diff === 0) return <span className="text-slate-500 font-semibold text-sm">{fmtMoney(0)}</span>;
  // auto > manual (diff > 0) → rojo  |  auto < manual (diff < 0) → verde
  const colorClass = diff > 0 ? 'text-rose-600' : 'text-emerald-600';
  const sign = diff > 0 ? '+' : '';
  return <span className={`font-semibold text-sm ${colorClass}`}>{sign}{fmtMoney(diff)}</span>;
}

// ── Fila de detalle ───────────────────────────────────────────
function DetailComparison({ record }) {
  const { manual_breakdown, auto_breakdown } = record;

  const manualByPM  = manual_breakdown?.payment_methods ?? {};
  const autoIngPM   = auto_breakdown?.ingresos_por_metodo ?? {};
  const autoEgrPM   = auto_breakdown?.egresos_por_metodo  ?? {};

  const baseKeys = ['EFECTIVO', 'VIRTUAL', 'TARJETA'];
  const allMethods = [...new Set([
    ...baseKeys,
    ...Object.keys(manualByPM),
    ...Object.keys(autoIngPM),
    ...Object.keys(autoEgrPM),
  ])];

  const autoTotalIng = auto_breakdown?.total_ingresos ?? 0;
  const autoTotalEgr = auto_breakdown?.total_egresos  ?? 0;
  const manTotalIng  = manual_breakdown?.total_ingresos ?? 0;
  const manTotalEgr  = manual_breakdown?.total_egresos  ?? 0;

  return (
    <div className="print:break-inside-avoid overflow-x-auto">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        Detalle por medio de pago
      </p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
            <th className="py-2 pr-4 text-left">Método</th>
            <th className="py-2 px-3 text-right bg-emerald-50/60 rounded-tl">Auto Ingresos</th>
            <th className="py-2 px-3 text-right bg-emerald-50/60">Manual Ingresos</th>
            <th className="py-2 px-3 text-right bg-emerald-50/60 rounded-tr">Dif.</th>
            <th className="py-2 px-3 text-right bg-rose-50/60 rounded-tl">Auto Egresos</th>
            <th className="py-2 px-3 text-right bg-rose-50/60">Manual Egresos</th>
            <th className="py-2 px-3 text-right bg-rose-50/60 rounded-tr">Dif.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {allMethods.map(method => {
            const autoIng = parseFloat(autoIngPM[method] ?? 0);
            const autoEgr = parseFloat(autoEgrPM[method] ?? 0);
            const manIng  = parseFloat(manualByPM[method]?.ingresos ?? 0);
            const manEgr  = parseFloat(manualByPM[method]?.egresos  ?? 0);
            return (
              <tr key={method} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2 pr-4 font-medium text-slate-700">{method}</td>
                <td className="py-2 px-3 text-right text-emerald-700">{fmtMoney(autoIng)}</td>
                <td className="py-2 px-3 text-right text-emerald-700">{fmtMoney(manIng)}</td>
                <td className="py-2 px-3 text-right"><DiffBadge diff={round2(autoIng - manIng)} /></td>
                <td className="py-2 px-3 text-right text-rose-600">{fmtMoney(autoEgr)}</td>
                <td className="py-2 px-3 text-right text-rose-600">{fmtMoney(manEgr)}</td>
                <td className="py-2 px-3 text-right"><DiffBadge diff={round2(autoEgr - manEgr)} /></td>
              </tr>
            );
          })}
          {/* Movimientos manuales de sesión (solo en auto) */}
          {((auto_breakdown?.manual_in ?? 0) > 0 || (auto_breakdown?.manual_out ?? 0) > 0) && (
            <tr className="text-xs text-slate-500 italic">
              <td className="py-1.5 pr-4">Mvtos. manuales sesión</td>
              <td className="py-1.5 px-3 text-right text-emerald-600">{fmtMoney(auto_breakdown.manual_in)}</td>
              <td className="py-1.5 px-3 text-right text-slate-300">—</td>
              <td />
              <td className="py-1.5 px-3 text-right text-rose-500">{fmtMoney(auto_breakdown.manual_out)}</td>
              <td className="py-1.5 px-3 text-right text-slate-300">—</td>
              <td />
            </tr>
          )}
        </tbody>
        <tfoot className="border-t-2 border-slate-300">
          <tr className="font-semibold text-slate-700">
            <td className="py-2 pr-4">Subtotal</td>
            <td className="py-2 px-3 text-right text-emerald-700">{fmtMoney(autoTotalIng)}</td>
            <td className="py-2 px-3 text-right text-emerald-700">{fmtMoney(manTotalIng)}</td>
            <td className="py-2 px-3 text-right">
              <DiffBadge diff={round2(autoTotalIng - manTotalIng)} />
            </td>
            <td className="py-2 px-3 text-right text-rose-600">{fmtMoney(autoTotalEgr)}</td>
            <td className="py-2 px-3 text-right text-rose-600">{fmtMoney(manTotalEgr)}</td>
            <td className="py-2 px-3 text-right">
              <DiffBadge diff={round2(autoTotalEgr - manTotalEgr)} />
            </td>
          </tr>
          <tr className="font-bold text-slate-800 text-base border-t border-slate-200">
            <td className="pt-2 pb-1 pr-4">Balance final</td>
            <td className="pt-2 pb-1 px-3 text-right text-blue-700" colSpan={2}>
              <span className="block text-xs font-normal text-slate-500 mb-0.5">Auto / Manual</span>
              {fmtMoney(auto_breakdown?.balance_final ?? 0)}
              &nbsp;/&nbsp;
              {fmtMoney(manual_breakdown?.balance_final ?? 0)}
            </td>
            <td className="pt-2 pb-1 px-3 text-right" colSpan={4}>
              <span className="block text-xs font-normal text-slate-500 mb-0.5">Diferencia total</span>
              <DiffBadge diff={record.balance_diff} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function RecuentosPage({ hideHeader = false }) {
  const [recuentos, setRecuentos] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);
  const [branches, setBranches]   = useState([]);
  const [filter, setFilter]       = useState({ from: '', to: '', branch_id: '' });

  useEffect(() => {
    api.get('/api/branches').then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const loadRecuentos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.from)      params.set('from',      filter.from);
      if (filter.to)        params.set('to',        filter.to);
      if (filter.branch_id) params.set('branch_id', filter.branch_id);
      const data = await api.get(`/api/cash/recuentos?${params}`);
      setRecuentos(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadRecuentos(); }, [loadRecuentos]);

  // ── Exportar CSV ─────────────────────────────────────────────
  function exportCSV() {
    const header = ['Fecha cierre', 'Sucursal', 'Cerrado por', 'Rol', 'Balance Auto', 'Balance Manual', 'Diferencia'];
    const rows = recuentos.map(r => [
      fmtDateTime(r.closed_at),
      r.branch_name        ?? '',
      r.closed_by_name     ?? '',
      r.closed_by_role     ?? '',
      r.auto_breakdown?.balance_final  ?? '',
      r.manual_breakdown?.balance_final ?? '',
      r.balance_diff       ?? '',
    ]);
    const csv  = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `recuentos_${new Date().toISOString().split('T')[0]}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

      {/* Título */}
      {!hideHeader && (
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recuentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Comparativa entre recuento automático del sistema y recuento manual de cajero/encargado.
          </p>
        </div>
      )}

      {/* Filtros y exportación — ocultos al imprimir */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
          <input
            type="date" value={filter.from}
            onChange={e => setFilter(p => ({ ...p, from: e.target.value }))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
          <input
            type="date" value={filter.to}
            onChange={e => setFilter(p => ({ ...p, to: e.target.value }))}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {branches.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sucursal</label>
            <select
              value={filter.branch_id}
              onChange={e => setFilter(p => ({ ...p, branch_id: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <button
          onClick={loadRecuentos}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Buscar
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="print:hidden flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
          Auto mayor que manual (manual corto)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          Auto menor que manual (manual sobre)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
          Sin diferencia
        </span>
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recuentos.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-slate-400 text-sm">Sin recuentos comparativos disponibles.</p>
            <p className="text-slate-400 text-xs mt-1">
              Aparecen cuando Cajero o Encargado realizan el cierre de caja.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-5 py-3 text-left">Fecha cierre</th>
                  <th className="px-5 py-3 text-left hidden sm:table-cell">Sucursal</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">Cerró</th>
                  <th className="px-5 py-3 text-right bg-slate-100">Automático</th>
                  <th className="px-5 py-3 text-right bg-slate-100">Manual</th>
                  <th className="px-5 py-3 text-right bg-slate-100">Diferencia</th>
                  <th className="px-5 py-3 print:hidden" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recuentos.map(r => {
                  const diff       = r.balance_diff;
                  const isExpanded = expanded === r.id;
                  const rowBg      = diff === null || diff === 0
                    ? ''
                    : diff > 0 ? 'bg-rose-50/50' : 'bg-emerald-50/50';

                  return (
                    <Fragment key={r.id}>
                      <tr className={`transition-colors hover:brightness-95 ${rowBg}`}>
                        <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                          {fmtDateTime(r.closed_at)}
                        </td>
                        <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">
                          {r.branch_name ?? '—'}
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <span className="text-slate-700">{r.closed_by_name ?? '—'}</span>
                          {r.closed_by_role && (
                            <span className="ml-1.5 text-xs text-slate-400 capitalize">({r.closed_by_role})</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-700 bg-slate-50/60">
                          {r.auto_breakdown ? fmtMoney(r.auto_breakdown.balance_final) : <span className="text-slate-400 text-xs">N/D</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-700 bg-slate-50/60">
                          {fmtMoney(r.manual_breakdown?.balance_final)}
                        </td>
                        <td className="px-5 py-3 text-right bg-slate-50/60">
                          <DiffBadge diff={diff} />
                        </td>
                        <td className="px-5 py-3 text-center print:hidden">
                          {r.auto_breakdown && (
                            <button
                              onClick={() => setExpanded(isExpanded ? null : r.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {isExpanded ? 'Ocultar' : 'Ver detalle'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Fila expandida con detalle por método */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td colSpan={7} className="px-6 py-4">
                            <DetailComparison record={r} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totales globales */}
      {recuentos.length > 0 && !loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Recuentos comparados',
              value: recuentos.length,
              format: v => v,
              color: 'text-slate-700',
            },
            {
              label: 'Sesiones con diferencia',
              value: recuentos.filter(r => r.balance_diff !== 0 && r.balance_diff !== null).length,
              format: v => v,
              color: 'text-amber-600',
            },
            {
              label: 'Diferencia total acumulada',
              value: recuentos.reduce((s, r) => s + (r.balance_diff ?? 0), 0),
              format: fmtMoney,
              color: 'text-slate-700',
            },
          ].map(({ label, value, format, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{format(value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
