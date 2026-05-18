import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ComprobanteModal from '../components/ComprobanteModal';
import { showToast } from '../components/Toast';

export default function CashierQueue({ hideHeader = false }) {
  const { refreshUser } = useAuth();
  const [queue, setQueue]       = useState([]);
  const [loading, setLoading]   = useState(true);

  const [pendingTable, setPendingTable] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  async function fetchQueue() {
    try {
      const data = await api.get('/api/tables');
      setQueue(data.filter((t) => t.status === 'confirmed'));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue();
    const channel = supabase
      .channel('cashier_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables_queue' }, () => fetchQueue())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  function handleCompleteClick(table) {
    if (!table.table_items || table.table_items.length === 0) {
      showToast('No se puede completar una venta sin productos.', 'error');
      return;
    }
    setPendingTable(table);
  }

  async function doCancel() {
    const id = cancelTarget;
    setCancelTarget(null);
    try {
      await api.post(`/api/tables/${id}/cancel`, {});
      fetchQueue();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Cargando cola...
      </div>
    );
  }

  return (
    <>
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {!hideHeader && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
          <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative">
            <h1 className="text-2xl font-bold text-white">Cola de Caja</h1>
            <p className="text-blue-100 text-sm mt-1">Ventas confirmadas esperando cobro</p>
          </div>
        </div>
      )}



      {queue.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="flex justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No hay ventas en cola</p>
          <p className="text-slate-400 text-sm mt-1">Las ventas confirmadas aparecerán aquí en tiempo real.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {queue.map((table) => {
            const items = table.table_items || [];
            const rawTotal = items.reduce((sum, item) => {
              const base = item.qty * item.unit_price;
              const disc = item.discount_type === 'percent'
                ? base * (item.discount_value / 100)
                : item.discount_value ?? 0;
              return sum + base - disc;
            }, 0);
            const globalDiscValue = table.discount_value ?? 0;
            const globalDiscType  = table.discount_type  ?? 'fixed';
            const globalDiscAmt   = globalDiscType === 'percent'
              ? rawTotal * (globalDiscValue / 100)
              : globalDiscValue;
            const productTotal  = Math.max(0, rawTotal - globalDiscAmt);
            const serviceDeposit = table.service_data?.deposit_amount ? Number(table.service_data.deposit_amount) : 0;
            const total         = productTotal + serviceDeposit;
            const confirmedAt = table.confirmed_at
              ? new Date(table.confirmed_at).toLocaleString('es-AR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : '—';
            const sellerName  = table.seller?.name ?? 'Desconocido';
            const clientName  = table.client?.name ?? null;
            const displayName = clientName ?? table.discount_name ?? null;

            return (
              <div key={table.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-cyan-500 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-base">Venta #{table.table_number}</span>
                    {table.service_data && (
                      <span className="bg-violet-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        🔧 Servicio Técnico
                      </span>
                    )}
                  </div>
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2.5 py-0.5 rounded-full">Pendiente de cobro</span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 text-sm">
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-slate-400 text-xs mb-0.5">Vendedor</p>
                      <p className="font-semibold text-slate-800">{sellerName}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-slate-400 text-xs mb-0.5">Fecha</p>
                      <p className="font-semibold text-slate-800">{confirmedAt}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg px-3 py-2">
                      <p className="text-emerald-600 text-xs mb-0.5">Total</p>
                      <p className="font-bold text-emerald-700 text-lg">${total.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Desglose servicio técnico */}
                  {table.service_data && (
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-3 text-sm space-y-1.5">
                      <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">🔧 Servicio Técnico</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cliente</span>
                        <span className="font-semibold text-slate-800">{table.service_data.client_name}{table.service_data.client_phone ? ` • ${table.service_data.client_phone}` : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Equipo</span>
                        <span className="font-medium text-slate-700">{table.service_data.device_description}</span>
                      </div>
                      {table.service_data.service_description && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Trabajo</span>
                          <span className="text-slate-700">{table.service_data.service_description}</span>
                        </div>
                      )}
                      <div className="border-t border-violet-200 pt-1.5 flex justify-between">
                        <span className="text-slate-500">Precio total servicio</span>
                        <span className="font-semibold text-slate-800">${Number(table.service_data.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-violet-700 font-medium">Seña a cobrar ahora</span>
                        <span className="font-bold text-violet-700">${serviceDeposit.toFixed(2)}</span>
                      </div>
                      {table.service_data.total_amount > table.service_data.deposit_amount && (
                        <div className="flex justify-between">
                          <span className="text-amber-600">Saldo al retirar</span>
                          <span className="font-bold text-amber-600">${Math.max(0, Number(table.service_data.total_amount) - serviceDeposit).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="border border-slate-100 rounded-lg overflow-hidden mb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-400 bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-3 py-1.5 font-medium">Producto</th>
                            <th className="text-center px-3 py-1.5 font-medium">Cant.</th>
                            <th className="text-right px-3 py-1.5 font-medium">P. Unit.</th>
                            <th className="text-right px-3 py-1.5 font-medium">Cliente / Desc.</th>
                            <th className="text-right px-3 py-1.5 font-medium">Descuento</th>
                            <th className="text-left px-3 py-1.5 font-medium">Comentario</th>
                            <th className="text-right px-3 py-1.5 font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr><td colSpan={7} className="px-3 py-3 text-center text-slate-400 text-xs">Sin productos</td></tr>
                          ) : (
                            items.map((item, idx) => {
                              const base     = item.qty * item.unit_price;
                              const disc     = item.discount_type === 'percent'
                                ? base * (item.discount_value / 100)
                                : (item.discount_value ?? 0);
                              const subtotal = base - disc;
                              const hasItemDisc = item.discount_value > 0;
                              const discLabel = hasItemDisc
                                ? item.discount_type === 'percent'
                                  ? `-${item.discount_value}%  (-$${disc.toFixed(2)})`
                                  : `-$${Number(item.discount_value).toFixed(2)}`
                                : idx === 0 && globalDiscAmt > 0
                                  ? globalDiscType === 'percent'
                                    ? `-${globalDiscValue}%  (-$${globalDiscAmt.toFixed(2)})`
                                    : `-$${globalDiscAmt.toFixed(2)}`
                                  : '—';
                              const commentLabel = item.comment || (idx === 0 && table.comment ? table.comment : '') || '—';
                              return (
                                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                  <td className="px-3 py-2 text-slate-700 font-medium">{item.products?.name ?? '—'}</td>
                                  <td className="px-3 py-2 text-center text-slate-500">{item.qty}</td>
                                  <td className="px-3 py-2 text-right text-slate-500">${Number(item.unit_price).toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-blue-600 text-xs font-medium">{idx === 0 ? (displayName ?? '—') : ''}</td>
                                  <td className="px-3 py-2 text-right text-emerald-600 text-xs whitespace-nowrap">{discLabel}</td>
                                  <td className="px-3 py-2 text-slate-400 text-xs">{commentLabel}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-900">${subtotal.toFixed(2)}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCompleteClick(table)}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Completar venta
                    </button>
                    <button
                      onClick={() => setCancelTarget(table.id)}
                      className="border border-red-200 bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingTable && (
        <ComprobanteModal
          table={pendingTable}
          onClose={() => { setPendingTable(null); fetchQueue(); refreshUser(); }}
        />
      )}
    </div>

    {cancelTarget && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">¿Cancelar esta venta?</h3>
                <p className="text-sm text-slate-500 mt-0.5">La venta volverá al estado cancelado.</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 flex gap-3">
            <button
              onClick={() => setCancelTarget(null)}
              className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={doCancel}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Sí, cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
