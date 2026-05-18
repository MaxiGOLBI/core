import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabaseClient';

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

const EMPTY_SERVICE = {
  client_name: '', client_phone: '', device_description: '',
  service_description: '', total_amount: '', deposit_amount: '',
  arrival_date: new Date().toISOString().slice(0, 10),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  );
}

function calcTableTotal(table) {
  const items = table.table_items ?? [];
  const cartTotal = items.reduce((sum, item) => {
    const base = item.qty * item.unit_price;
    const disc = item.discount_type === 'percent'
      ? base * ((item.discount_value ?? 0) / 100)
      : (item.discount_value ?? 0);
    return sum + base - disc;
  }, 0);
  const discAmt = table.discount_type === 'percent'
    ? cartTotal * ((table.discount_value ?? 0) / 100)
    : (table.discount_value ?? 0);
  const deposit = table.service_data
    ? (parseFloat(table.service_data.deposit_amount) || 0) : 0;
  return Math.max(0, cartTotal - discAmt) + deposit;
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

// ── ProductCombobox ───────────────────────────────────────────────────────────

function ProductCombobox({ value, displayName, products, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const found = products.find((p) => p.id === value);
  const shown = open ? query : (found ? `${found.name} - $${Number(found.price).toFixed(2)}` : displayName ?? '');
  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  return (
    <div className="flex-1 relative">
      <input
        type="text"
        value={shown}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscá un producto..."
        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button key={p.id} type="button"
              onMouseDown={() => { onChange(p.id, p.price, p.name); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex justify-between">
              <span>{p.name}</span>
              <span className="text-slate-400">${Number(p.price).toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ClientSearchCombobox ──────────────────────────────────────────────────────

function ClientSearchCombobox({ value, clients, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const selected = clients.find((c) => `client:${c.id}` === value);
  const filtered = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients;

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </span>
      <input
        type="text"
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente..."
        className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {value && (
            <button type="button" onMouseDown={() => { onChange(null); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 italic">— Sin cliente</button>
          )}
          {filtered.length === 0
            ? <p className="px-3 py-2 text-xs text-slate-400">Sin resultados</p>
            : filtered.map((c) => (
              <button key={c.id} type="button"
                onMouseDown={() => {
                  onChange(
                    `client:${c.id}`,
                    c.discount_type && c.discount_value ? { type: c.discount_type, value: c.discount_value } : null
                  );
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700">
                {c.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ── SaleForm (create + edit open sales) ───────────────────────────────────────

function SaleForm({ initialTable, onConfirmed, onCancel, onSaved }) {
  const { user } = useAuth();

  // Remote lookup data
  const [searchProducts, setSearchProducts] = useState([]);
  const [productQuery,   setProductQuery]   = useState('');
  const [clients,        setClients]        = useState([]);
  const [discounts,      setDiscounts]      = useState([]);

  // Cart — items include a `displayName` for pre-filled products
  const [cartItems, setCartItems] = useState(() => {
    if (!initialTable?.table_items) return [];
    return initialTable.table_items.map((it) => ({
      product_id:     it.product_id ?? '',
      displayName:    it.products?.name ?? '',
      qty:            it.qty,
      unit_price:     it.unit_price,
      discount_value: it.discount_value ?? 0,
      discount_type:  it.discount_type  ?? 'fixed',
    }));
  });

  // Sale metadata
  const [clientId,     setClientId]     = useState(initialTable?.client_id ? `client:${initialTable.client_id}` : '');
  const [discountCode, setDiscountCode] = useState(initialTable?.discount_id ? `discount:${initialTable.discount_id}` : '');
  const [discount,     setDiscount]     = useState({
    value: initialTable?.discount_value ?? '',
    type:  initialTable?.discount_type  ?? 'fixed',
  });
  const [comment,     setComment]     = useState(initialTable?.comment ?? '');
  const [isService,   setIsService]   = useState(!!initialTable?.service_data);
  const [serviceData, setServiceData] = useState(initialTable?.service_data ?? EMPTY_SERVICE);

  // Persistence state
  const [saleId,     setSaleId]     = useState(initialTable?.id ?? null);
  const [saleNumber, setSaleNumber] = useState(initialTable?.table_number ?? null);
  const [saving,     setSaving]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    api.get('/api/clients').then((d)  => setClients(d ?? [])).catch(() => {});
    api.get('/api/discounts').then((d) => setDiscounts(d ?? [])).catch(() => {});
  }, []);

  // Debounced product search
  useEffect(() => {
    if (!productQuery.trim()) { setSearchProducts([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/stock?search=${encodeURIComponent(productQuery)}`)
        .then((d) => setSearchProducts(d ?? [])).catch(() => {});
    }, 280);
    return () => clearTimeout(t);
  }, [productQuery]);

  function sfld(field) {
    return (e) => setServiceData((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function addCartRow() {
    setCartItems((prev) => [...prev, { product_id: '', displayName: '', qty: 1, unit_price: 0, discount_value: 0, discount_type: 'fixed' }]);
  }
  function updateCartItem(i, field, val) {
    setCartItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function removeCartItem(i) {
    setCartItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Totals
  const cartTotal = cartItems.reduce((sum, item) => {
    const base = item.qty * item.unit_price;
    const disc = item.discount_type === 'percent'
      ? base * ((item.discount_value || 0) / 100)
      : (item.discount_value || 0);
    return sum + base - disc;
  }, 0);
  const discAmt = (() => {
    const v = parseFloat(discount.value) || 0;
    return discount.type === 'percent' ? cartTotal * (v / 100) : v;
  })();
  const serviceDeposit = isService ? (parseFloat(serviceData.deposit_amount) || 0) : 0;
  const finalTotal = Math.max(0, cartTotal - discAmt) + serviceDeposit;

  const realClientId = clientId.startsWith('client:') ? clientId.slice(7) : null;

  function handleDiscountCode(e) {
    const val = e.target.value;
    setDiscountCode(val);
    if (!val) { setDiscount({ value: '', type: 'fixed' }); return; }
    const d = discounts.find((d) => `discount:${d.id}` === val);
    if (d?.rule_json?.type && d?.rule_json?.value)
      setDiscount({ type: d.rule_json.type, value: String(d.rule_json.value) });
  }

  async function persist() {
    let num = saleNumber;
    if (!saleId) {
      const existing = await api.get('/api/tables');
      num = (existing.reduce((m, t) => Math.max(m, parseInt(t.table_number) || 0), 0)) + 1;
    }
    const payload = {
      table_number:   num,
      seller_id:      user.id,
      items:          cartItems.filter((i) => i.product_id),
      client_id:      realClientId,
      comment,
      discount_value: parseFloat(discount.value) || 0,
      discount_type:  discount.type,
      discount_id:    discountCode ? discountCode.replace('discount:', '') : null,
      discount_name:  discountCode ? (discounts.find((d) => `discount:${d.id}` === discountCode)?.name ?? null) : null,
      service_data:   isService ? serviceData : null,
    };
    let result;
    if (saleId) {
      result = await api.put(`/api/tables/${saleId}`, payload);
    } else {
      result = await api.post('/api/tables', payload);
      setSaleId(result.id);
      setSaleNumber(num);
    }
    return result;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await persist();
      showToast('Venta guardada', 'success');
      onSaved?.(result);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      let id = saleId;
      if (!id) {
        const saved = await persist();
        if (!saved) throw new Error('No se pudo guardar');
        id = saved.id;
      }
      await api.post(`/api/tables/${id}/confirm`, {});
      showToast('Venta confirmada y enviada a caja', 'success');
      onConfirmed?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConfirming(false);
    }
  }

  async function handleDelete() {
    try {
      if (saleId) await api.delete(`/api/tables/${saleId}`);
      showToast('Venta eliminada', 'success');
      onCancel?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConfirmDeleteOpen(false);
    }
  }

  const headerTitle = saleNumber ? `VENTA #${saleNumber}` : 'NUEVA VENTA';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-blue-700 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-slate-300 hover:text-white text-xl leading-none">&larr;</button>
          <h2 className="text-xl font-bold">{headerTitle}</h2>
          {saleId && <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 font-semibold">Abierto</span>}
        </div>
        {saleId && (
          <button onClick={() => setConfirmDeleteOpen(true)}
            className="text-sm text-red-300 hover:text-red-100 border border-red-400/30 px-3 py-1 rounded-lg">
            Eliminar venta
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

        {/* Carrito */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Productos</h3>
            <button onClick={addCartRow}
              className="text-xs bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-3 py-1.5 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-500 transition-all">
              + Agregar
            </button>
          </div>

          {/* Quick search to add product */}
          <div className="relative mb-3">
            <input type="text" value={productQuery} onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Buscar y agregar producto..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {searchProducts.length > 0 && productQuery.trim() && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchProducts.map((p) => (
                  <button key={p.id} type="button"
                    onMouseDown={() => {
                      setCartItems((prev) => [...prev, { product_id: p.id, displayName: p.name, qty: 1, unit_price: p.price, discount_value: 0, discount_type: 'fixed' }]);
                      setProductQuery('');
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-slate-400">${Number(p.price).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cartItems.length === 0
            ? <p className="text-sm text-slate-400 italic text-center py-4">Sin productos. Buscá arriba o usá Agregar.</p>
            : (
              <div className="space-y-2">
                {cartItems.map((item, i) => {
                  const lineTotal = item.qty * item.unit_price;
                  return (
                    <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <ProductCombobox
                          value={item.product_id}
                          displayName={item.displayName}
                          products={searchProducts}
                          onChange={(id, price, name) => {
                            updateCartItem(i, 'product_id', id);
                            updateCartItem(i, 'unit_price', price);
                            updateCartItem(i, 'displayName', name);
                          }}
                        />
                        <button onClick={() => removeCartItem(i)} className="text-slate-300 hover:text-red-500 text-xl w-6 text-center">×</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCartItem(i, 'qty', Math.max(1, item.qty - 1))} className="w-7 h-7 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-sm">-</button>
                        <input type="number" min="1" value={item.qty}
                          onChange={(e) => updateCartItem(i, 'qty', parseInt(e.target.value) || 1)}
                          className="w-12 text-center border border-slate-300 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => updateCartItem(i, 'qty', item.qty + 1)} className="w-7 h-7 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-sm">+</button>
                        <input type="number" min="0" step="0.01" value={item.unit_price}
                          onChange={(e) => updateCartItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="ml-auto font-semibold text-slate-900 text-sm">${lineTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Descuento:</span>
                        <input type="number" min="0" value={item.discount_value}
                          onChange={(e) => updateCartItem(i, 'discount_value', parseFloat(e.target.value) || 0)}
                          className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none" />
                        <select value={item.discount_type} onChange={(e) => updateCartItem(i, 'discount_type', e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none">
                          <option value="fixed">$</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {cartItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm text-slate-500">Subtotal productos</span>
              <span className="font-bold text-slate-900">${cartTotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Detalles */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">Detalles de la venta</span>
          </div>
          <div className="p-4 space-y-4">

            {/* Vendedor (read-only) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                Vendedor *
              </label>
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl pl-3 pr-4 py-2.5 bg-slate-50 text-sm text-slate-700 font-medium shadow-sm">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                {user?.name} (Tú)
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                Cliente
              </label>
              <ClientSearchCombobox value={clientId} clients={clients}
                onChange={(val, rules) => {
                  setClientId(val ?? '');
                  if (!val) setDiscount({ value: '', type: 'fixed' });
                  else if (rules?.type && rules?.value) setDiscount({ type: rules.type, value: String(rules.value) });
                }} />
            </div>

            {/* Código de descuento */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" /></svg>
                Código de descuento
              </label>
              <div className="relative">
                <select value={discountCode} onChange={handleDiscountCode}
                  className="w-full border border-slate-200 rounded-xl px-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm text-slate-800 font-medium">
                  <option value="">Sin código de descuento</option>
                  {discounts.map((d) => (
                    <option key={d.id} value={`discount:${d.id}`}>
                      {d.name}{d.rule_json?.value ? ` — ${d.rule_json.type === 'percent' ? `${d.rule_json.value}%` : `$${d.rule_json.value}`}` : ''}
                    </option>
                  ))}
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
            </div>

            {/* Descuento general */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" /></svg>
                Descuento general
              </label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={discount.value} placeholder="0"
                  onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))}
                  className="w-32 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                <div className="relative">
                  <select value={discount.type} onChange={(e) => setDiscount((d) => ({ ...d, type: e.target.value }))}
                    className="border border-slate-200 rounded-xl px-3 pr-8 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white">
                    <option value="fixed">$ fijo</option>
                    <option value="percent">% porcentaje</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
                {discAmt > 0 && <span className="text-sm text-red-500 font-semibold">−${discAmt.toFixed(2)}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Comentario */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Comentario</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
            placeholder="Observaciones de la venta..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {/* Servicio técnico */}
        <div className={`border rounded-xl overflow-hidden ${isService ? 'border-violet-400 shadow-sm' : 'border-slate-200'}`}>
          <button type="button" onClick={() => setIsService((v) => !v)}
            className={`w-full px-4 py-3 flex items-center justify-between text-sm font-semibold transition-colors ${isService ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
              Servicio técnico
            </span>
            <span className={`w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 ${isService ? 'border-white bg-white' : 'border-violet-400 bg-white'}`}>
              {isService && <span className="text-violet-700 text-[10px] font-black leading-none">✓</span>}
            </span>
          </button>
          {isService && (
            <div className="p-4 space-y-3 bg-violet-50/40">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del cliente *</label>
                  <input value={serviceData.client_name} onChange={sfld('client_name')} placeholder="Ej: Juan Pérez"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                  <input value={serviceData.client_phone} onChange={sfld('client_phone')} type="tel"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de llegada</label>
                  <input type="date" value={serviceData.arrival_date} onChange={sfld('arrival_date')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Equipo / Descripción *</label>
                  <input value={serviceData.device_description} onChange={sfld('device_description')} placeholder="Ej: iPhone 14 Pro - pantalla rota"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Trabajo a realizar</label>
                  <input value={serviceData.service_description} onChange={sfld('service_description')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Precio total</label>
                  <input type="number" min="0" step="0.01" value={serviceData.total_amount} onChange={sfld('total_amount')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Seña (pagó hoy)</label>
                  <input type="number" min="0" step="0.01" value={serviceData.deposit_amount} onChange={sfld('deposit_amount')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                {parseFloat(serviceData.total_amount) > 0 && (
                  <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex justify-between">
                    <span className="text-xs text-amber-700 font-medium">Saldo al retirar</span>
                    <span className="text-sm font-bold text-amber-700">
                      ${Math.max(0, (parseFloat(serviceData.total_amount) || 0) - (parseFloat(serviceData.deposit_amount) || 0)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
        {isService && serviceDeposit > 0 && (
          <div className="mb-2 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500"><span>Productos</span><span>${Math.max(0, cartTotal - discAmt).toFixed(2)}</span></div>
            <div className="flex justify-between text-violet-600 font-medium"><span>Seña servicio técnico</span><span>+${serviceDeposit.toFixed(2)}</span></div>
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-600 font-medium">Total a cobrar</span>
          <span className="text-2xl font-bold text-slate-900">${finalTotal.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || confirming}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-sm">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button onClick={handleConfirm} disabled={saving || confirming}
            className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors">
            {confirming ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>

      {/* Delete dialog */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">¿Eliminar esta venta?</h3>
              <p className="text-sm text-slate-500 mt-0.5">Esta acción no se puede deshacer.</p>
            </div>
            <div className="px-6 py-4 flex gap-3">
              <button onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Read-only detail panel (confirmed / cancelled / completed) ─────────────────

function SaleReadOnly({ item }) {
  // item.source = 'table' | 'sale'
  const isCancelled = item.status === 'cancelled';
  const meta = STATUS_META[item.status] ?? STATUS_META.completed;

  // Table source: products from table_items
  const tableItems = item.source === 'table' ? (item.raw.table_items ?? []) : [];
  // Sale source: products from details_json
  const saleItems  = item.source === 'sale'  ? (item.raw.details_json ?? []) : [];
  const commission = item.source === 'sale' ? getCommissionTotal(item.raw.details_json) : null;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-blue-900 px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-bold text-lg">
            {item.source === 'table' ? `Venta #${item.raw.table_number}` : 'Venta'}
          </h2>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
        </div>
        <p className="text-slate-300 text-sm mt-1">
          {new Date(item.date).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {' · '}
          {new Date(item.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-0.5">Cliente</p>
            <p className="font-semibold text-slate-800">
              {item.source === 'table' ? (item.raw.client?.name ?? '—') : (item.raw.clients?.name ?? '—')}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl px-4 py-3">
            <p className="text-xs text-emerald-600 mb-0.5">Total</p>
            <p className="font-bold text-emerald-700 text-lg">${item.total.toFixed(2)}</p>
          </div>
          {item.source === 'sale' && item.raw.payment_method && (
            <div className="col-span-2 bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-1">Método de pago</p>
              <p className="font-semibold text-slate-800 text-sm">
                {PAYMENT_LABELS[item.raw.payment_method] ?? item.raw.payment_method}
              </p>
            </div>
          )}
        </div>

        {commission !== null && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700 font-medium">Tu comisión: ${commission.toFixed(2)}</p>
          </div>
        )}

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
                {item.source === 'table' ? (
                  tableItems.length === 0
                    ? <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400 text-xs">Sin productos</td></tr>
                    : tableItems.map((it, idx) => {
                      const base = it.qty * it.unit_price;
                      const disc = it.discount_type === 'percent' ? base * ((it.discount_value ?? 0) / 100) : (it.discount_value ?? 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-medium text-slate-700">{it.products?.name ?? it.product_id}</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">{it.qty}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">${parseFloat(it.unit_price).toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800">${(base - disc).toFixed(2)}</td>
                        </tr>
                      );
                    })
                ) : (
                  saleItems.length === 0
                    ? <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400 text-xs">Sin productos</td></tr>
                    : saleItems.map((it, idx) => {
                      const base = it.qty * it.unit_price;
                      const disc = it.discount_type === 'percent' ? base * ((it.discount_value ?? 0) / 100) : (it.discount_value ?? 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-medium text-slate-700">{it.product_name ?? it.name ?? it.product_id}</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">{it.qty}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">${parseFloat(it.unit_price).toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800">${(base - disc).toFixed(2)}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function buildList(activeTables, completedSales) {
  const fromTables = activeTables
    .filter((t) => t.status !== 'completed')
    .map((t) => ({
      id:         t.id,
      source:     'table',
      status:     t.status,
      clientName: t.client?.name ?? null,
      total:      calcTableTotal(t),
      date:       t.updated_at ?? t.created_at,
      raw:        t,
    }));

  const fromSales = completedSales.map((s) => ({
    id:         s.id,
    source:     'sale',
    status:     s.status === 'cancelled' ? 'cancelled' : 'completed',
    clientName: s.clients?.name ?? null,
    total:      parseFloat(s.total) || 0,
    date:       s.date,
    raw:        s,
  }));

  return [...fromTables, ...fromSales].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function VendorSalesPage() {
  const [activeTables,    setActiveTables]    = useState([]);
  const [completedSales,  setCompletedSales]  = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState('');
  const [selectedItem,    setSelectedItem]    = useState(null); // unified item from buildList
  const [mode,            setMode]            = useState('idle'); // 'idle' | 'new' | 'edit' | 'view'
  const formKey = useRef(0); // force remount of SaleForm when opening a new/different sale

  async function loadAll() {
    try {
      const [tables, sales] = await Promise.all([
        api.get('/api/tables'),
        api.get('/api/sales'),
      ]);
      setActiveTables(tables ?? []);
      setCompletedSales(sales ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadAll();
    // Real-time: update when cashier confirms/cancels a sale
    const ch = supabase
      .channel('vendor_sales_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables_queue' }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const allItems = buildList(activeTables, completedSales);

  const filtered = allItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.clientName?.toLowerCase().includes(q) ||
      (item.source === 'sale'
        ? (item.raw.details_json ?? []).some((i) => (i.product_name ?? i.name ?? '').toLowerCase().includes(q))
        : (item.raw.table_items ?? []).some((i) => (i.products?.name ?? '').toLowerCase().includes(q)))
    );
  });

  function openNew() {
    formKey.current += 1;
    setSelectedItem(null);
    setMode('new');
  }

  function openItem(item) {
    setSelectedItem(item);
    if (item.status === 'open') {
      formKey.current += 1;
      setMode('edit');
    } else {
      setMode('view');
    }
  }

  function handleFormDone() {
    setMode('idle');
    setSelectedItem(null);
    loadAll();
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* ── Left panel: full-width on mobile, 300px sidebar on md+ ── */}
      <div className={`flex-shrink-0 border-r border-gray-200 flex flex-col bg-white
        ${mode === 'idle' ? 'flex w-full md:w-[300px]' : 'hidden md:flex md:w-[300px]'}`}>
        <div className="px-4 py-3 bg-blue-900 border-b border-blue-800">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-white text-base">Mis ventas</h2>
            <button onClick={openNew}
              className="flex items-center gap-1.5 bg-white text-blue-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva venta
            </button>
          </div>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente o producto..."
            className="mt-2 w-full text-sm bg-white/10 text-white placeholder-blue-200 border border-blue-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-2">
              <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {search ? 'Sin resultados' : 'No hay ventas aún'}
            </div>
          ) : filtered.map((item) => {
            const isSelected = selectedItem?.id === item.id && selectedItem?.source === item.source;
            const meta = STATUS_META[item.status] ?? STATUS_META.completed;
            return (
              <button key={`${item.source}-${item.id}`} onClick={() => openItem(item)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold truncate text-slate-800">
                    {item.clientName || 'Sin cliente'}
                  </span>
                  <span className="text-sm font-bold flex-shrink-0 text-emerald-600">
                    ${item.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: hidden on mobile when idle, full-width when active ── */}
      <div className={`overflow-hidden ${mode === 'idle' ? 'hidden md:flex md:flex-1' : 'flex flex-1'}`}>
        {(mode === 'new' || mode === 'edit') && (
          <SaleForm
            key={formKey.current}
            initialTable={mode === 'edit' ? selectedItem?.raw : null}
            onConfirmed={handleFormDone}
            onCancel={handleFormDone}
            onSaved={loadAll}
          />
        )}
        {mode === 'view' && selectedItem && (
          <SaleReadOnly item={selectedItem} />
        )}
        {mode === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <svg className="w-14 h-14 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium">Seleccioná una venta o creá una nueva</p>
          </div>
        )}
      </div>
    </div>
  );
}
