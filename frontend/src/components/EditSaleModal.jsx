import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { showToast } from './Toast';

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { key: 'products', label: 'Productos' },
  { key: 'payment',  label: 'Método de pago' },
];

// ── SVG icons ────────────────────────────────────────────────
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

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo',         Icon: CashIcon },
  { value: 'tarjeta',  label: 'Tarjeta',           Icon: CardIcon },
  { value: 'virtual',  label: 'Billetera virtual', Icon: PhoneIcon },
];

// ── Product search combobox ───────────────────────────────────
function ProductCombobox({ value, products, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);

  const selected = products.find((p) => p.id === value);
  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  function select(p) {
    onChange(p.id, Number(p.price));
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="relative flex-1 min-w-0">
      <input
        type="text"
        value={open ? query : (selected ? `${selected.name} — $${Number(selected.price).toFixed(2)}` : '')}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscá un producto..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">Sin resultados</p>
          ) : filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => select(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              {p.name}
              <span className="text-slate-400 ml-2">${Number(p.price).toFixed(2)}</span>
              {p.stock !== undefined && (
                <span className={`ml-2 text-xs ${p.stock <= 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  stock: {p.stock}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function EditSaleModal({ sale, onClose, onSaved }) {
  const [tab, setTab]       = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const keyRef = useRef(0);

  // ── Products state ──
  const [items, setItems] = useState(() =>
    (sale.details_json ?? []).map((item, idx) => ({
      _key:           idx,
      product_id:     item.product_id     ?? '',
      product_name:   item.product_name   ?? item.name ?? '',
      qty:            item.qty            ?? 1,
      unit_price:     Number(item.unit_price  ?? 0),
      discount_value: Number(item.discount_value ?? 0),
      discount_type:  item.discount_type  ?? 'fixed',
      commission:     item.commission     ?? 0,
      commission_per_unit: item.commission_per_unit ?? 0,
    }))
  );

  // ── Payment state ──
  const [paymentType, setPaymentType] = useState(
    sale.payment_method === 'multiple' ? 'multiple' : 'single'
  );
  const [singleMethod, setSingleMethod] = useState(
    sale.payment_method === 'multiple' ? 'efectivo' : (sale.payment_method ?? 'efectivo')
  );
  const [breakdown, setBreakdown] = useState({
    efectivo: sale.payment_breakdown?.efectivo ?? '',
    tarjeta:  sale.payment_breakdown?.tarjeta  ?? '',
    virtual:  sale.payment_breakdown?.virtual  ?? '',
  });

  useEffect(() => {
    api.get('/api/products').then(setProducts).catch(() => {});
    keyRef.current = (sale.details_json ?? []).length;
  }, []);

  // ── Computed totals ──
  function calcSubtotal(item) {
    const base = item.qty * item.unit_price;
    const disc = item.discount_type === 'percent'
      ? base * (item.discount_value / 100)
      : (item.discount_value ?? 0);
    return Math.max(0, base - disc);
  }

  const newTotal = items.reduce((s, item) => s + calcSubtotal(item), 0);

  function breakdownSum() {
    return PAYMENT_METHODS.reduce((s, { value }) => s + (parseFloat(breakdown[value]) || 0), 0);
  }

  // ── Item helpers ──
  function addItem() {
    keyRef.current++;
    setItems((prev) => [...prev, {
      _key: keyRef.current, product_id: '', product_name: '',
      qty: 1, unit_price: 0, discount_value: 0, discount_type: 'fixed',
      commission: 0, commission_per_unit: 0,
    }]);
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i._key !== key));
  }

  function updateItem(key, field, value) {
    setItems((prev) => prev.map((i) => i._key === key ? { ...i, [field]: value } : i));
  }

  function handleProductSelect(key, productId, price) {
    const prod = products.find((p) => p.id === productId);
    setItems((prev) => prev.map((i) => i._key === key ? {
      ...i,
      product_id:   productId,
      product_name: prod?.name ?? '',
      unit_price:   price,
    } : i));
  }

  // ── Save ──
  async function handleSave() {
    if (items.length === 0) { showToast('La venta debe tener al menos un producto', 'error'); return; }
    if (items.some((i) => !i.product_id)) { showToast('Hay productos sin seleccionar', 'error'); return; }

    // eslint-disable-next-line no-unused-vars
    const newDetailsJson = items.map(({ _key, ...rest }) => rest);

    const payload = { details_json: newDetailsJson, total: newTotal };

    if (paymentType === 'single') {
      payload.payment_method    = singleMethod;
      payload.payment_breakdown = null;
    } else {
      const bd = {};
      PAYMENT_METHODS.forEach(({ value }) => {
        const v = parseFloat(breakdown[value]) || 0;
        if (v > 0) bd[value] = v;
      });
      if (Object.keys(bd).length > 0) {
        payload.payment_method    = 'multiple';
        payload.payment_breakdown = bd;
      }
    }

    setLoading(true);
    try {
      const updated = await api.patch(`/api/sales/${sale.id}`, payload);
      showToast('Venta actualizada', 'success');
      onSaved?.(updated);
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <div className="bg-blue-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-blue-900 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div>
            <h2 className="text-white font-bold text-lg">Editar venta</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Nuevo total:{' '}
              <span className="text-emerald-400 font-bold">${newTotal.toFixed(2)}</span>
              {Math.abs(newTotal - parseFloat(sale.total)) > 0.01 && (
                <span className="text-slate-500 text-xs ml-2">
                  (antes ${parseFloat(sale.total).toFixed(2)})
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-100 flex-shrink-0 px-6 pt-3 bg-white">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2.5 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                tab === key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">

          {/* ── Tab: Products ── */}
          {tab === 'products' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Artículos</p>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Agregar producto
                </button>
              </div>

              {items.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">
                  Sin productos. Presioná "Agregar producto".
                </p>
              )}

              {items.map((item) => (
                <div key={item._key} className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <ProductCombobox
                      value={item.product_id}
                      products={products}
                      onChange={(productId, price) => handleProductSelect(item._key, productId, price)}
                    />
                    <button
                      onClick={() => removeItem(item._key)}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateItem(item._key, 'qty', Math.max(1, item.qty - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 flex items-center justify-center transition-colors"
                      >−</button>
                      <span className="w-8 text-center font-semibold text-slate-800">{item.qty}</span>
                      <button
                        onClick={() => updateItem(item._key, 'qty', item.qty + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 flex items-center justify-center transition-colors"
                      >+</button>
                    </div>
                    <span className="text-slate-400">×</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item._key, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                    />
                    <span className="ml-auto font-semibold text-slate-800">
                      ${calcSubtotal(item).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {items.length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-sm font-semibold text-slate-600">Total</span>
                  <span className="text-lg font-bold text-slate-800">${newTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Payment ── */}
          {tab === 'payment' && (
            <div className="space-y-4">
              <div className="flex gap-2">
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
                <div className="flex flex-col gap-2.5">
                  {PAYMENT_METHODS.map(({ value, label, Icon }) => (
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
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(({ value, label, Icon }) => (
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
                    Math.abs(breakdownSum() - newTotal) < 0.02 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    Ingresado: <strong>${breakdownSum().toFixed(2)}</strong> / Total: <strong>${newTotal.toFixed(2)}</strong>
                    {Math.abs(breakdownSum() - newTotal) >= 0.02 && ' — no coinciden'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-6 py-4 flex gap-3 flex-shrink-0 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 bg-white text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || items.length === 0}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
