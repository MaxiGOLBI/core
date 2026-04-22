import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Combobox buscable para selección de producto en el carrito
function ProductCombobox({ value, products, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = products.find((p) => p.id === value);
  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  function select(p) {
    onChange(p.id, p.price);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="flex-1 relative">
      <input
        type="text"
        value={open ? query : (selected ? `${selected.name} - $${Number(selected.price).toFixed(2)}` : '')}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscá un producto..."
        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">Sin resultados</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => select(p)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {p.name} <span className="text-slate-400">${Number(p.price).toFixed(2)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Combobox buscable para selección de cliente
function ClientCombobox({ value, clients, discounts, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  // value puede ser 'client:UUID' o 'discount:UUID' o ''
  const selectedClient   = clients.find((c) => value === `client:${c.id}`);
  const selectedDiscount = discounts.find((d) => value === `discount:${d.id}`);
  const displayName = selectedClient?.name ?? selectedDiscount?.name ?? '';

  const filteredClients   = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients;
  const filteredDiscounts = query.trim()
    ? discounts.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
    : discounts;

  function formatRule(type, value) {
    if (!value || value <= 0) return null;
    return type === 'percent' ? `${value}%` : `$${value}`;
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : displayName}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente o descuento..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          <button
            type="button"
            onMouseDown={() => { onChange('', null); setOpen(false); setQuery(''); }}
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 transition-colors"
          >
            Sin cliente / descuento
          </button>

          {filteredClients.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-t border-slate-100">Clientes</div>
              {filteredClients.map((c) => {
                const hint = formatRule(c.discount_rules?.type, c.discount_rules?.value);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => { onChange(`client:${c.id}`, c.discount_rules); setOpen(false); setQuery(''); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    {hint && <span className="text-xs text-slate-400 ml-2">{hint}</span>}
                  </button>
                );
              })}
            </>
          )}

          {filteredDiscounts.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-t border-slate-100">Descuentos</div>
              {filteredDiscounts.map((d) => {
                const hint = formatRule(d.rule_json?.type, d.rule_json?.value);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onMouseDown={() => { onChange(`discount:${d.id}`, d.rule_json); setOpen(false); setQuery(''); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-between"
                  >
                    <span>{d.name}</span>
                    {hint && <span className="text-xs text-slate-400 ml-2">{hint}</span>}
                  </button>
                );
              })}
            </>
          )}

          {filteredClients.length === 0 && filteredDiscounts.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400 italic">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  );
}

const GRID_SIZE = 8;
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutos (igual que el backend)

function isLockedByOther(ticket, myId) {
  if (!ticket?.locked_by || !ticket?.locked_at) return false;
  if (Date.now() - new Date(ticket.locked_at).getTime() > LOCK_TTL_MS) return false;
  return ticket.locked_by !== myId;
}

const TICKET_BG = {
  libre:     'bg-emerald-400 hover:bg-emerald-500',
  locked:    'bg-orange-400 hover:bg-orange-500',
};

const STATUS_LABELS = {
  open:      'Abierto',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export default function TablesBoard() {
  const { user, hasRole } = useAuth();

  const [tickets, setTickets]     = useState([]);
  const [products, setProducts]   = useState([]);
  const [clients, setClients]     = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Panel
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [panelTicket, setPanelTicket]       = useState(null);
  const [cartItems, setCartItems]           = useState([]);
  const [vendedorId, setVendedorId]         = useState('');
  const [clientId, setClientId]             = useState('');
  const [discount, setDiscount]             = useState({ value: '', type: 'fixed' });
  const [comment, setComment]               = useState('');
  const [saving, setSaving]                 = useState(false);
  const [panelError, setPanelError]         = useState('');

  // Price search
  const [priceQuery, setPriceQuery]     = useState('');
  const [priceResults, setPriceResults] = useState([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const debounceRef = useRef(null);

  async function loadAll() {
    try {
      const [tbl, prods, cls, disc, emps] = await Promise.all([
        api.get('/api/tables'),
        api.get('/api/stock'),
        api.get('/api/clients'),
        api.get('/api/discounts'),
        api.get('/api/users'),
      ]);
      setTickets(tbl);
      setProducts(prods);
      setClients(cls);
      setDiscounts(disc.filter((d) => d.active));
      setEmployees(emps.filter((e) => ['vendedor', 'encargado', 'dueno'].includes(e.role)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // Poll cada 15s para ver cambios de lock y estado de otros vendedores
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, []);

  // Liberar lock si el usuario cierra la tab
  useEffect(() => {
    function onUnload() {
      if (panelTicket?.id) {
        navigator.sendBeacon(`/api/tables/${panelTicket.id}/unlock`, JSON.stringify({}));
      }
    }
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [panelTicket]);

  async function openTicket(number) {
    const existing = tickets.find((t) => String(t.table_number) === String(number) && t.status === 'open');

    // Si el ticket existe y está bloqueado por otro, mostrar error
    if (existing && existing.status === 'open' && isLockedByOther(existing, user?.id)) {
      const lockerName = employees.find((e) => e.id === existing.locked_by)?.name ?? 'otro vendedor';
      setPanelError(`Bloqueado por ${lockerName}. Intentá de nuevo en unos minutos.`);
      setSelectedNumber(number);
      setPanelTicket(existing);
      return;
    }

    setSelectedNumber(number);
    setPanelTicket(existing || null);
    setPanelError('');

    if (existing) {
      setCartItems(
        (existing.table_items || []).map((item) => ({
          product_id:     item.product_id,
          qty:            item.qty,
          unit_price:     item.unit_price,
          discount_value: item.discount_value || 0,
          discount_type:  item.discount_type  || 'fixed',
          comment:        item.comment        || '',
        }))
      );
      setClientId(
        existing.client_id   ? `client:${existing.client_id}` :
        existing.discount_id ? `discount:${existing.discount_id}` : ''
      );
      setVendedorId(existing.seller_id || (hasRole('vendedor') ? user?.id : '') || '');
      setComment(existing.comment || '');
      setDiscount({ value: String(existing.discount_value || ''), type: existing.discount_type || 'fixed' });

      // Adquirir lock si el ticket está abierto
      if (existing.status === 'open') {
        try { await api.post(`/api/tables/${existing.id}/lock`, {}); } catch { /* ignorar */ }
      }
    } else {
      setCartItems([]);
      setClientId('');
      setVendedorId(hasRole('vendedor') ? user?.id || '' : '');
      setComment('');
      setDiscount({ value: '', type: 'fixed' });
    }
  }

  async function closePanel() {
    // Liberar lock si lo tenemos
    if (panelTicket?.id && panelTicket.status === 'open') {
      try { await api.post(`/api/tables/${panelTicket.id}/unlock`, {}); } catch { /* ignorar */ }
    }
    setSelectedNumber(null);
    setPanelTicket(null);
    setPriceQuery('');
    setPriceResults([]);
  }

  function addProductToCart(product) {
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.product_id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prev, { product_id: product.id, qty: 1, unit_price: product.price, discount_value: 0, discount_type: 'fixed', comment: '' }];
    });
    setPriceQuery('');
    setPriceResults([]);
  }

  function updateCartItem(index, field, value) {
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeCartItem(index) {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Extrae el UUID de cliente del compositeId ('client:UUID' → UUID, otros → null)
  function resolveClientId(compositeId) {
    if (!compositeId) return null;
    if (compositeId.startsWith('client:')) return compositeId.slice(7);
    return null; // es un descuento del catálogo, no hay client_id
  }

  // Resuelve el nombre visible del cliente o descuento de catálogo seleccionado
  function resolveDisplayName(compositeId) {
    if (!compositeId) return null;
    if (compositeId.startsWith('client:')) {
      const id = compositeId.slice(7);
      return clients.find((c) => c.id === id)?.name ?? null;
    }
    if (compositeId.startsWith('discount:')) {
      const id = compositeId.slice(9);
      return discounts.find((d) => d.id === id)?.name ?? null;
    }
    return null;
  }

  async function handleSave() {
    if (!vendedorId) { setPanelError('Selecciona un vendedor.'); return; }
    setSaving(true);
    setPanelError('');
    try {
      const payload = {
        items:          cartItems,
        client_id:      resolveClientId(clientId),
        seller_id:      vendedorId,
        comment,
        discount_value: parseFloat(discount.value) || 0,
        discount_type:  discount.type,
        discount_id:    clientId.startsWith('discount:') ? clientId.slice(9) : null,
        discount_name:  resolveDisplayName(clientId),
      };
      if (panelTicket) {
        await api.put(`/api/tables/${panelTicket.id}`, payload);
      } else {
        // Crear ticket nuevo
        const created = await api.post('/api/tables', { table_number: String(selectedNumber), ...payload });
        // Adquirir lock en el ticket recién creado
        try { await api.post(`/api/tables/${created.id}/lock`, {}); } catch { /* ignorar */ }
      }
      const fresh = await api.get('/api/tables');
      setTickets(fresh);
      const updated = fresh.find((t) => String(t.table_number) === String(selectedNumber) && t.status === 'open');
      setPanelTicket(updated || null);
    } catch (err) {
      setPanelError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!panelTicket) return;
    if (!vendedorId) { setPanelError('Selecciona un vendedor antes de confirmar.'); return; }
    if (cartItems.length === 0) { setPanelError('Agregá al menos un producto antes de confirmar.'); return; }
    setSaving(true);
    setPanelError('');
    try {
      // Guardar items/datos actuales antes de confirmar
      await api.put(`/api/tables/${panelTicket.id}`, {
        items:          cartItems,
        client_id:      resolveClientId(clientId),
        seller_id:      vendedorId,
        comment,
        discount_value: parseFloat(discount.value) || 0,
        discount_type:  discount.type,
        discount_id:    clientId.startsWith('discount:') ? clientId.slice(9) : null,
        discount_name:  resolveDisplayName(clientId),
      });
      // Ahora confirmar
      await api.post(`/api/tables/${panelTicket.id}/confirm`, {});
      await loadAll();
      setSelectedNumber(null);
      setPanelTicket(null);
      setPriceQuery('');
      setPriceResults([]);
    } catch (err) {
      setPanelError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!panelTicket) return;
    if (!confirm('Eliminar este ticket?')) return;
    try {
      // Liberar lock antes de eliminar
      try { await api.post(`/api/tables/${panelTicket.id}/unlock`, {}); } catch { /* ignorar */ }
      await api.delete(`/api/tables/${panelTicket.id}`);
      await loadAll();
      setSelectedNumber(null);
      setPanelTicket(null);
      setPriceQuery('');
      setPriceResults([]);
    } catch (err) { setPanelError(err.message); }
  }

  function handlePriceSearch(e) {
    const val = e.target.value;
    setPriceQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setPriceResults([]); return; }
    setPriceLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/api/stock?search=${encodeURIComponent(val)}`);
        setPriceResults(data);
      } catch { setPriceResults([]); }
      finally { setPriceLoading(false); }
    }, 300);
  }

  const maxNumber   = Math.max(GRID_SIZE, ...tickets.map((t) => parseInt(t.table_number) || 0));
  const gridNumbers = Array.from({ length: maxNumber }, (_, i) => i + 1);

  const cartTotal = cartItems.reduce((sum, item) => {
    const base = item.qty * item.unit_price;
    const disc = item.discount_type === 'percent' ? base * (item.discount_value / 100) : (item.discount_value || 0);
    return sum + base - disc;
  }, 0);
  const discAmt    = discount.type === 'percent' ? cartTotal * ((parseFloat(discount.value) || 0) / 100) : (parseFloat(discount.value) || 0);
  const finalTotal = Math.max(0, cartTotal - discAmt);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Cargando tickets...</div>;
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 73px)' }}>

      {/* LEFT: grid + buscador */}
      <div className="w-96 flex-shrink-0 bg-slate-100 border-r border-slate-200 flex flex-col overflow-hidden">

        {/* Buscador de precios */}
        <div className="p-3 bg-white border-b border-slate-200 relative">
          <input
            type="text"
            placeholder="Buscar precios y stock..."
            value={priceQuery}
            onChange={handlePriceSearch}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {priceQuery && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto">
              {priceLoading && <p className="text-xs text-slate-400 px-3 py-2">Buscando...</p>}
              {!priceLoading && priceResults.length === 0 && (
                <p className="text-xs text-slate-400 px-3 py-2">Sin resultados.</p>
              )}
              {priceResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => selectedNumber && addProductToCart(p)}
                  className={`flex items-center justify-between px-3 py-2 border-b border-slate-50 last:border-0 ${selectedNumber ? 'hover:bg-indigo-50 cursor-pointer' : ''}`}
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900">{p.name}</span>
                    <span className="ml-2 text-xs text-slate-400">stock: {p.stock}</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">${Number(p.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grid de tickets */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2.5">
            {gridNumbers.map((num) => {
              const ticket     = tickets.find((t) => String(t.table_number) === String(num) && t.status === 'open');
              const isLockedOther = ticket && isLockedByOther(ticket, user?.id);
              const status     = ticket ? (isLockedOther ? 'locked' : ticket.status) : 'libre';
              const isSelected = selectedNumber === num;
              const itemCount  = ticket?.table_items?.length || 0;
              const bg         = TICKET_BG[status] ?? TICKET_BG.libre;
              const lockerName = isLockedOther ? (employees.find((e) => e.id === ticket.locked_by)?.name ?? '?') : null;
              return (
                <button
                  key={num}
                  onClick={() => openTicket(num)}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center font-bold text-3xl text-white transition-all shadow-sm ${bg} ${isSelected ? 'ring-4 ring-offset-2 ring-indigo-500 scale-95' : ''}`}
                >
                  {num}
                  {itemCount > 0 && (
                    <span className="absolute top-2 right-2 bg-black/20 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                      {itemCount}
                    </span>
                  )}
                  {isLockedOther && (
                    <span className="absolute top-2 left-2 text-base leading-none" title={`En uso por ${lockerName}`}>🔒</span>
                  )}
                  {status !== 'libre' && (
                    <span className="text-xs font-medium opacity-90 mt-1">
                      {isLockedOther ? lockerName : STATUS_LABELS[ticket?.status]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="p-3 border-t border-slate-200 bg-white flex flex-wrap gap-x-3 gap-y-1">
          {[
            { label: 'Libre',      color: 'bg-emerald-400' },
            { label: 'En uso',     color: 'bg-orange-400' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: panel de ticket */}
      {selectedNumber ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={closePanel} className="text-slate-300 hover:text-white text-xl leading-none">
                &larr;
              </button>
              <h2 className="text-xl font-bold">TICKET #{selectedNumber}</h2>
              {panelTicket && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 font-semibold">
                  {STATUS_LABELS[panelTicket.status]}
                </span>
              )}
            </div>
            {panelTicket && hasRole('vendedor', 'encargado', 'dueno') && (
              <button
                onClick={handleDelete}
                className="text-sm text-red-300 hover:text-red-100 border border-red-400/30 px-3 py-1 rounded-lg"
              >
                Eliminar ticket
              </button>
            )}
          </div>

          {/* Body scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {panelError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-700 text-sm">{panelError}</p>
              </div>
            )}

            {panelTicket && (panelTicket.status === 'cancelled' || panelTicket.status === 'completed') ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="text-6xl">
                  {panelTicket.status === 'cancelled' ? '🚫' : '✅'}
                </div>
                <p className="font-semibold text-slate-700 text-lg">
                  Ticket {panelTicket.status === 'cancelled' ? 'cancelado' : 'completado'}
                </p>
                <p className="text-slate-400 text-sm text-center max-w-xs">
                  Este número está libre para usarse de nuevo. Eliminá el registro para dejarlo disponible.
                </p>
                {hasRole('vendedor', 'encargado', 'dueno') && (
                  <button
                    onClick={handleDelete}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Liberar ticket #{selectedNumber}
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Carrito */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">Productos</h3>
                    <button
                      onClick={() => setCartItems((prev) => [...prev, { product_id: '', qty: 1, unit_price: 0, discount_value: 0, discount_type: 'fixed' }])}
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium"
                    >
                      + Agregar
                    </button>
                  </div>

                  {cartItems.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-6">
                      Sin productos. Busca arriba o usa Agregar.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cartItems.map((item, i) => {
                        const lineTotal = item.qty * item.unit_price;
                        return (
                          <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <ProductCombobox
                                value={item.product_id}
                                products={products}
                                onChange={(id, price) => {
                                  updateCartItem(i, 'product_id', id);
                                  updateCartItem(i, 'unit_price', price);
                                }}
                              />
                              <button onClick={() => removeCartItem(i)} className="text-slate-300 hover:text-red-500 text-xl leading-none w-6 text-center">x</button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateCartItem(i, 'qty', Math.max(1, item.qty - 1))} className="w-7 h-7 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-sm">-</button>
                              <input
                                type="number" min="1" value={item.qty}
                                onChange={(e) => updateCartItem(i, 'qty', parseInt(e.target.value) || 1)}
                                className="w-12 text-center border border-slate-300 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <button onClick={() => updateCartItem(i, 'qty', item.qty + 1)} className="w-7 h-7 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-sm">+</button>
                              <input
                                type="number" min="0" step="0.01" value={item.unit_price}
                                onChange={(e) => updateCartItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <span className="ml-auto font-semibold text-slate-900 text-sm">${lineTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Descuento:</span>
                              <input
                                type="number" min="0" value={item.discount_value}
                                onChange={(e) => updateCartItem(i, 'discount_value', parseFloat(e.target.value) || 0)}
                                className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <select
                                value={item.discount_type}
                                onChange={(e) => updateCartItem(i, 'discount_type', e.target.value)}
                                className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
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

                {/* Vendedor + Cliente */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendedor *</label>
                    <select
                      value={vendedorId}
                      onChange={(e) => setVendedorId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Seleccionar...</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente / Descuento</label>
                    <ClientCombobox
                      value={clientId}
                      clients={clients}
                      discounts={discounts}
                      onChange={(compositeId, rules) => {
                        setClientId(compositeId);
                        if (rules && rules.type && rules.value) {
                          setDiscount({ type: rules.type, value: String(rules.value) });
                        } else if (!compositeId) {
                          setDiscount({ value: '', type: 'fixed' });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Descuento general */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Descuento general</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" value={discount.value}
                      onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))}
                      placeholder="0"
                      className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={discount.type}
                      onChange={(e) => setDiscount((d) => ({ ...d, type: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="fixed">$ fijo</option>
                      <option value="percent">% porcentaje</option>
                    </select>
                    {discAmt > 0 && (
                      <span className="text-sm text-red-500 font-medium">-${discAmt.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                {/* Comentario */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Comentario</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    placeholder="Observaciones del ticket..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer — solo para tickets editables */}
          {(!panelTicket || (panelTicket.status !== 'cancelled' && panelTicket.status !== 'completed')) && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-medium">Total</span>
                <span className="text-2xl font-bold text-slate-900">${finalTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Guardando...' : panelTicket ? 'Guardar cambios' : 'Abrir ticket'}
                </button>
                {panelTicket && panelTicket.status === 'open' && hasRole('vendedor', 'encargado', 'dueno') && (
                  <button
                    onClick={handleConfirm}
                    disabled={saving}
                    className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Confirmando...' : 'Confirmar'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <p className="text-4xl mb-3">🎫</p>
            <p className="text-slate-500 font-medium">Selecciona un ticket</p>
            <p className="text-slate-400 text-sm mt-1">Haz clic en un numero del panel izquierdo</p>
          </div>
        </div>
      )}
    </div>
  );
}
