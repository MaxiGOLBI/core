import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { NumericInput } from '../components/NumericInput';
import ConfirmModal from '../components/ConfirmModal';

const LEVEL_CLASSES = {
  green:  'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red:    'bg-red-100 text-red-700',
};
const LEVEL_DOTS = {
  green:  'bg-emerald-500',
  yellow: 'bg-amber-500',
  red:    'bg-red-500',
};
const STOCK_TABS = [
  { key: 'available', label: 'Disponible' },
  { key: 'faulty',    label: 'Con fallas' },
  { key: 'nostock',   label: 'Sin stock' },
];

function calcGanancia(precio, costo) {
  const p = parseFloat(precio);
  const c = parseFloat(costo);
  if (isNaN(p) || isNaN(c)) return null;
  return p - c;
}

// Product form shared by create & edit
function ProductForm({ title, data, setData, onSubmit, onCancel, error, branches, isDueno, branchIdProp, categories }) {
  const ganancia = calcGanancia(data.price, data.cost_price);
  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-black/75 flex items-center justify-center z-[9999]"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-semibold text-white text-base">{title}</h3>
          <button type="button" onClick={onCancel} className="text-white/70 hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {isDueno && !branchIdProp && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Sucursal</label>
                <select value={data.branch_id} onChange={(e) => setData(f => ({ ...f, branch_id: e.target.value }))} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar sucursal...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
              <input value={data.name} onChange={(e) => setData(f => ({ ...f, name: e.target.value }))} required placeholder="Nombre del producto"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">SKU / Código <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input value={data.sku ?? ''} onChange={(e) => setData(f => ({ ...f, sku: e.target.value }))} placeholder="Ej: SKU-001"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Categoría</label>
              <select value={data.category_id} onChange={(e) => setData(f => ({ ...f, category_id: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Precio Costo ($)</label>
              <NumericInput value={data.cost_price} onChange={(e) => setData(f => ({ ...f, cost_price: e.target.value }))} placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Precio Venta ($)</label>
              <NumericInput value={data.price} onChange={(e) => setData(f => ({ ...f, price: e.target.value }))} required placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {ganancia !== null && (
              <div className="col-span-2">
                <div className={`rounded-lg px-4 py-2.5 flex items-center justify-between ${ganancia >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                  <span className="text-xs font-medium text-slate-500">Ganancia por unidad</span>
                  <span className={`text-base font-bold ${ganancia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${ganancia.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Stock inicial</label>
              <input type="number" min="0" value={data.stock} onChange={(e) => setData(f => ({ ...f, stock: e.target.value }))} required placeholder="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Comisión por unidad ($)</label>
              <NumericInput value={data.commission_default} onChange={(e) => setData(f => ({ ...f, commission_default: e.target.value }))} placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5"><p className="text-red-700 text-xs">{error}</p></div>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onCancel}
              className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit"
              className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Categories management tab
const CAT_PALETTE = [
  { key: 'blue',    bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  { key: 'emerald', bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500' },
  { key: 'violet',  bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500'  },
  { key: 'amber',   bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500'   },
  { key: 'rose',    bg: 'bg-rose-100',   text: 'text-rose-700',   dot: 'bg-rose-500'    },
  { key: 'cyan',    bg: 'bg-cyan-100',   text: 'text-cyan-700',   dot: 'bg-cyan-500'    },
  { key: 'orange',  bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500'  },
  { key: 'slate',   bg: 'bg-slate-100',  text: 'text-slate-700',  dot: 'bg-slate-400'   },
];
function catColor(idx) { return CAT_PALETTE[idx % CAT_PALETTE.length]; }

export function CategoriesTab({ categories, onRefresh }) {
  const [newName, setNewName] = useState('');
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError]     = useState('');
  const [deleteItem, setDeleteItem] = useState(null); // { id, name }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true); setError('');
    try { await api.post('/api/categories', { name: newName.trim() }); setNewName(''); onRefresh(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleSaveEdit(id) {
    if (!editName.trim()) return; setError('');
    try { await api.put(`/api/categories/${id}`, { name: editName.trim() }); setEditId(null); onRefresh(); }
    catch (err) { setError(err.message); }
  }

  async function handleDelete(id, name) {
    setDeleteItem(null);
    setError('');
    try { await api.delete(`/api/categories/${id}`); onRefresh(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="space-y-5">
      {/* Add new category */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Nueva categoría</p>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de la categoría..."
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={saving || !newName.trim()}
            className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm disabled:opacity-50">
            {saving ? '...' : '+ Agregar'}
          </button>
        </form>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      {/* Category list */}
      {categories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-slate-400 text-sm font-medium">No hay categorías creadas aún</p>
          <p className="text-slate-300 text-xs mt-1">Agregá tu primera categoría arriba</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{categories.length} categoría{categories.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat, idx) => {
              const col = catColor(idx);
              return (
                <div key={cat.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  {editId === cat.id ? (
                    <div className="p-3 flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${col.dot}`} />
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
                        className="flex-1 border border-blue-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={() => handleSaveEdit(cat.id)}
                        className="text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap">Guardar</button>
                      <button onClick={() => setEditId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${col.bg} ${col.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                        {cat.name}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => { setEditId(cat.id); setEditName(cat.name); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteItem({ id: cat.id, name: cat.name })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteItem}
        title="Eliminar categoría"
        message={deleteItem ? `¿Estás seguro? Se eliminará "${deleteItem.name}". Los productos asociados quedarán sin categoría.` : ''}
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(deleteItem?.id, deleteItem?.name)}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}

export default function StockList({ branchId } = {}) {
  const { hasRole, user } = useAuth();
  const isDueno   = user?.role === 'dueno';
  const canManage = hasRole('encargado', 'dueno');

  const [products, setProducts]             = useState([]);
  const [categories, setCategories]         = useState([]);
  const [branches, setBranches]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [tab, setTab]                       = useState('available');
  const [search, setSearch]                 = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editStock, setEditStock] = useState('');

  const EMPTY_FORM = { name: '', cost_price: '', price: '', stock: '', commission_default: '0', category_id: '', branch_id: branchId || '', sku: '' };
  const [showForm, setShowForm]   = useState(false);
  const [formData, setFormData]   = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm]       = useState({ name: '', cost_price: '', price: '', stock: '', commission_default: '0', category_id: '' });
  const [editError, setEditError]     = useState('');

  const [faultyPopup, setFaultyPopup] = useState(null);
  const faultyInputRef = useRef(null);
  const [deleteProductId, setDeleteProductId] = useState(null);

  // ── Valuation state (dueno only) ────────────────────────────────
  const [valuation, setValuation]         = useState(null);
  const [valLoading, setValLoading]       = useState(false);
  const [valError, setValError]           = useState('');
  const [valBranch, setValBranch]         = useState('');
  const [valExpanded, setValExpanded]     = useState({});

  // ── Transfers state ───────────────────────────────────────────
  const [showTransfersPanel, setShowTransfersPanel] = useState(false);
  const [transfersTab, setTransfersTab]     = useState('pending');
  const [transfers, setTransfers]           = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transferModal, setTransferModal]   = useState(null); // { id, name, stock }
  const [transferForm, setTransferForm]     = useState({ from_branch_id: '', to_branch_id: '', qty: '', notes: '' });
  const [transferError, setTransferError]   = useState('');
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferBranchProds, setTransferBranchProds] = useState([]);
  const [transferBranchLoading, setTransferBranchLoading] = useState(false);

  async function fetchProducts(searchParam = search, catId = filterCategory) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParam) params.set('search', searchParam);
      if (branchId)    params.set('branch_id', branchId);
      if (catId)       params.set('category_id', catId);
      const q = params.toString() ? `?${params}` : '';
      const data = await api.get(`/api/stock${q}`);
      setProducts(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function fetchCategories() {
    try {
      const data = await api.get('/api/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch { /* non-critical */ }
  }

  useEffect(() => { fetchProducts(); }, [branchId]); // eslint-disable-line
  useEffect(() => { fetchCategories(); }, []); // eslint-disable-line
  useEffect(() => {
    if (!canManage) return;
    api.get('/api/branches').then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
  }, [canManage]); // eslint-disable-line
  useEffect(() => {
    if (branchId) setFormData(f => ({ ...f, branch_id: branchId }));
  }, [branchId]);
  useEffect(() => {
    if (faultyPopup && faultyInputRef.current) faultyInputRef.current.focus();
  }, [faultyPopup]);

  function filteredProducts() {
    switch (tab) {
      case 'available': return products.filter(p => p.stock > 0);
      case 'faulty':    return products.filter(p => (p.faulty_stock ?? 0) > 0);
      case 'nostock':   return products.filter(p => p.stock === 0);
      default:          return products;
    }
  }

  async function handleStockSave(id) {
    try { await api.patch(`/api/stock/${id}`, { stock: parseInt(editStock) }); setEditingId(null); fetchProducts(); }
    catch (err) { setError(err.message); }
  }

  async function handleFaultyConfirm(e) {
    e.preventDefault();
    if (!faultyPopup) return;
    const qty = parseInt(faultyPopup.qty);
    if (!qty || qty <= 0) { setFaultyPopup(null); return; }
    try {
      const body = faultyPopup.type === 'add' ? { add_faulty: qty } : { remove_faulty: qty };
      await api.patch(`/api/stock/${faultyPopup.id}`, body);
      setFaultyPopup(null); fetchProducts();
    } catch (err) { setError(err.message); setFaultyPopup(null); }
  }

  async function handleCreate(e) {
    e.preventDefault(); setFormError('');
    try {
      await api.post('/api/products', {
        name: formData.name, price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost_price) || 0, stock: parseInt(formData.stock),
        commission_default: parseFloat(formData.commission_default) || 0,
        category_id: formData.category_id || null,
        sku: formData.sku || undefined,
        branch_id: formData.branch_id || branchId || undefined,
      });
      setShowForm(false);
      setFormData({ ...EMPTY_FORM, branch_id: branchId || '' });
      fetchProducts();
    } catch (err) { setFormError(err.message); }
  }

  async function handleEditSave(e) {
    e.preventDefault(); setEditError('');
    try {
      await api.put(`/api/products/${editProduct.id}`, {
        name: editForm.name, price: parseFloat(editForm.price),
        cost_price: parseFloat(editForm.cost_price) || 0, stock: parseInt(editForm.stock),
        commission_default: parseFloat(editForm.commission_default) || 0,
        category_id: editForm.category_id || null,
      sku: editForm.sku || undefined,
      });
      setEditProduct(null); fetchProducts();
    } catch (err) { setEditError(err.message); }
  }

  async function handleDelete(id) {
    setDeleteProductId(null);
    try { await api.delete(`/api/products/${id}`); fetchProducts(); }
    catch (err) { setError(err.message); }
  }

  async function loadValuation() {
    setValLoading(true);
    setValError('');
    try {
      const params = new URLSearchParams();
      if (valBranch) params.set('branch_id', valBranch);
      const q = params.toString() ? `?${params}` : '';
      const d = await api.get(`/api/reports/stock-valuation${q}`);
      setValuation(d);
    } catch (err) {
      setValError(err.message || 'Error al cargar valorización.');
    } finally {
      setValLoading(false);
    }
  }

  async function loadTransferBranchProds(branchId) {
    if (!branchId) { setTransferBranchProds([]); return; }
    setTransferBranchLoading(true);
    try {
      const data = await api.get(`/api/stock?branch_id=${encodeURIComponent(branchId)}`);
      setTransferBranchProds(Array.isArray(data) ? data.filter(p => p.stock > 0) : []);
    } catch { setTransferBranchProds([]); }
    finally { setTransferBranchLoading(false); }
  }

  async function loadTransfers(status) {
    setTransfersLoading(true);
    try {
      const data = await api.get(`/api/stock/transfers?status=${status}`);
      setTransfers(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    finally { setTransfersLoading(false); }
  }

  function openTransfersPanel() {
    setShowTransfersPanel(true);
    setTransfersTab('pending');
    loadTransfers('pending');
  }

  async function handleTransferSubmit(e) {
    e.preventDefault(); setTransferError('');
    if (isDueno && !transferForm.from_branch_id) return setTransferError('Seleccioná una sucursal origen.');
    if (!transferForm.to_branch_id) return setTransferError('Seleccioná una sucursal destino.');
    const qty = parseInt(transferForm.qty);
    if (!qty || qty <= 0) return setTransferError('La cantidad debe ser mayor a 0.');
    if (qty > transferModal.stock) return setTransferError(`Stock insuficiente (máx. ${transferModal.stock}).`);
    setTransferSaving(true);
    try {
      const body = {
        product_id: transferModal.id,
        to_branch_id: transferForm.to_branch_id,
        qty,
        notes: transferForm.notes,
      };
      if (isDueno) body.from_branch_id = transferForm.from_branch_id;
      await api.post('/api/stock/transfers', body);
      setTransferModal(null);
      setTransferForm({ from_branch_id: '', to_branch_id: '', qty: '', notes: '' });
      setTransferBranchProds([]);
      fetchProducts();
      if (showTransfersPanel) loadTransfers(transfersTab);
    } catch (err) { setTransferError(err.message); }
    finally { setTransferSaving(false); }
  }

  async function handleApprove(id) {
    try { await api.post(`/api/stock/transfers/${id}/approve`, {}); loadTransfers(transfersTab); fetchProducts(); }
    catch (err) { setError(err.message); }
  }

  async function handleReject(id) {
    try { await api.post(`/api/stock/transfers/${id}/reject`, {}); loadTransfers(transfersTab); }
    catch (err) { setError(err.message); }
  }

  function openEdit(p) {
    setEditProduct(p);
    setEditForm({
      name: p.name, cost_price: String(p.cost_price ?? 0), price: String(p.price),
      stock: String(p.stock), commission_default: String(p.commission_default ?? 0),
      category_id: p.category_id ?? '', sku: p.sku ?? '',
    });
    setEditError('');
  }

  const shown    = filteredProducts();
  const catName  = (id) => categories.find(c => c.id === id)?.name ?? null;

  if (loading && products.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Cargando stock...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">

      {faultyPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setFaultyPopup(null); }}>
          <form onSubmit={handleFaultyConfirm} className="bg-white rounded-xl shadow-xl p-6 w-72 mx-4">
            <h3 className="font-semibold text-slate-900 mb-1">
              {faultyPopup.type === 'add' ? 'Mover a fallas' : 'Restaurar al stock'}
            </h3>
            <p className="text-slate-500 text-xs mb-4">{faultyPopup.productName}</p>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Cantidad <span className="text-slate-400">(max {faultyPopup.maxQty})</span>
            </label>
            <input ref={faultyInputRef} type="number" min="1" max={faultyPopup.maxQty}
              value={faultyPopup.qty} onChange={(e) => setFaultyPopup(p => ({ ...p, qty: e.target.value }))}
              required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setFaultyPopup(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancelar</button>
              <button type="submit"
                className={`flex-1 text-white py-2 rounded-lg text-sm font-semibold transition-colors ${faultyPopup.type === 'add' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                Aceptar
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <ProductForm title="Nuevo producto" data={formData} setData={setFormData}
          onSubmit={handleCreate} onCancel={() => { setShowForm(false); setFormError(''); }}
          error={formError} branches={branches} isDueno={isDueno} branchIdProp={branchId} categories={categories} />
      )}

      {editProduct && (
        <ProductForm title="Editar producto" data={editForm} setData={setEditForm}
          onSubmit={handleEditSave} onCancel={() => setEditProduct(null)}
          error={editError} branches={branches} isDueno={isDueno} branchIdProp={branchId} categories={categories} />
      )}

      {!branchId && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
          <div className="relative flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">Stock</h1>
              <p className="text-blue-100 text-sm mt-1">{shown.length} productos</p>
            </div>
            <div className="flex items-center gap-2">
              {canManage && (
                <button onClick={openTransfersPanel}
                  className="bg-white/10 text-white border border-white/30 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/20 transition-all">
                  Transferencias
                </button>
              )}
              {canManage && (
                <button onClick={() => setShowForm(true)}
                  className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all">
                  + Nuevo producto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {branchId && canManage && (
        <div className="flex justify-start gap-2 mb-4">
          <button onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm">
            + Nuevo producto
          </button>
          <button onClick={openTransfersPanel}
            className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all">
            Transferencias
          </button>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4"><p className="text-red-700 text-sm">{error}</p></div>}

      <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center flex-wrap">
            <form onSubmit={(e) => { e.preventDefault(); fetchProducts(); }} className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre..."
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48" />
              <button type="submit"
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Buscar</button>
              {search && (
                <button type="button" onClick={() => { setSearch(''); fetchProducts('', filterCategory); }}
                  className="text-slate-400 hover:text-slate-700 text-sm px-2">X</button>
              )}
            </form>
            {categories.length > 0 && (
              <select value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); fetchProducts(search, e.target.value); }}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todas las categorias</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <div className="flex gap-1 flex-wrap">
              {STOCK_TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {t.label}
                </button>
              ))}
              {isDueno && (
                <button onClick={() => { setTab('valuation'); loadValuation(); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'valuation' ? 'bg-indigo-600 text-white' : 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                  Valorización
                </button>
              )}
            </div>
          </div>

          {tab === 'valuation' && isDueno ? (
            <div className="space-y-4">
              {/* Valuation filter bar */}
              <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                {branches.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sucursal</label>
                    <select value={valBranch} onChange={e => setValBranch(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Todas</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={loadValuation}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  Actualizar
                </button>
              </div>

              {valError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{valError}</div>}

              {valLoading ? (
                <div className="flex justify-center py-10">
                  <svg className="animate-spin w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              ) : valuation && (
                <>
                  {/* Total card */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-indigo-800">Valorización total del inventario</span>
                    <span className="text-xl font-bold text-indigo-700">
                      ${parseFloat(valuation.total_value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* By branch */}
                  {valuation.branches?.map(branch => (
                    <div key={branch.branch_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setValExpanded(prev => ({ ...prev, [branch.branch_id]: !prev[branch.branch_id] }))}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                        <span className="font-semibold text-slate-800 text-sm">{branch.branch_name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-700">
                            ${parseFloat(branch.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${valExpanded[branch.branch_id] ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {valExpanded[branch.branch_id] && branch.by_category?.length > 0 && (
                        <div className="border-t border-slate-100">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidades</th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {branch.by_category.map(cat => (
                                <tr key={cat.category_id || cat.category_name} className="hover:bg-slate-50">
                                  <td className="px-4 py-2.5 text-slate-700">{cat.category_name || 'Sin categoría'}</td>
                                  <td className="px-4 py-2.5 text-right text-slate-600">{(cat.units ?? 0).toLocaleString('es-AR')}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                                    ${parseFloat(cat.value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Codigo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                    {canManage && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">P. Costo</th>}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">P. Venta</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{tab === 'faulty' ? 'Unid. c/fallas' : 'Stock'}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    {hasRole('encargado', 'dueno', 'cajero') && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">No hay productos en esta categoria.</td></tr>
                  ) : shown.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                        <div>{p.code}</div>
                        {p.sku && <div className="text-indigo-600 text-xs font-medium mt-0.5">{p.sku}</div>}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3">
                        {catName(p.category_id)
                          ? <span className="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{catName(p.category_id)}</span>
                          : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right text-slate-500 text-xs">
                          {p.cost_price ? `$${parseFloat(p.cost_price).toFixed(2)}` : '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-slate-700">${parseFloat(p.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {tab !== 'faulty' && editingId === p.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <input type="number" min="0" value={editStock} onChange={(e) => setEditStock(e.target.value)}
                              className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                            <button onClick={() => handleStockSave(p.id)} className="text-emerald-600 hover:text-emerald-800 font-bold text-sm px-1">OK</button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 text-sm px-1">X</button>
                          </div>
                        ) : (
                          <span
                            className={`font-semibold text-slate-900 ${tab !== 'faulty' ? 'hover:text-blue-600 transition-colors cursor-pointer' : ''}`}
                            onClick={tab !== 'faulty' ? () => { setEditingId(p.id); setEditStock(String(p.stock)); } : undefined}
                            title={tab !== 'faulty' ? 'Clic para editar' : undefined}
                          >
                            {tab === 'faulty' ? (p.faulty_stock ?? 0) : p.stock}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tab === 'faulty' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Con fallas
                          </span>
                        ) : p.stock === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Sin stock
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${LEVEL_CLASSES[p.stock_level]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_DOTS[p.stock_level]}`} />
                            {p.stock_level === 'green' ? 'OK' : p.stock_level === 'yellow' ? 'Bajo' : 'Critico'}
                          </span>
                        )}
                      </td>
                      {hasRole('encargado', 'dueno', 'cajero') && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            {canManage && tab !== 'faulty' && (
                              <button onClick={() => setFaultyPopup({ id: p.id, type: 'add', qty: '', productName: p.name, maxQty: p.stock })}
                                className="text-orange-500 hover:text-orange-700 text-xs font-medium transition-colors">Fallas</button>
                            )}
                            {canManage && tab === 'faulty' && (
                              <button onClick={() => setFaultyPopup({ id: p.id, type: 'remove', qty: '', productName: p.name, maxQty: p.faulty_stock ?? 0 })}
                                className="text-emerald-600 hover:text-emerald-700 text-xs font-medium transition-colors">Restaurar</button>
                            )}
                            {canManage && (
                              <>
                                <button onClick={() => openEdit(p)}
                                  className="text-indigo-500 hover:text-indigo-700 text-xs font-medium transition-colors">Editar</button>
                                <button onClick={() => setDeleteProductId(p.id)}
                                  className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">Eliminar</button>
                              </>
                            )}
                            {canManage && tab !== 'faulty' && (
                              <button
                                onClick={() => {
                                  const fromBranch = isDueno ? (p.branch_id || '') : '';
                                  setTransferModal({ id: p.id, name: p.name, stock: p.stock });
                                  setTransferForm({ from_branch_id: fromBranch, to_branch_id: '', qty: '', notes: '' });
                                  setTransferError('');
                                  if (isDueno && fromBranch) loadTransferBranchProds(fromBranch);
                                }}
                                className="text-blue-500 hover:text-blue-700 text-xs font-medium transition-colors">
                                Transferir
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
      </>

      {/* ── Modal de solicitud de transferencia ─────────────── */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">Solicitar transferencia</h3>
              <button onClick={() => setTransferModal(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              {isDueno ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Sucursal origen *</label>
                    <select value={transferForm.from_branch_id}
                      onChange={e => {
                        const newBranch = e.target.value;
                        setTransferForm(f => ({ ...f, from_branch_id: newBranch, to_branch_id: '', qty: '' }));
                        setTransferModal(m => ({ ...m, id: '', name: '', stock: 0 }));
                        loadTransferBranchProds(newBranch);
                      }} required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccionar sucursal origen...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Producto *</label>
                    <select
                      value={transferModal.id}
                      onChange={e => {
                        const prod = transferBranchProds.find(p => p.id === e.target.value);
                        if (prod) setTransferModal({ id: prod.id, name: prod.name, stock: prod.stock });
                      }}
                      required
                      disabled={!transferForm.from_branch_id || transferBranchLoading}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400">
                      <option value="">{transferBranchLoading ? 'Cargando...' : 'Seleccionar producto...'}</option>
                      {transferBranchProds.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>
                      ))}
                    </select>
                  </div>
                  {transferModal.id && (
                    <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-sm text-slate-700">
                      <span className="font-medium">Producto:</span> {transferModal.name}
                      <span className="ml-3 text-slate-500">Stock disponible: <strong>{transferModal.stock}</strong></span>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-sm text-slate-700">
                  <span className="font-medium">Producto:</span> {transferModal.name}
                  <span className="ml-3 text-slate-500">Stock disponible: <strong>{transferModal.stock}</strong></span>
                </div>
              )}
              {transferError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-700 text-sm">{transferError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sucursal destino *</label>
                <select value={transferForm.to_branch_id}
                  onChange={e => setTransferForm(f => ({ ...f, to_branch_id: e.target.value }))} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar sucursal...</option>
                  {branches
                    .filter(b => isDueno
                      ? (!transferForm.from_branch_id || b.id !== transferForm.from_branch_id)
                      : (!user?.branch_id || b.id !== user?.branch_id)
                    )
                    .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad *</label>
                <input type="number" min="1" max={transferModal.stock || undefined}
                  value={transferForm.qty}
                  onChange={e => setTransferForm(f => ({ ...f, qty: e.target.value }))} required
                  disabled={isDueno && !transferModal.id}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                <textarea value={transferForm.notes}
                  onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setTransferModal(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={transferSaving}
                  className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {transferSaving ? 'Enviando...' : 'Solicitar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Panel de transferencias ──────────────────────────── */}
      {showTransfersPanel && (
        <>
          <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setShowTransfersPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
              <h2 className="font-semibold text-slate-800 text-base">Transferencias de stock</h2>
              <button onClick={() => setShowTransfersPanel(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            {/* Tabs */}
            <div className="px-5 py-3 border-b border-slate-100 flex gap-2">
              {[
                { key: 'pending',  label: 'Pendientes' },
                { key: 'approved', label: 'Aprobadas'  },
                { key: 'rejected', label: 'Rechazadas' },
              ].map(tb => (
                <button key={tb.key}
                  onClick={() => { setTransfersTab(tb.key); loadTransfers(tb.key); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    transfersTab === tb.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  {tb.label}
                </button>
              ))}
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {transfersLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : transfers.length === 0 ? (
                <p className="px-5 py-10 text-sm text-slate-400 text-center">
                  No hay transferencias {transfersTab === 'pending' ? 'pendientes' : transfersTab === 'approved' ? 'aprobadas' : 'rechazadas'}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left">Producto</th>
                        <th className="px-4 py-3 text-left">Origen → Destino</th>
                        <th className="px-4 py-3 text-center">Cant.</th>
                        <th className="px-4 py-3 text-left hidden sm:table-cell">Solicitante</th>
                        <th className="px-4 py-3 text-left">Estado</th>
                        {transfersTab === 'pending' && canManage && <th className="px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfers.map(tr => (
                        <tr key={tr.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{tr.product_name}</div>
                            {tr.product_code && <div className="text-xs text-slate-400 font-mono">{tr.product_code}</div>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            <div>{tr.from_branch_name}</div>
                            <div className="text-slate-400">↓ {tr.to_branch_name}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-700">{tr.qty}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{tr.requested_by_name}</td>
                          <td className="px-4 py-3">
                            {tr.status === 'pending'  && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pendiente</span>}
                            {tr.status === 'approved' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Aprobada</span>}
                            {tr.status === 'rejected' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">Rechazada</span>}
                          </td>
                          {transfersTab === 'pending' && canManage && (
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => handleApprove(tr.id)}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 transition-colors">
                                  Aprobar
                                </button>
                                <button onClick={() => handleReject(tr.id)}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-semibold hover:bg-rose-200 transition-colors">
                                  Rechazar
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={!!deleteProductId}
        title="Eliminar producto"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(deleteProductId)}
        onCancel={() => setDeleteProductId(null)}
      />
    </div>
  );
}
