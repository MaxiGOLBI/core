import { useState } from 'react';
import { api } from '../lib/api';

// Comprobante choices after completing a sale [SF, CA]
// Props: table (full table object), onClose (called when modal should close + queue refresh)
export default function ComprobanteModal({ table, onClose }) {
  const [loading, setLoading]   = useState(false);
  const [caeResult, setCaeResult] = useState(null); // { cae, caeVtto, cbteNro }
  const [modalError, setModalError] = useState('');

  const items = table.table_items || [];
  const total = items.reduce((sum, item) => {
    const base = item.qty * item.unit_price;
    const disc = item.discount_type === 'percent'
      ? base * (item.discount_value / 100)
      : (item.discount_value ?? 0);
    return sum + base - disc;
  }, 0);

  // Always complete the sale first; returns sale_id for further actions [DRY]
  async function completeSale() {
    const res = await api.post(`/api/tables/${table.id}/complete`, {});
    return res.sale_id ?? null;
  }

  // Option 1: generate sample ticket PDF and open in new tab
  async function generarTicketMuestra() {
    setLoading(true);
    setModalError('');
    try {
      const saleId = await completeSale();

      const pdfItems = items.map((item) => ({
        name:          item.products?.name ?? '—',
        qty:           item.qty,
        unitPrice:     Number(item.unit_price),
        discountValue: Number(item.discount_value ?? 0),
        discountType:  item.discount_type ?? 'fixed',
      }));

      // Fetch PDF as blob and open in a new tab [RM]
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/afip/ticket-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableNumber: table.table_number,
          sellerName:  table.seller?.name ?? '—',
          items:       pdfItems,
          total,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Error generando el ticket');
      }

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Option 2: emit electronic invoice via AFIP WSAA + WSFEv1
  async function emitirFacturaAFIP() {
    setLoading(true);
    setModalError('');
    try {
      const saleId = await completeSale();

      // Factura C (tipo 11) — no IVA desglosado, total = neto [CMV]
      const result = await api.post('/api/afip/cae', {
        impNeto:  total,
        impTotal: total,
        impIVA:   0,
        cbteTipo: 11, // Factura C
        sale_id:  saleId,
      });

      setCaeResult(result);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Option 3: close without receipt (sale is completed)
  async function cerrarVentaSinComprobante() {
    setLoading(true);
    setModalError('');
    try {
      await completeSale();
      onClose();
    } catch (err) {
      setModalError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4">
          <h2 className="text-white font-bold text-lg">Completar venta #{table.table_number}</h2>
          <p className="text-slate-400 text-sm mt-0.5">Total: <span className="text-emerald-400 font-bold">${total.toFixed(2)}</span></p>
        </div>

        <div className="p-6">
          {/* CAE success screen */}
          {caeResult ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-emerald-700 font-bold text-sm mb-2">✓ Factura electrónica emitida</p>
                <p className="text-slate-600 text-xs">CAE: <span className="font-mono font-bold">{caeResult.cae}</span></p>
                <p className="text-slate-600 text-xs">Vto. CAE: {caeResult.caeVtto}</p>
                <p className="text-slate-600 text-xs">Cbte. Nro: {caeResult.cbteNro}</p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {/* Error banner */}
              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                  <p className="text-red-700 text-sm">{modalError}</p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                  Procesando...
                </div>
              ) : (
                <p className="text-slate-600 text-sm mb-4 text-center">¿Qué desea emitir?</p>
              )}

              {!loading && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={generarTicketMuestra}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors text-left"
                  >
                    🖨️ Imprimir ticket de muestra
                    <span className="block text-blue-200 text-xs font-normal mt-0.5">PDF no válido fiscalmente</span>
                  </button>

                  <button
                    onClick={emitirFacturaAFIP}
                    className="w-full bg-emerald-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors text-left"
                  >
                    📄 Emitir factura electrónica
                    <span className="block text-emerald-200 text-xs font-normal mt-0.5">Conecta con AFIP y obtiene CAE</span>
                  </button>

                  <button
                    onClick={cerrarVentaSinComprobante}
                    className="w-full border border-slate-200 bg-slate-50 text-slate-600 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors text-left"
                  >
                    ✕ No emitir comprobante
                    <span className="block text-slate-400 text-xs font-normal mt-0.5">Cierra la venta sin ticket</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
