import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

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
        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between"
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
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between"
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

// Vendor dropdown — pins current user first for quick access
function VendorSelect({ value, onChange, employees, currentUserId }) {
  const sorted = [...employees].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.name.localeCompare(b.name);
  });
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </span>
      <select
        value={value}
        onChange={onChange}
        className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 appearance-none transition-all text-slate-800 font-medium shadow-sm"
      >
        <option value="">Seleccionar vendedor...</option>
        {sorted.map((e) => (
          <option key={e.id} value={e.id}>
            {e.id === currentUserId ? `${e.name} (Tú)` : e.name}
          </option>
        ))}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}

// Client-only searchable combobox
function ClientSearchCombobox({ value, onChange, clients }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = clients.find((c) => `client:${c.id}` === value);
  const filtered = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients;

  function formatHint(type, val) {
    if (!val || val <= 0) return null;
    return type === 'percent' ? `${val}%` : `$${val}`;
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9a6 6 0 01-6 6m0 0a6 6 0 01-6-6m6 6v2m0-14v2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 11-12 0 6 6 0 0112 0zM3.5 20.5l5-5" />
        </svg>
      </span>
      <input
        type="text"
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente..."
        className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-slate-800 font-medium shadow-sm placeholder-slate-400"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          <button
            type="button"
            onMouseDown={() => { onChange('', null); setOpen(false); setQuery(''); }}
            className="w-full text-left px-3.5 py-2.5 text-sm text-slate-400 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            Sin cliente
          </button>
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2.5 text-xs text-slate-400 italic">Sin resultados</p>
          ) : (
            filtered.map((c) => {
              const hint = formatHint(c.discount_rules?.type, c.discount_rules?.value);
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => { onChange(`client:${c.id}`, c.discount_rules); setOpen(false); setQuery(''); }}
                  className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">{c.name}</span>
                  {hint && <span className="text-xs text-slate-400 ml-2 font-normal">{hint} desc.</span>}
                </button>
              );
            })
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
  libre:     'bg-white hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md',
  open:      'bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-transparent shadow-sm',
  confirmed: 'bg-gradient-to-br from-amber-400 to-yellow-400 border-2 border-transparent shadow-sm',
  locked:    'bg-gradient-to-br from-orange-400 to-amber-400 border-2 border-transparent shadow-sm',
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
  const [confirmDelete, setConfirmDelete]   = useState(false);

  // Servicio técnico
  const EMPTY_SERVICE = { client_name: '', client_phone: '', device_description: '', service_description: '', total_amount: '', deposit_amount: '', arrival_date: new Date().toISOString().slice(0, 10) };
  const [isService, setIsService]       = useState(false);
  const [serviceData, setServiceData]   = useState(EMPTY_SERVICE);
  function sfld(field) { return (e) => setServiceData(p => ({ ...p, [field]: e.target.value })); }

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
      setProducts(prods.filter((p) => p.stock > 0));
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
    // ── Auto-guardar el ticket actual antes de cambiar ──
    let latestTickets = tickets;
    if (selectedNumber && selectedNumber !== number) {
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
        if (panelTicket?.status === 'open' && vendedorId) {
          await api.put(`/api/tables/${panelTicket.id}`, payload);
        } else if (!panelTicket && cartItems.length > 0 && vendedorId) {
          const created = await api.post('/api/tables', { table_number: String(selectedNumber), ...payload });
          try { await api.post(`/api/tables/${created.id}/lock`, {}); } catch { /* ignorar */ }
        }
        latestTickets = await api.get('/api/tables');
        setTickets(latestTickets);
      } catch { /* auto-save silencioso */ }
    }

    const existing = latestTickets.find((t) => String(t.table_number) === String(number) && t.status === 'open');

    // Si el ticket existe y está bloqueado por otro, mostrar error
    if (existing && existing.status === 'open' && isLockedByOther(existing, user?.id)) {
      const lockerName = employees.find((e) => e.id === existing.locked_by)?.name ?? 'otro vendedor';
      showToast(`Bloqueado por ${lockerName}. Intentá de nuevo en unos minutos.`, 'error');
      setSelectedNumber(number);
      setPanelTicket(existing);
      return;
    }

    setSelectedNumber(number);
    setPanelTicket(existing || null);

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
    setIsService(false);
    setServiceData(EMPTY_SERVICE);
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
    if (!vendedorId) { showToast('Seleccioná un vendedor.', 'error'); return; }
    if (cartItems.length === 0) { showToast('Agrugá al menos un producto antes de guardar.', 'error'); return; }
    const emptyItem = cartItems.find(i => !i.product_id);
    if (emptyItem) { showToast('Hay un producto sin seleccionar. Completá todos los campos.', 'error'); return; }
    setSaving(true);
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
        // Guardar datos del servicio técnico en el ticket para que caja lo procese
        service_data: isService && serviceData.client_name?.trim() && serviceData.device_description?.trim()
          ? {
              client_name:         serviceData.client_name.trim(),
              client_phone:        serviceData.client_phone?.trim() || null,
              device_description:  serviceData.device_description.trim(),
              service_description: serviceData.service_description?.trim() || null,
              total_amount:        parseFloat(serviceData.total_amount)   || 0,
              deposit_amount:      parseFloat(serviceData.deposit_amount) || 0,
              arrival_date:        serviceData.arrival_date || new Date().toISOString().slice(0, 10),
            }
          : null,
      };
      let savedTicketId = panelTicket?.id ?? null;
      if (panelTicket) {
        await api.put(`/api/tables/${panelTicket.id}`, payload);
      } else {
        // Crear ticket nuevo
        const created = await api.post('/api/tables', { table_number: String(selectedNumber), ...payload });
        savedTicketId = created.id;
        // Adquirir lock en el ticket recién creado
        try { await api.post(`/api/tables/${created.id}/lock`, {}); } catch { /* ignorar */ }
      }

      const fresh = await api.get('/api/tables');
      setTickets(fresh);
      const updated = fresh.find((t) => String(t.table_number) === String(selectedNumber) && t.status === 'open');
      setPanelTicket(updated || null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!panelTicket) return;
    if (!vendedorId) { showToast('Seleccioná un vendedor antes de confirmar.', 'error'); return; }
    if (cartItems.length === 0) { showToast('Agrugá al menos un producto antes de confirmar.', 'error'); return; }
    setSaving(true);
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
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!panelTicket) return;
    setConfirmDelete(true);
  }

  async function doDelete() {
    setConfirmDelete(false);
    try {
      // Liberar lock antes de eliminar
      try { await api.post(`/api/tables/${panelTicket.id}/unlock`, {}); } catch { /* ignorar */ }
      await api.delete(`/api/tables/${panelTicket.id}`);
      await loadAll();
      setSelectedNumber(null);
      setPanelTicket(null);
      setPriceQuery('');
      setPriceResults([]);
    } catch (err) { showToast(err.message, 'error'); }
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
  const discAmt      = discount.type === 'percent' ? cartTotal * ((parseFloat(discount.value) || 0) / 100) : (parseFloat(discount.value) || 0);
  const serviceDeposit = isService ? (parseFloat(serviceData.deposit_amount) || 0) : 0;
  const finalTotal   = Math.max(0, cartTotal - discAmt) + serviceDeposit;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Cargando ventas...</div>;
  }

  return (
    <>
    <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 73px)' }}>

      {/* LEFT: grid + buscador */}
      <div className={`md:w-96 md:flex-shrink-0 bg-slate-100 border-r border-slate-200 flex flex-col overflow-hidden ${selectedNumber ? 'hidden md:flex' : 'flex flex-1 md:flex-none'}`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-4 py-3">
          <span className="text-white font-bold text-base tracking-tight">Ventas</span>
        </div>

        {/* Buscador de precios */}
        <div className="p-3 bg-white border-b border-slate-200 relative">
          <input
            type="text"
            placeholder="Buscar precios y stock..."
            value={priceQuery}
            onChange={handlePriceSearch}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className={`flex items-center justify-between px-3 py-2 border-b border-slate-50 last:border-0 ${selectedNumber ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900">{p.name}</span>
                    <span className="ml-2 text-xs text-slate-400">stock: {p.stock}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">${Number(p.price).toFixed(2)}</span>
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
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${bg} ${isSelected ? 'ring-4 ring-offset-2 ring-blue-400 scale-95' : ''}`}
                >
                  <span className={`font-bold text-3xl ${status === 'libre' ? 'text-slate-700' : 'text-white'}`}>
                    {num}
                  </span>
                  {itemCount > 0 && (
                    <span className={`absolute top-2 right-2 text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold ${
                      status === 'libre' ? 'bg-blue-100 text-blue-700' : 'bg-black/20 text-white'
                    }`}>
                      {itemCount}
                    </span>
                  )}
                  {isLockedOther && (
                    <span className="absolute top-2 left-2 text-base leading-none" title={`En uso por ${lockerName}`}>🔒</span>
                  )}
                  {status !== 'libre' && (
                    <span className="text-xs font-medium text-white/90 mt-1">
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
            { label: 'Libre',      color: 'bg-slate-200 border border-slate-300' },
            { label: 'En uso',     color: 'bg-blue-500' },
            { label: 'Confirmado', color: 'bg-amber-400' },
            { label: 'Bloqueado',  color: 'bg-orange-400' },
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
          <div className="px-6 py-4 border-b border-blue-700 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={closePanel} className="text-slate-300 hover:text-white text-xl leading-none">
                &larr;
              </button>
              <h2 className="text-xl font-bold">VENTA #{selectedNumber}</h2>
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
                Eliminar venta
              </button>
            )}
          </div>

          {/* Body scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

            {panelTicket && (panelTicket.status === 'cancelled' || panelTicket.status === 'completed') ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="text-6xl">
                  {panelTicket.status === 'cancelled' ? '🚫' : '✅'}
                </div>
                <p className="font-semibold text-slate-700 text-lg">
                  Venta {panelTicket.status === 'cancelled' ? 'cancelada' : 'completada'}
                </p>
                <p className="text-slate-400 text-sm text-center max-w-xs">
                  Este número está libre para usarse de nuevo. Eliminá el registro para dejarlo disponible.
                </p>
                {hasRole('vendedor', 'encargado', 'dueno') && (
                  <button
                    onClick={handleDelete}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-sm"
                  >
                    Liberar venta #{selectedNumber}
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
                      className="text-xs bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-3 py-1.5 rounded-lg hover:from-blue-700 hover:to-cyan-500 font-medium transition-all"
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
                                className="w-12 text-center border border-slate-300 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button onClick={() => updateCartItem(i, 'qty', item.qty + 1)} className="w-7 h-7 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-sm">+</button>
                              <input
                                type="number" min="0" step="0.01" value={item.unit_price}
                                onChange={(e) => updateCartItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="ml-auto font-semibold text-slate-900 text-sm">${lineTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Descuento:</span>
                              <input
                                type="number" min="0" value={item.discount_value}
                                onChange={(e) => updateCartItem(i, 'discount_value', parseFloat(e.target.value) || 0)}
                                className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <select
                                value={item.discount_type}
                                onChange={(e) => updateCartItem(i, 'discount_type', e.target.value)}
                                className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                {/* Vendedor + Cliente + Descuento */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Section header */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200 px-4 py-3 flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-slate-700">Detalles de la venta</span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Vendedor */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                        Vendedor *
                      </label>
                      <VendorSelect
                        value={vendedorId}
                        onChange={(e) => setVendedorId(e.target.value)}
                        employees={employees}
                        currentUserId={user?.id}
                      />
                    </div>

                    {/* Cliente */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        Cliente
                      </label>
                      <ClientSearchCombobox
                        value={clientId}
                        clients={clients}
                        onChange={(val, rules) => {
                          setClientId(val);
                          if (!val) setDiscount({ value: '', type: 'fixed' });
                          else if (rules?.type && rules?.value) {
                            setDiscount({ type: rules.type, value: String(rules.value) });
                          }
                        }}
                      />
                    </div>

                    {/* Código de descuento */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                        </svg>
                        Código de descuento
                      </label>
                      <div className="relative">
                        <select
                          value={clientId.startsWith('discount:') ? clientId : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClientId(val);
                            if (!val) setDiscount({ value: '', type: 'fixed' });
                            else {
                              const d = discounts.find((d) => `discount:${d.id}` === val);
                              if (d?.rule_json?.type && d?.rule_json?.value) {
                                setDiscount({ type: d.rule_json.type, value: String(d.rule_json.value) });
                              }
                            }
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 appearance-none transition-all text-slate-800 font-medium shadow-sm"
                        >
                          <option value="">Sin código de descuento</option>
                          {discounts.map((d) => (
                            <option key={d.id} value={`discount:${d.id}`}>
                              {d.name}{d.rule_json?.value ? ` — ${d.rule_json.type === 'percent' ? `${d.rule_json.value}%` : `$${d.rule_json.value}`}` : ''}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {/* Descuento general */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                        </svg>
                        Descuento general
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" value={discount.value}
                          onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))}
                          placeholder="0"
                          className="w-32 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all shadow-sm"
                        />
                        <div className="relative">
                          <select
                            value={discount.type}
                            onChange={(e) => setDiscount((d) => ({ ...d, type: e.target.value }))}
                            className="border border-slate-200 rounded-xl px-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 appearance-none transition-all shadow-sm bg-white"
                          >
                            <option value="fixed">$ fijo</option>
                            <option value="percent">% porcentaje</option>
                          </select>
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </div>
                        {discAmt > 0 && (
                          <span className="text-sm text-red-500 font-semibold">−${discAmt.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comentario */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Comentario</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    placeholder="Observaciones de la venta..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Toggle servicio técnico */}
                <div className={`border rounded-xl overflow-hidden transition-colors ${isService ? 'border-violet-400 shadow-sm' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setIsService(v => !v)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-sm font-semibold transition-colors ${isService ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                      </svg>
                      Servicio técnico
                    </span>
                    <span className={`w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                      isService ? 'border-white bg-white' : 'border-violet-400 bg-white'
                    }`}>
                      {isService && <span className="text-violet-700 text-[10px] font-black leading-none">✓</span>}
                    </span>
                  </button>

                  {isService && (
                    <div className="p-4 space-y-3 bg-violet-50/40">
                      <p className="text-xs text-violet-600 font-medium">Completá los datos del cliente y el equipo. Se creará una orden de servicio técnico al guardar.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del cliente *</label>
                          <input value={serviceData.client_name} onChange={sfld('client_name')} placeholder="Ej: Juan Pérez"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                          <input value={serviceData.client_phone} onChange={sfld('client_phone')} placeholder="Ej: 11-1234-5678" type="tel"
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
                          <input value={serviceData.service_description} onChange={sfld('service_description')} placeholder="Ej: Cambio de pantalla + batería"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Precio total</label>
                          <input type="number" min="0" step="0.01" value={serviceData.total_amount} onChange={sfld('total_amount')} placeholder="0.00"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Seña (pagó hoy)</label>
                          <input type="number" min="0" step="0.01" value={serviceData.deposit_amount} onChange={sfld('deposit_amount')} placeholder="0 = no pagó"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        {parseFloat(serviceData.total_amount) > 0 && (
                          <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex justify-between">
                            <span className="text-xs text-amber-700 font-medium">Saldo al retirar</span>
                            <span className="text-sm font-bold text-amber-700">${Math.max(0, (parseFloat(serviceData.total_amount)||0) - (parseFloat(serviceData.deposit_amount)||0)).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer — solo para tickets editables */}
          {(!panelTicket || (panelTicket.status !== 'cancelled' && panelTicket.status !== 'completed')) && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              {isService && serviceDeposit > 0 && (
                <div className="mb-2 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Productos</span>
                    <span>${Math.max(0, cartTotal - discAmt).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-violet-600 font-medium">
                    <span>Seña servicio técnico</span>
                    <span>+${serviceDeposit.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-medium">Total a cobrar</span>
                <span className="text-2xl font-bold text-slate-900">${finalTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-sm"
                >
                  {saving ? 'Guardando...' : panelTicket ? 'Guardar cambios' : 'Abrir venta'}
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
        <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <svg className="w-14 h-14 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="8" width="20" height="13" rx="2"/>
                <path d="M6 8V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v3"/>
                <rect x="14" y="4" width="6" height="4" rx="1"/>
                <line x1="2" y1="13" x2="22" y2="13"/>
                <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>
                <circle cx="17" cy="17" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Selecciona una venta</p>
            <p className="text-slate-400 text-sm mt-1">Haz clic en un número del panel izquierdo</p>
          </div>
        </div>
      )}    </div>

    {/* Delete confirmation modal */}
    {confirmDelete && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">¿Eliminar venta #{selectedNumber}?</h3>
                <p className="text-sm text-slate-500 mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={doDelete}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
