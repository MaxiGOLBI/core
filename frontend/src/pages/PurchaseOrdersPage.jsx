import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Constants ──────────────────────────────────────────────────
const STATUS_LABELS = {
  draft:     'Borrador',
  sent:      'Enviado',
  received:  'Recibido',
  cancelled: 'Cancelado',
};
const STATUS_STYLES = {
  draft:     'bg-slate-100 text-slate-600',
  sent:      'bg-blue-100 text-blue-700',
  received:  'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-600',
};
const ORDER_TYPES = [
  { key: 'proveedor', label: 'Proveedor' },
  { key: 'sucursal',  label: 'Sucursal'  },
  { key: 'deposito',  label: 'Depósito'  },
];
const STATUS_TABS = ['draft', 'sent', 'received', 'cancelled'];

const EMPTY_ITEM = { product_name: '', code: '', qty: '', unit_cost: '', subtotal: 0 };
const EMPTY_FORM = {
  order_type: 'proveedor', supplier_id: '', branch_id: '',
  notes: '', expected_date: '', items: [{ ...EMPTY_ITEM }],
};

// ── Helpers ────────────────────────────────────────────────────
function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
function fmtDate(str) {
  if (!str) return '—';
  const s = str.split('T')[0];
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function calcTotal(items) {
  return items.reduce((sum, it) => sum + (parseFloat(it.subtotal) || 0), 0);
}

// ── Badge de estado ────────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Modal de crear / editar pedido ─────────────────────────────
function OrderFormModal({ order, branches, suppliers, isDueno, onClose, onSaved }) {
  const init = order
    ? {
        order_type:  order.order_type,
        supplier_id: order.supplier_id ?? '',
        branch_id:   order.branch_id ?? '',
        notes:       order.notes ?? '',
        expected_date: order.expected_date ? order.expected_date.split('T')[0] : '',
        items: order.items.map(it => ({
          product_name: it.product_name ?? '',
          code:         it.code ?? '',
          qty:          String(it.qty),
          unit_cost:    String(it.unit_cost),
          subtotal:     it.subtotal,
        })),
      }
    : { ...EMPTY_FORM, items: [{ ...EMPTY_ITEM }] };

  const [form, setForm]   = useState(init);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function updateItem(idx, field, value) {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [field]: value };
        if (field === 'qty' || field === 'unit_cost') {
          const qty  = parseFloat(field === 'qty'       ? value : updated.qty)       || 0;
          const cost = parseFloat(field === 'unit_cost' ? value : updated.unit_cost) || 0;
          updated.subtotal = qty * cost;
        }
        return updated;
      });
      return { ...f, items };
    });
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    if (isDueno && !form.branch_id) return setError('Seleccioná una sucursal destino.');
    if (form.items.length === 0) return setError('Agregá al menos un ítem.');
    for (const it of form.items) {
      if (!it.product_name.trim()) return setError('Completá el nombre de todos los ítems.');
      if (!it.qty || parseFloat(it.qty) <= 0) return setError('La cantidad de todos los ítems debe ser mayor a 0.');
    }
    setSaving(true);
    const payload = {
      order_type:    form.order_type,
      supplier_id:   form.supplier_id || null,
      branch_id:     form.branch_id   || undefined,
      notes:         form.notes,
      expected_date: form.expected_date || undefined,
      items: form.items.map(it => ({
        product_name: it.product_name,
        code:         it.code || undefined,
        qty:          parseFloat(it.qty),
        unit_cost:    parseFloat(it.unit_cost) || 0,
        subtotal:     parseFloat(it.subtotal)  || 0,
      })),
    };
    try {
      if (order) {
        await api.put(`/api/purchase-orders/${order.id}`, payload);
      } else {
        await api.post('/api/purchase-orders', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const total = calcTotal(form.items);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-base">
            {order ? 'Editar pedido' : 'Nuevo pedido'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-700 text-sm">{error}</div>
          )}

          {/* Cabecera del pedido */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
              <select value={form.order_type} onChange={e => setField('order_type', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ORDER_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>

            {form.order_type === 'proveedor' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor</label>
                <select value={form.supplier_id} onChange={e => setField('supplier_id', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {isDueno && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sucursal destino *</label>
                <select value={form.branch_id} onChange={e => setField('branch_id', e.target.value)}
                  required
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!form.branch_id ? 'border-red-300' : 'border-slate-300'}`}>
                  <option value="">Seleccionar sucursal…</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha esperada</label>
              <input type="date" value={form.expected_date} onChange={e => setField('expected_date', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ítems</p>
              <button type="button" onClick={addItem}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800">+ Agregar ítem</button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-left hidden sm:table-cell">Código</th>
                    <th className="px-3 py-2 text-right w-20">Cant.</th>
                    <th className="px-3 py-2 text-right w-28">Costo unit.</th>
                    <th className="px-3 py-2 text-right w-28">Subtotal</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <input value={it.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)}
                          placeholder="Nombre del producto" required
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell">
                        <input value={it.code} onChange={e => updateItem(idx, 'code', e.target.value)}
                          placeholder="SKU-001"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="1" value={it.qty} onChange={e => updateItem(idx, 'qty', e.target.value)}
                          required placeholder="0"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="0.01" value={it.unit_cost}
                          onChange={e => updateItem(idx, 'unit_cost', e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                        {fmtMoney(it.subtotal)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)}
                            className="text-slate-300 hover:text-rose-500 text-base leading-none transition-colors">&times;</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">Total:</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">{fmtMoney(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Panel de detalle ───────────────────────────────────────────
function OrderDetailPanel({ order, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Pedido #{order.id.slice(0, 8)}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={order.status} />
              <span className="text-xs text-slate-400">{ORDER_TYPES.find(t => t.key === order.order_type)?.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Info */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5 text-slate-600">
            {order.supplier_name && <p><span className="font-medium">Proveedor:</span> {order.supplier_name}</p>}
            {order.branch_name   && <p><span className="font-medium">Sucursal:</span> {order.branch_name}</p>}
            {order.expected_date && <p><span className="font-medium">Fecha esperada:</span> {fmtDate(order.expected_date)}</p>}
            <p><span className="font-medium">Creado por:</span> {order.created_by_name} · {fmtDate(order.created_at)}</p>
            {order.received_by_name && (
              <p><span className="font-medium">Recibido por:</span> {order.received_by_name} · {fmtDate(order.received_at)}</p>
            )}
            {order.notes && <p className="italic text-slate-400">{order.notes}</p>}
          </div>

          {/* Ítems */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ítems</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Producto</th>
                    <th className="px-4 py-2 text-center">Cant.</th>
                    <th className="px-4 py-2 text-right">Costo u.</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items ?? []).map((it, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{it.product_name}</div>
                        {it.code && <div className="text-xs text-slate-400 font-mono">{it.code}</div>}
                      </td>
                      <td className="px-4 py-2 text-center text-slate-700">{it.qty}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{fmtMoney(it.unit_cost)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmtMoney(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-500 text-right">Total:</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-800">{fmtMoney(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const { hasRole, user } = useAuth();
  const isDueno = user?.role === 'dueno';

  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [statusTab, setStatusTab] = useState('draft');

  const [branches, setBranches]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Filters (dueño)
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterBranch, setFilterBranch]     = useState('');

  // UI state
  const [showForm, setShowForm]       = useState(false);
  const [editOrder, setEditOrder]     = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [warnings, setWarnings]       = useState([]);

  // Load reference data
  useEffect(() => {
    api.get('/api/suppliers').then(d => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {});
    if (isDueno) {
      api.get('/api/branches').then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [isDueno]);

  const loadOrders = useCallback(async (tab = statusTab) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ status: tab });
      if (filterSupplier) params.set('supplier_id', filterSupplier);
      if (filterBranch)   params.set('branch_id',   filterBranch);
      const data = await api.get(`/api/purchase-orders?${params}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusTab, filterSupplier, filterBranch]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  function changeTab(tab) {
    setStatusTab(tab);
    loadOrders(tab);
  }

  async function handleMarkSent(order) {
    try {
      await api.put(`/api/purchase-orders/${order.id}`, { status: 'sent' });
      loadOrders();
    } catch (err) { setError(err.message); }
  }

  async function handleReceive(order) {
    try {
      const result = await api.post(`/api/purchase-orders/${order.id}/receive`, {});
      if (result.stock_warnings?.length) {
        setWarnings(result.stock_warnings);
      }
      loadOrders();
    } catch (err) { setError(err.message); }
  }

  async function handleCancel(order) {
    try {
      await api.post(`/api/purchase-orders/${order.id}/cancel`, {});
      loadOrders();
    } catch (err) { setError(err.message); }
  }

  function handleSaved() {
    setShowForm(false);
    setEditOrder(null);
    loadOrders();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pedidos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de órdenes de compra y recepción de mercadería</p>
        </div>
        <button onClick={() => { setEditOrder(null); setShowForm(true); }}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          + Nuevo pedido
        </button>
      </div>

      {/* Warnings toast */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Pedido recibido con advertencias</p>
              <ul className="list-disc list-inside space-y-0.5">
                {warnings.map((w, i) => <li key={i} className="text-xs text-amber-700">{w}</li>)}
              </ul>
            </div>
            <button onClick={() => setWarnings([])} className="text-amber-400 hover:text-amber-700 text-lg leading-none">&times;</button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">{error}</div>
      )}

      {/* Filtros (dueño) */}
      {isDueno && (suppliers.length > 0 || branches.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          {suppliers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Proveedor</label>
              <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {branches.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sucursal</label>
              <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todas</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Tabs de estado */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => changeTab(s)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              statusTab === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-400 text-center">
            No hay pedidos en estado {STATUS_LABELS[statusTab].toLowerCase()}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left hidden sm:table-cell">Proveedor / Sucursal</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">F. esperada</th>
                  <th className="px-5 py-3 text-left hidden lg:table-cell">Creado por</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-700 capitalize">
                      {ORDER_TYPES.find(t => t.key === ord.order_type)?.label ?? ord.order_type}
                    </td>
                    <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">
                      {ord.supplier_name ?? ord.branch_name ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmtMoney(ord.total)}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{fmtDate(ord.expected_date)}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs hidden lg:table-cell">{ord.created_by_name}</td>
                    <td className="px-5 py-3"><StatusBadge status={ord.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Ver detalle siempre */}
                        <button onClick={() => setDetailOrder(ord)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                          Ver
                        </button>

                        {/* Acciones según estado */}
                        {ord.status === 'draft' && (
                          <>
                            <button onClick={() => { setEditOrder(ord); setShowForm(true); }}
                              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                              Editar
                            </button>
                            <button onClick={() => handleMarkSent(ord)}
                              className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                              Marcar enviado
                            </button>
                            <button onClick={() => handleReceive(ord)}
                              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                              Recepcionar
                            </button>
                            <button onClick={() => handleCancel(ord)}
                              className="text-xs text-rose-400 hover:text-rose-600 font-medium">
                              Cancelar
                            </button>
                          </>
                        )}
                        {ord.status === 'sent' && (
                          <>
                            <button onClick={() => handleReceive(ord)}
                              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                              Recepcionar
                            </button>
                            <button onClick={() => handleCancel(ord)}
                              className="text-xs text-rose-400 hover:text-rose-600 font-medium">
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showForm && (
        <OrderFormModal
          order={editOrder}
          branches={branches}
          suppliers={suppliers}
          isDueno={isDueno}
          onClose={() => { setShowForm(false); setEditOrder(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Panel detalle */}
      {detailOrder && (
        <OrderDetailPanel
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
        />
      )}
    </div>
  );
}
