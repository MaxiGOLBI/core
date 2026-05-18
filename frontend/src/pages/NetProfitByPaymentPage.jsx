import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n) {
  return `${parseFloat(n || 0).toFixed(2)}%`;
}

// Fila editable de comisión
function CommissionRow({ method, onSave }) {
  const [pct, setPct] = useState(String(method.commission_pct ?? 0));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSave() {
    const value = parseFloat(pct);
    if (isNaN(value) || value < 0 || value > 100) {
      setMsg('Ingresá un valor entre 0 y 100');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await api.put(`/api/payment-methods/${method.id}`, { commission_pct: value });
      setMsg('Guardado ✓');
      onSave();
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsg(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-700 w-32 shrink-0">{method.name}</span>
      <input
        type="number" min="0" max="100" step="0.01"
        value={pct}
        onChange={e => { setPct(e.target.value); setMsg(''); }}
        className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm text-slate-500">%</span>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      {msg && (
        <span className={`text-xs ${msg.includes('✓') ? 'text-emerald-600' : 'text-rose-500'}`}>
          {msg}
        </span>
      )}
    </div>
  );
}

export default function NetProfitByPaymentPage() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [filter, setFilter] = useState({ from: firstOfMonth, to: today, branch_id: '' });
  const [branches, setBranches] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPaymentMethods = useCallback(async () => {
    try {
      const data = await api.get('/api/payment-methods');
      setPaymentMethods(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    api.get('/api/branches').then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  async function consultar() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter.from)      params.set('from',      filter.from);
      if (filter.to)        params.set('to',        filter.to);
      if (filter.branch_id) params.set('branch_id', filter.branch_id);
      const data = await api.get(`/api/reports/net-profit-by-payment?${params}`);
      setReport(data);
    } catch (err) {
      setError(err.message ?? 'Error al consultar');
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!report) return;
    const header = ['Medio de pago', 'Monto bruto', 'Comisión %', 'Comisión $', 'Ganancia neta'];
    const rows = report.methods.map(m => [
      m.method_display,
      m.gross,
      m.commission_pct,
      m.commission_value,
      m.net,
    ]);
    rows.push(['TOTAL', report.totals.gross, '', report.totals.commission_value, report.totals.net]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `ganancia_neta_${filter.from}_${filter.to}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  const methodsWithSales = report?.methods.filter(m => m.gross > 0) ?? [];
  const methodsNoBilled  = report?.methods.filter(m => m.gross === 0) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 print:space-y-4">

      {/* Encabezado */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-slate-800">Ganancia Neta por Medios de Pago</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Ingresos brutos descontando comisiones de cada medio de pago.
        </p>
      </div>

      {/* Config de comisiones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 print:hidden">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-1">
          Comisiones configuradas
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Ingresá el porcentaje que retiene cada medio. Se usa para calcular la ganancia neta.
        </p>
        {paymentMethods.filter(pm => pm.name.toLowerCase() !== 'efectivo').length === 0 ? (
          <p className="text-sm text-slate-400">Sin medios de pago con comisión. Crealos en Configuración &gt; Métodos de pago.</p>
        ) : (
          <div>
            {paymentMethods
              .filter(pm => pm.name.toLowerCase() !== 'efectivo')
              .map(pm => (
                <CommissionRow key={pm.id} method={pm} onSave={loadPaymentMethods} />
              ))}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end print:hidden">
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
          onClick={consultar}
          disabled={loading}
          className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Consultando…' : 'Consultar'}
        </button>

        {report && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              ↓ Excel (CSV)
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              ↓ PDF
            </button>
          </div>
        )}
      </div>

      {/* Recuadro Ganancia Neta — siempre visible */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-0.5">Ganancia neta:</p>
          <p className="text-4xl font-extrabold text-emerald-800">
            {report ? fmtMoney(report.totals.net) : '—'}
          </p>
          {report && (
            <p className="text-xs text-emerald-600 mt-1">{report.from} → {report.to}</p>
          )}
        </div>
        {report && (
          <div className="text-right space-y-1">
            <p className="text-xs text-slate-500">
              Bruto: <span className="font-semibold text-slate-700">{fmtMoney(report.totals.gross)}</span>
            </p>
            <p className="text-xs text-slate-500">
              Comisiones: <span className="font-semibold text-rose-600">{fmtMoney(report.totals.commission_value)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Spinner */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Resumen (cards) */}
      {report && !loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Ingreso bruto total
              </p>
              <p className="text-2xl font-bold text-slate-700">{fmtMoney(report.totals.gross)}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-1">
                Total comisiones
              </p>
              <p className="text-2xl font-bold text-rose-700">{fmtMoney(report.totals.commission_value)}</p>
            </div>
          </div>

          {/* Tabla de detalle */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Detalle por medio de pago</h2>
            </div>

            {methodsWithSales.length === 0 ? (
              <p className="px-5 py-10 text-sm text-slate-400 text-center">
                Sin ventas en el período seleccionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                      <th className="px-5 py-3 text-left">Medio de pago</th>
                      <th className="px-5 py-3 text-right">Monto bruto</th>
                      <th className="px-5 py-3 text-right">Comisión</th>
                      <th className="px-5 py-3 text-right">Comisión $</th>
                      <th className="px-5 py-3 text-right">Ganancia neta</th>
                      <th className="px-5 py-3 text-right">% del total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {methodsWithSales.map(m => {
                      const pctOfTotal = report.totals.gross > 0
                        ? ((m.gross / report.totals.gross) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={m.method} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-700">{m.method_display}</td>
                          <td className="px-5 py-3 text-right text-slate-700">{fmtMoney(m.gross)}</td>
                          <td className="px-5 py-3 text-right">
                            {m.commission_pct > 0 ? (
                              <span className="text-rose-600 font-semibold">{fmtPct(m.commission_pct)}</span>
                            ) : (
                              <span className="text-slate-400 text-xs">Sin comisión</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-rose-600 font-semibold">
                            {m.commission_value > 0 ? fmtMoney(m.commission_value) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-emerald-700 text-[1rem]">
                            {fmtMoney(m.net)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full rounded-full"
                                  style={{ width: `${Math.min(parseFloat(pctOfTotal), 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-8 text-right">{pctOfTotal}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200">
                    <tr className="bg-slate-50 font-bold text-slate-800">
                      <td className="px-5 py-3">TOTAL</td>
                      <td className="px-5 py-3 text-right">{fmtMoney(report.totals.gross)}</td>
                      <td className="px-5 py-3" />
                      <td className="px-5 py-3 text-right text-rose-600">{fmtMoney(report.totals.commission_value)}</td>
                      <td className="px-5 py-3 text-right text-emerald-700 text-[1rem]">{fmtMoney(report.totals.net)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Métodos sin ventas en el período */}
          {methodsNoBilled.length > 0 && (
            <p className="text-xs text-slate-400 text-center">
              Medios sin ventas en el período: {methodsNoBilled.map(m => m.method_display).join(', ')}.
            </p>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!report && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-14 text-center">
          <p className="text-slate-400 text-sm">Seleccioná un período y presioná Consultar.</p>
        </div>
      )}
    </div>
  );
}
