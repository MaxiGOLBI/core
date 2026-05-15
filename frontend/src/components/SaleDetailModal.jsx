import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';
import EditSaleModal from './EditSaleModal';

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta:  'Tarjeta',
  virtual:  'Billetera virtual',
  multiple: 'Cobro múltiple',
};

const PAYMENT_ICONS = {
  efectivo: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  tarjeta: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  virtual: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
  multiple: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
};

function getProductName(item) {
  return item.product_name ?? item.name ?? null;
}

function getCommissionTotal(sale) {
  if (!sale.details_json || !Array.isArray(sale.details_json)) return null;
  return sale.details_json.reduce((sum, item) => {
    const comm =
      typeof item.commission === 'number' ? item.commission :
      typeof item.commission_per_unit === 'number' ? item.commission_per_unit : 0;
    return sum + comm * (item.qty ?? 1);
  }, 0);
}

// SaleDetailModal — ticket-style modal with action toolbar
// Props:
//   sale        – full sale object (with details_json, users, clients, etc.)
//   onClose     – close modal
//   onCancelled – called after a successful cancel (to refresh the list)
export default function SaleDetailModal({ sale, onClose, onCancelled }) {
  const { hasRole } = useAuth();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [markFaulty, setMarkFaulty]       = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [currentSale, setCurrentSale]     = useState(sale);

  // Post-cancel: credit note for sales without a client
  const [postCancelDialog, setPostCancelDialog] = useState(false);
  const [cnClients, setCnClients]               = useState([]);
  const [cnClientId, setCnClientId]             = useState('');
  const [cnLoading, setCnLoading]               = useState(false);

  if (!sale) return null;

  const items      = currentSale.details_json ?? [];
  const commission = getCommissionTotal(currentSale);
  const isCancelled = currentSale.status === 'cancelled';

  async function handleCancel() {
    setLoading(true);
    setError('');
    try {
      const result = await api.post(`/api/sales/${currentSale.id}/cancel`, { mark_faulty: markFaulty });
      setConfirmCancel(false);
      setMarkFaulty(false);
      setCurrentSale((prev) => ({ ...prev, status: 'cancelled' }));
      onCancelled?.();

      if (!result.credit_note) {
        // No client on the sale — offer to create a credit note now
        api.get('/api/clients').then((data) => setCnClients(data ?? [])).catch(() => {});
        setPostCancelDialog(true);
        showToast('Venta cancelada y stock restaurado', 'success');
      } else {
        showToast('Venta cancelada. Nota de crédito generada para el cliente.', 'success');
        onClose();
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCreditNote() {
    if (!cnClientId) { showToast('Seleccioná un cliente.', 'error'); return; }
    setCnLoading(true);
    try {
      await api.post(`/api/sales/${currentSale.id}/credit-note`, { client_id: cnClientId });
      showToast('Nota de crédito generada.', 'success');
      setPostCancelDialog(false);
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCnLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-blue-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Ticket header ── */}
        <div className="bg-blue-900 px-6 py-4 flex items-start justify-between gap-4 flex-shrink-0 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg">Venta</h2>
              {isCancelled && (
                <span className="bg-red-500/20 border border-red-400/40 text-red-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                  CANCELADA
                </span>
              )}
            </div>
            <p className="text-slate-300 text-sm mt-1">
              {new Date(currentSale.date).toLocaleDateString('es-AR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              })}
              {' · '}
              {new Date(currentSale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors mt-0.5 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Action toolbar ── */}
        {!isCancelled && hasRole('encargado', 'dueno') && (
          <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-100 bg-white flex-shrink-0 overflow-x-auto">
            {/* Edit */}
            <button
              onClick={() => setShowEdit(true)}
              title="Editar venta"
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-800 min-w-[56px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L18 10.5" />
              </svg>
              <span className="text-xs font-medium">Editar</span>
            </button>

            {/* Invoice */}
            <button
              title="Emitir factura"
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-800 min-w-[56px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-xs font-medium">Factura</span>
            </button>

            {/* Credit note */}
            <button
              title="Generar nota de crédito"
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-indigo-700 min-w-[68px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-xs font-medium">Nota cred.</span>
            </button>

            {/* Cancel sale */}
            <button
              onClick={() => setConfirmCancel(true)}
              title="Cancelar compra"
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg hover:bg-red-50 hover:shadow-sm transition-all text-slate-500 hover:text-red-700 min-w-[68px] ml-auto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="text-xs font-medium">Cancelar</span>
            </button>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4 bg-white">

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Vendedor</p>
              <p className="font-semibold text-slate-800">{currentSale.users?.name ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Cliente</p>
              <p className="font-semibold text-slate-800">{currentSale.clients?.name ?? '—'}</p>
            </div>
            {currentSale.creator?.name && (
              <div className="col-span-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                <p className="text-xs text-indigo-400 mb-0.5">Ticket creado por</p>
                <p className="font-semibold text-indigo-800">{currentSale.creator.name}</p>
              </div>
            )}
            <div className="bg-emerald-50 rounded-xl px-4 py-3">
              <p className="text-xs text-emerald-600 mb-0.5">Total</p>
              <p className="font-bold text-emerald-700 text-lg">${parseFloat(currentSale.total).toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Método de pago</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-500">{PAYMENT_ICONS[currentSale.payment_method]}</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {PAYMENT_LABELS[currentSale.payment_method] ?? currentSale.payment_method ?? '—'}
                </span>
              </div>
              {currentSale.payment_method === 'multiple' && currentSale.payment_breakdown && (
                <div className="mt-1 space-y-0.5">
                  {Object.entries(currentSale.payment_breakdown).map(([method, amount]) => (
                    <p key={method} className="text-xs text-slate-500">
                      {PAYMENT_LABELS[method] ?? method}: ${Number(amount).toFixed(2)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Discount badge */}
          {currentSale.discount_value > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
              <p className="text-sm text-amber-700 font-medium">
                Descuento{currentSale.discount_name ? ` "${currentSale.discount_name}"` : ''}:{' '}
                {currentSale.discount_type === 'percent'
                  ? `-${currentSale.discount_value}%`
                  : `-$${parseFloat(currentSale.discount_value).toFixed(2)}`}
              </p>
            </div>
          )}

          {/* Comment */}
          {currentSale.comment && (
            <p className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-3">"{currentSale.comment}"</p>
          )}

          {/* Commission */}
          {commission !== null && commission > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-700 font-medium">Comisión del vendedor: ${commission.toFixed(2)}</p>
            </div>
          )}

          {/* Items table */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Productos</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-400 border-b border-slate-200">
                    <th className="text-left px-3 py-2 font-semibold">Producto</th>
                    <th className="text-center px-3 py-2 font-semibold">Cant.</th>
                    <th className="text-right px-3 py-2 font-semibold">P. Unit.</th>
                    <th className="text-right px-3 py-2 font-semibold">Desc.</th>
                    <th className="text-right px-3 py-2 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400 text-xs">Sin productos</td></tr>
                  ) : items.map((item, idx) => {
                    const base    = item.qty * item.unit_price;
                    const disc    = item.discount_type === 'percent'
                      ? base * ((item.discount_value ?? 0) / 100)
                      : (item.discount_value ?? 0);
                    const subtotal = base - disc;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-slate-700">
                          {getProductName(item) ?? item.product_id}
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-500">{item.qty}</td>
                        <td className="px-3 py-2.5 text-right text-slate-500">
                          ${parseFloat(item.unit_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-red-500 text-xs">
                          {item.discount_value
                            ? item.discount_type === 'percent'
                              ? `-${item.discount_value}%`
                              : `-$${parseFloat(item.discount_value).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                          ${subtotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full border border-slate-200 bg-white text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* ── Confirm cancel dialog ── */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">¿Cancelar esta venta?</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    El stock de los productos se va a restablecer. La comisión del vendedor se mantiene.
                    {currentSale.client_id && ' Se generará una nota de crédito para el cliente.'}
                  </p>
                  {/* Faulty checkbox */}
                  <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={markFaulty}
                      onChange={(e) => setMarkFaulty(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 leading-tight">
                      <span className="font-medium text-orange-600">Declarar producto(s) como fallados</span>
                      <span className="block text-xs text-slate-400 mt-0.5">El stock fallado de cada producto se incrementará con las unidades devueltas.</span>
                    </span>
                  </label>
                </div>
              </div>
              {error && (
                <p className="text-red-600 text-sm mt-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            <div className="px-6 py-4 flex gap-3">
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={loading}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Cancelando...' : 'Sí, cancelar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post-cancel: create credit note dialog ── */}
      {postCancelDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Nota de crédito</h3>
              <button
                onClick={() => { setPostCancelDialog(false); onClose(); }}
                className="text-white/70 hover:text-white text-xl leading-none"
              >&times;</button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-5">
                La venta fue cancelada. No tenía un cliente registrado.
                Podés asignar un cliente ahora para generar la nota de crédito correspondiente.
              </p>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cliente</label>
              <select
                value={cnClientId}
                onChange={(e) => setCnClientId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccionar cliente...</option>
                {cnClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => { setPostCancelDialog(false); onClose(); }}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Omitir
              </button>
              <button
                onClick={handleCreateCreditNote}
                disabled={cnLoading || !cnClientId}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50 transition-all"
              >
                {cnLoading ? 'Generando...' : 'Generar nota de crédito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditSaleModal
          sale={currentSale}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => setCurrentSale((prev) => ({ ...prev, ...updated }))}
        />
      )}
    </div>
  );
}
