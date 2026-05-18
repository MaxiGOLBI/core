import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

function fmtMoney(n) {
  return '$' + parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return d + '/' + m + '/' + y;
}

const PERIOD_OPTIONS = [
  { key: 'mes',    label: 'Este mes',     getRange: () => [monthStartStr(), todayStr()] },
  { key: 'semana', label: 'Esta semana',  getRange: () => {
      const d = new Date(); d.setDate(d.getDate() - 6);
      return [d.toISOString().split('T')[0], todayStr()];
    }},
  { key: 'custom', label: 'Personalizado', getRange: null },
];

const IconLink = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);
const IconInfo = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
  </svg>
);

function SummaryCard({ label, value, icon, isResult }) {
  const negative = isResult && parseFloat(value) < 0;
  return (
    <div className="bg-blue-600 rounded-lg p-4 text-white flex flex-col gap-1">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold tracking-widest uppercase leading-tight">{label}</span>
        <span className="opacity-75 flex-shrink-0 ml-2">{icon}</span>
      </div>
      <span className={`text-xl font-bold mt-1 ${negative ? 'text-red-300' : 'text-white'}`}>
        {fmtMoney(value)}
      </span>
    </div>
  );
}

const LinkIcon = () => (
  <svg className="w-3 h-3 opacity-40 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

function Row({ label, data, field, colorFn, bold, highlight }) {
  const rowBg    = highlight ? 'bg-green-600' : '';
  const labelCls = highlight
    ? 'px-4 py-2.5 text-sm font-semibold text-white'
    : bold
    ? 'px-4 py-2 text-sm font-semibold text-slate-800'
    : 'px-4 py-2 text-sm text-slate-600';

  const cellColor = (v) => {
    if (highlight) return 'text-white font-bold';
    const c = colorFn ? colorFn(v) : 'text-slate-700';
    return bold ? c + ' font-semibold' : c + ' font-medium';
  };

  return (
    <tr className={rowBg}>
      <td className={labelCls}>{label}</td>
      <td className={'px-4 py-2 text-right text-sm whitespace-nowrap ' + cellColor(data.total[field])}>
        {fmtMoney(data.total[field])}
      </td>
      {data.branches.map((b) => (
        <td key={b.branch_id} className={'px-4 py-2 text-right text-sm whitespace-nowrap ' + cellColor(b[field])}>
          <span className="inline-flex items-center gap-1">
            <LinkIcon />
            {fmtMoney(b[field])}
          </span>
        </td>
      ))}
    </tr>
  );
}

export default function IncomeStatementPage() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [period, setPeriod]         = useState('mes');
  const [customFrom, setCustomFrom] = useState(monthStartStr());
  const [customTo, setCustomTo]     = useState(todayStr());
  const [showMenu, setShowMenu]     = useState(false);

  const getRange = () => {
    const opt = PERIOD_OPTIONS.find(p => p.key === period);
    if (opt?.getRange) return opt.getRange();
    return [customFrom || monthStartStr(), customTo || todayStr()];
  };

  const [from, to] = getRange();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [f, t] = getRange();
      const d = await api.get('/api/reports/income-statement?from=' + f + '&to=' + t);
      setData(d);
    } catch (err) {
      setError(err.message || 'Error al cargar el estado de resultados.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  const colorRed   = (v) => parseFloat(v) > 0 ? 'text-red-600' : 'text-slate-400';
  const colorGreen = (v) => parseFloat(v) >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-cyan-500 px-6 py-4 shadow">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <svg className="w-6 h-6 text-white opacity-80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h1 className="text-xl font-bold text-white">Estado de Resultados</h1>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5 space-y-4">

        {/* Period bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center px-4 py-3 gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-none mb-1">
                Per&#237;odo
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="flex items-center gap-2 w-full min-w-[260px] border border-slate-300 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="flex-1 text-center text-sm font-medium text-slate-700">
                    {fmtDate(from)} - {fmtDate(to)}
                  </span>
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[200px] py-1">
                    {PERIOD_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => { setPeriod(opt.key); setShowMenu(false); }}
                        className={'w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ' +
                          (period === opt.key ? 'text-blue-600 font-semibold bg-blue-50/60' : 'text-slate-700')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-slate-400 text-sm">-</span>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            <button onClick={load} title="Actualizar" className="ml-auto p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : data?.total && data?.branches && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="VENTAS"       value={data.total.sales}       icon={<IconLink />} />
              <SummaryCard label="GASTOS"       value={data.total.expenses}    icon={<IconLink />} />
              <SummaryCard label="RESULTADO"    value={data.total.result}      icon={<IconInfo />} isResult />
              <SummaryCard label="STOCK ACTUAL" value={data.total.stock_value} icon={<IconLink />} />
            </div>

            {/* Main P&L table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-full" />
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                      Total
                    </th>
                    {data.branches.map(b => (
                      <th key={b.branch_id} className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                        {b.branch_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <Row label="Total Ventas"             data={data} field="sales"          colorFn={colorGreen} />
                  <Row label="Costo Mercader&#237;a Vendida" data={data} field="cogs"       colorFn={colorRed} />
                  <Row label="Costo Financiero"         data={data} field="financial_cost" colorFn={colorRed} />
                  <Row label="Rentabilidad Bruta"       data={data} field="gross_profit"   colorFn={colorGreen} bold />
                  <Row label="Total Gastos"             data={data} field="expenses"       colorFn={colorRed} />
                  <Row label="Resultado Operativo"      data={data} field="result"         highlight />
                </tbody>
              </table>
            </div>

            {/* Stock per branch */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700">Stock Actual por Sucursal (valorizado al costo)</h3>
              </div>
              <table className="w-full min-w-[360px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sucursal</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor en stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.branches.map(b => (
                    <tr key={b.branch_id}>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{b.branch_name}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-700">{fmtMoney(b.stock_value)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-4 py-2.5 text-sm font-bold text-slate-800">Total</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-blue-700">{fmtMoney(data.total.stock_value)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showMenu && <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />}
    </div>
  );
}