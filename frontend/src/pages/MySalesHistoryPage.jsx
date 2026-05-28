import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_LABELS = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta',
  virtual: 'Billetera virtual', multiple: 'Cobro múltiple',
};

const STATUS_META = {
  open:      { label: 'Abierto',            cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Pendiente de cobro', cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelada',          cls: 'bg-red-100 text-red-600' },
  completed: { label: 'Completada',         cls: 'bg-emerald-100 text-emerald-700' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  );
}

function getCommissionTotal(details) {
  if (!Array.isArray(details)) return null;
  const total = details.reduce((sum, item) => {
    const comm = typeof item.commission === 'number' ? item.commission
      : typeof item.commission_per_unit === 'number' ? item.commission_per_unit : 0;
    return sum + comm * (item.qty ?? 1);
  }, 0);
  return total > 0 ? total : null;
}

// ── SaleDetail ────────────────────────────────────────────────────────────────

function SaleDetail({ sale, onBack }) {
  const meta = STATUS_META[sale.status === 'cancelled' ? 'cancelled' : 'completed'];
  const items = sale.details_json ?? [];
  const commission = getCommissionTotal(items);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-blue-900 px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-slate-300 hover:text-white transition-colors mr-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-white font-bold text-lg">Venta</h2>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.cls}`}>
            {meta.label}
          </span>
        </div>
        <p className="text-slate-300 text-sm mt-1">
          {new Date(sale.date).toLocaleDateString('es-AR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
          })}
          {' · '}
          {new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
        {/* Cards */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {sale.users?.name && (
            <div className="col-span-2 bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Vendedor</p>
              <p className="font-semibold text-slate-800">{sale.users.name}</p>
            </div>
          )}
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-0.5">Cliente</p>
            <p className="font-semibold text-slate-800">{sale.clients?.name ?? '—'}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl px-4 py-3">
            <p className="text-xs text-emerald-600 mb-0.5">Total</p>
            <p className="font-bold text-emerald-700 text-lg">${parseFloat(sale.total).toFixed(2)}</p>
          </div>
          {sale.payment_method && (
            <div className="col-span-2 bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-1">Método de pago</p>
              <p className="font-semibold text-slate-800 text-sm">
                {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
              </p>
            </div>
          )}
        </div>

        {/* Commission */}
        {commission !== null && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700 font-medium">Tu comisión: ${commission.toFixed(2)}</p>
          </div>
        )}

        {/* Products table */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Productos</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-400 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-semibold">Producto</th>
                  <th className="text-center px-3 py-2 font-semibold">Cant.</th>
                  <th className="text-right px-3 py-2 font-semibold">P. Unit.</th>
                  <th className="text-right px-3 py-2 font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-400 text-xs">Sin productos</td>
                  </tr>
                ) : items.map((it, idx) => {
                  const base = it.qty * it.unit_price;
                  const disc = it.discount_type === 'percent'
                    ? base * ((it.discount_value ?? 0) / 100)
                    : (it.discount_value ?? 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-slate-700">
                        {it.product_name ?? it.name ?? it.product_id}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{it.qty}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">
                        ${parseFloat(it.unit_price).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                        ${(base - disc).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MySalesHistoryPage() {
  const { user } = useAuth();
  const [sales,    setSales]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    // Default to current month to avoid loading all history
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    api.get(`/api/sales?seller_id=${user.id}&from=${monthStart}&to=${today}T23:59:59`)
      .then((d) => setSales(d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = sales.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.clients?.name ?? '').toLowerCase().includes(q) ||
      (s.details_json ?? []).some((i) =>
        (i.product_name ?? i.name ?? '').toLowerCase().includes(q)
      )
    );
  });

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* ── Left panel — hidden on mobile when detail is open ── */}
      <div className={`${
        selected ? 'hidden md:flex' : 'flex'
      } w-full md:w-[300px] flex-shrink-0 border-r border-gray-200 flex-col bg-white`}>
        <div className="px-4 py-3 bg-blue-900 border-b border-blue-800">
          <h2 className="font-bold text-white text-base">Mis ventas</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente o producto..."
            className="mt-2 w-full text-sm bg-white/10 text-white placeholder-blue-200 border border-blue-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-2">
              <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {search ? 'Sin resultados' : 'No hay ventas'}
            </div>
          ) : (
            filtered.map((sale) => {
              const isSelected = selected?.id === sale.id;
              const meta = STATUS_META[sale.status === 'cancelled' ? 'cancelled' : 'completed'];
              return (
                <button
                  key={sale.id}
                  onClick={() => setSelected(sale)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-l-blue-600'
                      : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold truncate text-slate-800 block">
                        {sale.clients?.name || 'Sin cliente'}
                      </span>
                      {sale.users?.name && (
                        <span className="text-xs text-slate-500 truncate block">{sale.users.name}</span>
                      )}
                    </div>
                    <span className="text-sm font-bold flex-shrink-0 text-emerald-600">
                      ${parseFloat(sale.total).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className="text-xs text-slate-400">{fmt(sale.date)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel — full screen on mobile when detail is open ── */}
      <div className={`${
        selected ? 'flex' : 'hidden md:flex'
      } flex-1 flex-col overflow-hidden`}>
        {selected ? (
          <SaleDetail sale={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <svg className="w-14 h-14 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium">Seleccioná una venta para ver el detalle</p>
          </div>
        )}
      </div>
    </div>
  );
}
