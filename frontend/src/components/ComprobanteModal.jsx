import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { showToast } from './Toast';

// ── Monochrome SVG icons ─────────────────────────────────────
function CashIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}
function CardIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}
function PhoneIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}
function PrintIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  );
}

const DEFAULT_PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo',         Icon: CashIcon },
  { value: 'tarjeta',  label: 'Tarjeta',           Icon: CardIcon },
  { value: 'virtual',  label: 'Billetera virtual', Icon: PhoneIcon },
];

// Comprobante choices after completing a sale [SF, CA]
// Props: table (full table object), onClose (called when modal should close + queue refresh)
export default function ComprobanteModal({ table, onClose }) {
  const [step, setStep]               = useState('payment'); // 'payment' | 'comprobante'
  const [loading, setLoading]         = useState(false);
  const [modalError, setModalError]   = useState('');

  // Dynamic payment methods
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);

  useEffect(() => {
    api.get('/api/payment-methods')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const active = data.filter(m => m.active);
          if (active.length > 0) {
            setPaymentMethods(active.map(m => ({
              value: m.name,
              label: m.commission_pct > 0 ? `${m.name} (+${m.commission_pct}%)` : m.name,
              Icon: CashIcon,
            })));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Payment state
  const [paymentType, setPaymentType]   = useState('single'); // 'single' | 'multiple'
  const [singleMethod, setSingleMethod] = useState('efectivo');
  const [breakdown, setBreakdown]       = useState({ efectivo: '', tarjeta: '', virtual: '' });

  // When payment methods are loaded, update defaults
  useEffect(() => {
    if (paymentMethods.length > 0 && paymentMethods !== DEFAULT_PAYMENT_METHODS) {
      setSingleMethod(paymentMethods[0].value);
      const bd = {};
      paymentMethods.forEach(m => { bd[m.value] = ''; });
      setBreakdown(bd);
    }
  }, [paymentMethods]);

  const items = table.table_items || [];
  const rawTotal = items.reduce((sum, item) => {
    const base = item.qty * item.unit_price;
    const disc = item.discount_type === 'percent'
      ? base * (item.discount_value / 100)
      : (item.discount_value ?? 0);
    return sum + base - disc;
  }, 0);
  const globalDiscValue = table.discount_value ?? 0;
  const globalDiscType  = table.discount_type  ?? 'fixed';
  const globalDiscAmt   = globalDiscType === 'percent'
    ? rawTotal * (globalDiscValue / 100)
    : globalDiscValue;
  const serviceDeposit = table.service_data?.deposit_amount ? Number(table.service_data.deposit_amount) : 0;
  const total = Math.max(0, rawTotal - globalDiscAmt) + serviceDeposit;

  function buildPaymentPayload() {
    if (paymentType === 'single') {
      return { payment_method: singleMethod, payment_breakdown: null };
    }
    const bd = {};
    paymentMethods.forEach(({ value }) => {
      const v = parseFloat(breakdown[value]) || 0;
      if (v > 0) bd[value] = v;
    });
    return { payment_method: 'multiple', payment_breakdown: bd };
  }

  function breakdownSum() {
    return paymentMethods.reduce((s, { value }) => s + (parseFloat(breakdown[value]) || 0), 0);
  }

  function canProceed() {
    if (paymentType === 'single') return true;
    return Math.abs(breakdownSum() - total) < 0.02;
  }

  // Always complete the sale first; returns sale_id for further actions [DRY]
  async function completeSale() {
    const payload = buildPaymentPayload();
    const res = await api.post(`/api/tables/${table.id}/complete`, payload);
    // Si hay servicio técnico, crear la orden ahora que la venta fue cobrada
    if (table.service_data?.client_name && table.service_data?.device_description) {
      try {
        await api.post('/api/service-orders', {
          ...table.service_data,
          status:         'in_progress',
          table_queue_id: table.id,
        });
      } catch (sErr) {
        showToast('Venta completada. Error al crear orden de servicio: ' + sErr.message, 'error');
      }
    }
    return res.sale_id ?? null;
  }

  // Option 1: generate ticket PDF
  async function generarTicketMuestra() {
    setLoading(true);
    setModalError('');
    try {
      await completeSale();

      const pdfItems = items.map((item) => ({
        name:          item.products?.name ?? '—',
        qty:           item.qty,
        unitPrice:     Number(item.unit_price),
        discountValue: Number(item.discount_value ?? 0),
        discountType:  item.discount_type ?? 'fixed',
      }));

      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/sales/ticket-pdf', {
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
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Option 2: close without receipt
  async function cerrarVentaSinComprobante() {
    setLoading(true);
    setModalError('');
    try {
      await completeSale();
      onClose();
    } catch (err) {
      setModalError(err.message);
      showToast(err.message, 'error');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-blue-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-blue-900 px-6 py-4 rounded-t-2xl">
          <h2 className="text-white font-bold text-lg">Completar venta #{table.table_number}</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Total: <span className="text-emerald-400 font-bold">${total.toFixed(2)}</span>
          </p>
        </div>

        <div className="p-6 bg-white">
          {/* Error banner */}
          {modalError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-red-700 text-sm">{modalError}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Procesando...
            </div>
          ) : step === 'payment' ? (

            /* ── Step 1: Payment method ── */
            <div>
              <p className="text-slate-600 text-sm font-medium mb-4">¿Cómo paga el cliente?</p>

              {/* Toggle single / multiple */}
              <div className="flex gap-2 mb-5">
                {[
                  { key: 'single',   label: 'Un método' },
                  { key: 'multiple', label: 'Cobro múltiple' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPaymentType(key)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      paymentType === key
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {paymentType === 'single' ? (
                <div className="flex flex-col gap-2.5 mb-5">
                  {paymentMethods.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSingleMethod(value)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border text-sm font-semibold transition-colors ${
                        singleMethod === value
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={singleMethod === value ? 'text-emerald-600' : 'text-slate-400'}>
                        <Icon />
                      </span>
                      {label}
                      {singleMethod === value && (
                        <svg className="w-4 h-4 ml-auto text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 mb-5">
                  {paymentMethods.map(({ value, label, Icon }) => (
                    <div key={value} className="flex items-center gap-3">
                      <span className="text-slate-400 flex-shrink-0"><Icon /></span>
                      <span className="text-sm text-slate-700 font-medium w-32 flex-shrink-0">{label}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="$0.00"
                        value={breakdown[value]}
                        onChange={(e) => setBreakdown((prev) => ({ ...prev, [value]: e.target.value }))}
                        className="flex-1 min-w-0 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                  <p className={`text-xs font-medium text-right pt-1 ${
                    Math.abs(breakdownSum() - total) < 0.02 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    Ingresado: <strong>${breakdownSum().toFixed(2)}</strong> / Total: <strong>${total.toFixed(2)}</strong>
                    {Math.abs(breakdownSum() - total) >= 0.02 && ' — los montos no coinciden'}
                  </p>
                </div>
              )}

              <button
                onClick={() => { if (canProceed()) setStep('comprobante'); }}
                disabled={!canProceed()}
                className="w-full bg-emerald-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continuar →
              </button>
            </div>

          ) : (

            /* ── Step 2: Comprobante ── */
            <div>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setStep('payment')}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Volver
                </button>
                <p className="text-slate-600 text-sm font-medium">¿Qué desea emitir?</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={generarTicketMuestra}
                  className="w-full bg-blue-600 text-white px-5 py-4 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors text-left flex items-start gap-4"
                >
                  <PrintIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <span>
                    Imprimir comprobante de compra
                    <span className="block text-blue-200 text-xs font-normal mt-0.5">Genera un ticket PDF de la venta</span>
                  </span>
                </button>

                <button
                  onClick={cerrarVentaSinComprobante}
                  className="w-full border border-slate-200 bg-slate-50 text-slate-600 px-5 py-4 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors text-left flex items-start gap-4"
                >
                  <svg className="w-6 h-6 flex-shrink-0 mt-0.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>
                    No emitir comprobante
                    <span className="block text-slate-400 text-xs font-normal mt-0.5">Cierra la venta sin ticket</span>
                  </span>
                </button>
              </div>
            </div>

          )}
        </div>
      </div>
    </div>
  );
}
