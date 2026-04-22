import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import ComprobanteModal from '../components/ComprobanteModal';

export default function CashierQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingTable, setPendingTable] = useState(null); // table to complete

  async function fetchQueue() {
    try {
      const data = await api.get('/api/tables');
      setQueue(data.filter((t) => t.status === 'confirmed'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue();

    // Supabase Realtime subscription for live updates [Realtime]
    const channel = supabase
      .channel('tables_queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables_queue' },
        () => fetchQueue()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Open the comprobante modal instead of completing immediately
  function handleCompleteClick(table) {
    if (!table.table_items || table.table_items.length === 0) {
      setError('No se puede completar una venta sin productos.');
      return;
    }
    setPendingTable(table);
  }

  async function handleCancel(id) {
    if (!confirm('¿Cancelar este ticket?')) return;
    try {
      await api.post(`/api/tables/${id}/cancel`, {});
      fetchQueue();
    } catch (err) {
      setError(err.message);
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Cola de Caja</h1>
        <p className="text-slate-500 text-sm mt-0.5">Tickets confirmados esperando cobro</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="text-slate-300 text-4xl mb-3">⏳</div>
          <p className="text-slate-500 font-medium">No hay tickets en cola</p>
          <p className="text-slate-400 text-sm mt-1">Los tickets confirmados aparecerán aquí en tiempo real.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {queue.map((table) => {
            const items = table.table_items || [];
            const rawTotal = items.reduce((sum, item) => {
              const base = item.qty * item.unit_price;
              const disc =
                item.discount_type === 'percent'
                  ? base * (item.discount_value / 100)
                  : item.discount_value ?? 0;
              return sum + base - disc;
            }, 0);

            const globalDiscValue = table.discount_value ?? 0;
            const globalDiscType  = table.discount_type  ?? 'fixed';
            const globalDiscAmt   = globalDiscType === 'percent'
              ? rawTotal * (globalDiscValue / 100)
              : globalDiscValue;
            const total = Math.max(0, rawTotal - globalDiscAmt);

            const confirmedAt = table.confirmed_at
              ? new Date(table.confirmed_at).toLocaleString('es-AR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : '—';

            const sellerName   = table.seller?.name ?? 'Desconocido';
            const clientName   = table.client?.name ?? null;
            // Nombre visible: cliente o descuento de catálogo
            const displayName  = clientName ?? table.discount_name ?? null;

            return (
              <div key={table.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Encabezado */}
                <div className="flex items-center justify-between bg-slate-800 px-5 py-3">
                  <div>
                    <span className="text-white font-bold text-base">Ticket: {table.table_number}</span>
                  </div>
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2.5 py-0.5 rounded-full">Pendiente de cobro</span>
                </div>

                <div className="p-5">
                  {/* Info de la venta */}
                  <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
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

                  {/* Detalle de productos */}
                  <div className="border border-slate-100 rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-3 py-1.5 font-medium">Producto</th>
                          <th className="text-center px-3 py-1.5 font-medium">Cant.</th>
                          <th className="text-right px-3 py-1.5 font-medium">P. Unit.</th>
                          <th className="text-right px-3 py-1.5 font-medium">Cliente / Descuento</th>
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
                            const base      = item.qty * item.unit_price;
                            const disc      = item.discount_type === 'percent'
                              ? base * (item.discount_value / 100)
                              : (item.discount_value ?? 0);
                            const subtotal  = base - disc;

                            // Columna Descuento: descuento del ítem o (en 1ª fila) descuento global
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

                            // Columna Comentario: comentario del ítem o (en 1ª fila) comentario del ticket
                            const commentLabel = item.comment || (idx === 0 && table.comment ? table.comment : '') || '—';

                            return (
                              <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 text-slate-700 font-medium">{item.products?.name ?? '—'}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{item.qty}</td>
                                <td className="px-3 py-2 text-right text-slate-500">${Number(item.unit_price).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-indigo-600 text-xs font-medium">
                                  {idx === 0 ? (displayName ?? '—') : ''}
                                </td>
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

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCompleteClick(table)}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Completar venta
                    </button>
                    <button
                      onClick={() => handleCancel(table.id)}
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
          onClose={() => { setPendingTable(null); fetchQueue(); }}
        />
      )}
    </div>
  );
}
