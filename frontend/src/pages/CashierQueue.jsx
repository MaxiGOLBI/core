import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

export default function CashierQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  async function handleComplete(id, items) {
    if (!items || items.length === 0) {
      setError('No se puede completar una venta sin productos.');
      return;
    }
    try {
      await api.post(`/api/tables/${id}/complete`, {});
      fetchQueue();
    } catch (err) {
      setError(err.message);
    }
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
            const total = items.reduce((sum, item) => {
              const base = item.qty * item.unit_price;
              const disc =
                item.discount_type === 'percent'
                  ? base * (item.discount_value / 100)
                  : item.discount_value ?? 0;
              return sum + base - disc;
            }, 0);

            const confirmedAt = table.confirmed_at
              ? new Date(table.confirmed_at).toLocaleString('es-AR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : '—';

            const sellerName = table.seller?.name ?? 'Desconocido';

            return (
              <div key={table.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Encabezado */}
                <div className="flex items-center justify-between bg-slate-800 px-5 py-3">
                  <div>
                    <span className="text-white font-bold text-base">Venta Nro: {table.table_number}</span>
                    <span className="ml-3 text-slate-400 text-xs">Ticket #{table.table_number}</span>
                  </div>
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2.5 py-0.5 rounded-full">Pendiente de cobro</span>
                </div>

                <div className="p-5">
                  {/* Info de la venta */}
                  <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
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

                  {/* Comentario del ticket */}
                  {table.comment && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4 text-sm">
                      <span className="text-amber-600 font-semibold text-xs uppercase tracking-wide">Comentario: </span>
                      <span className="text-amber-800">{table.comment}</span>
                    </div>
                  )}

                  {/* Detalle de productos */}
                  <div className="border border-slate-100 rounded-lg overflow-hidden mb-4">
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalle de productos</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-100">
                          <th className="text-left px-3 py-1.5 font-medium">Producto</th>
                          <th className="text-center px-3 py-1.5 font-medium">Cant.</th>
                          <th className="text-right px-3 py-1.5 font-medium">P. Unit.</th>
                          <th className="text-right px-3 py-1.5 font-medium">Desc.</th>
                          <th className="text-right px-3 py-1.5 font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr><td colSpan={5} className="px-3 py-3 text-center text-slate-400 text-xs">Sin productos</td></tr>
                        ) : (
                          items.map((item) => {
                            const base = item.qty * item.unit_price;
                            const disc = item.discount_type === 'percent'
                              ? base * (item.discount_value / 100)
                              : (item.discount_value ?? 0);
                            const subtotal = base - disc;
                            return (
                              <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 text-slate-700 font-medium">{item.products?.name ?? '—'}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{item.qty}</td>
                                <td className="px-3 py-2 text-right text-slate-500">${Number(item.unit_price).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-emerald-600 text-xs">
                                  {item.discount_value > 0
                                    ? item.discount_type === 'percent'
                                      ? `-${item.discount_value}%`
                                      : `-$${Number(item.discount_value).toFixed(2)}`
                                    : '—'}
                                </td>
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
                      onClick={() => handleComplete(table.id, items)}
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
    </div>
  );
}
