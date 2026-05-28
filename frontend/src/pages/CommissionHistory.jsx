import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth, getSettings } from '../context/AuthContext';

const ROLE_LABELS = {
  vendedor:  'Vendedor',
  cajero:    'Cajero',
  encargado: 'Encargado',
  dueno:     'Dueño',
};

const PERIOD_LABELS = {
  daily:   'Comisión del día',
  weekly:  'Comisión de la semana',
  monthly: 'Comisión del mes',
};

const PERIOD_CURRENT_LABELS = {
  daily:   'Día actual',
  weekly:  'Semana actual',
  monthly: 'Mes actual',
};

function getDateRange(period, offset) {
  const now = new Date();
  if (period === 'daily') {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    const from = new Date(d); from.setHours(0, 0, 0, 0);
    const to   = new Date(d); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (period === 'monthly') {
    const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  // weekly
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { from: monday, to: sunday };
}

function fmtISO(date) {
  return date.toISOString().split('T')[0];
}

function fmtDateTime(str) {
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtRangeLabel(period, from, to) {
  if (period === 'daily') {
    return from.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });
  }
  if (period === 'monthly') {
    return from.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }
  const opts = { day: '2-digit', month: 'short' };
  return `${from.toLocaleDateString('es-AR', opts)} — ${to.toLocaleDateString('es-AR', opts)}`;
}

export default function CommissionHistory() {
  const { user } = useAuth();
  const [period, setPeriod]         = useState('weekly');
  const [periodLoaded, setPeriodLoaded] = useState(false);
  const [offset, setOffset]         = useState(0);
  const [sales, setSales]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Load commission period setting (cached)
  useEffect(() => {
    getSettings()
      .then(s => { if (s?.commission_period) setPeriod(s.commission_period); })
      .catch(() => {})
      .finally(() => setPeriodLoaded(true));
  }, []);

  const { from, to } = getDateRange(period, offset);

  useEffect(() => {
    if (!periodLoaded) return;
    setLoading(true);
    setSales([]);
    api.get(`/api/commissions/history?from=${fmtISO(from)}&to=${fmtISO(to)}`)
      .then(data => setSales(data))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, period, periodLoaded]);

  const totalCommission = sales.reduce((s, sale) => s + (sale.commission_earned ?? 0), 0);
  const totalSales      = sales.length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">Mis Comisiones</h1>
          <p className="text-blue-100 text-sm mt-1">
            {user?.name} · {ROLE_LABELS[user?.role] ?? user?.role}
          </p>
        </div>
      </div>

      {/* Period navigator */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4 shadow-sm">
        <button
          onClick={() => setOffset(v => v - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Anterior
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800 capitalize">{fmtRangeLabel(period, from, to)}</p>
          {offset === 0
            ? <p className="text-xs text-blue-600 mt-0.5">{PERIOD_CURRENT_LABELS[period]}</p>
            : <p className="text-xs text-slate-400 mt-0.5">{offset < 0 ? `Hace ${Math.abs(offset)} ${period === 'daily' ? (Math.abs(offset) === 1 ? 'día' : 'días') : period === 'weekly' ? (Math.abs(offset) === 1 ? 'semana' : 'semanas') : (Math.abs(offset) === 1 ? 'mes' : 'meses')}` : ''}</p>
          }
        </div>
        <button
          onClick={() => setOffset(v => v + 1)}
          disabled={offset >= 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Siguiente
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-slate-400 text-xs mb-1">Ventas realizadas</p>
          <p className="text-2xl font-bold text-slate-900">{loading ? '…' : totalSales}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-emerald-600 text-xs mb-1">{PERIOD_LABELS[period]}</p>
          <p className="text-2xl font-bold text-emerald-700">
            {loading ? '…' : `$${totalCommission.toFixed(2)}`}
          </p>
        </div>
      </div>

      {/* Sales list */}
      {loading ? (
        <div className="text-center text-slate-400 py-16 text-sm">Cargando...</div>
      ) : sales.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-slate-500 font-medium">Sin ventas en este período</p>
          <p className="text-slate-400 text-sm mt-1">No hay ventas registradas para este período.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sales.map(sale => {
            const isOpen = expandedId === sale.id;
            const items  = sale.details_json ?? [];
            return (
              <div key={sale.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(v => v === sale.id ? null : sale.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{fmtDateTime(sale.date)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {items.length} producto{items.length !== 1 ? 's' : ''} · Total venta: ${Number(sale.total).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-emerald-600">+${(sale.commission_earned ?? 0).toFixed(2)}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 overflow-x-auto">
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Sin detalle de productos</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100">
                            <th className="text-left pb-1.5 font-medium">Producto</th>
                            <th className="text-center pb-1.5 font-medium">Cant.</th>
                            <th className="text-right pb-1.5 font-medium">Com./u</th>
                            <th className="text-right pb-1.5 font-medium">Comisión</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {items.map((item, i) => (
                            <tr key={i} className="text-slate-700">
                              <td className="py-1.5 font-medium">{item.product_name ?? '—'}</td>
                              <td className="py-1.5 text-center text-slate-500">{item.qty}</td>
                              <td className="py-1.5 text-right text-slate-500">${Number(item.commission_per_unit ?? 0).toFixed(2)}</td>
                              <td className="py-1.5 text-right font-semibold text-emerald-600">+${Number(item.commission_earned ?? 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
