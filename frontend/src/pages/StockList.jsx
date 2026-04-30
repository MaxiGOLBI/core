import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { NumericInput } from '../components/NumericInput';

const LEVEL_CLASSES = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
};

const LEVEL_DOTS = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

const TABS = [
  { key: 'available', label: 'Disponible' },
  { key: 'faulty', label: 'Con fallas' },
  { key: 'nostock', label: 'Sin stock' },
];

export default function StockList({ branchId } = {}) {
  const { hasRole, user } = useAuth();
  const isDueno = user?.role === 'dueno';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('available');
  const [search, setSearch] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editStock, setEditStock] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '', commission_default: '0', branch_id: branchId || '' });
  const [formError, setFormError] = useState('');
  const [branches, setBranches] = useState([]);

  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', stock: '' });
  const [editError, setEditError] = useState('');

  // Faulty popup: { id, type: 'add'|'remove', qty, productName, maxQty }
  const [faultyPopup, setFaultyPopup] = useState(null);
  const faultyInputRef = useRef(null);

  async function fetchProducts(searchParam = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParam) params.set('search', searchParam);
      if (branchId) params.set('branch_id', branchId);
      const query = params.toString() ? `?${params}` : '';
      const data = await api.get(`/api/stock${query}`);
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); }, [branchId]);

  // Load branches for dueño when not scoped to a specific branch
  useEffect(() => {
    if (!isDueno || branchId) return;
    api.get('/api/branches')
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch((err) => setFormError('No se pudieron cargar las sucursales: ' + err.message));
  }, [isDueno, branchId]);

  // Keep form branch_id in sync if branchId prop changes
  useEffect(() => {
    if (branchId) setFormData((f) => ({ ...f, branch_id: branchId }));
  }, [branchId]);

  // Auto-focus the qty input when popup opens
  useEffect(() => {
    if (faultyPopup && faultyInputRef.current) {
      faultyInputRef.current.focus();
    }
  }, [faultyPopup]);

  function filteredProducts() {
    switch (tab) {
      case 'available': return products.filter((p) => p.stock > 0);
      case 'faulty':    return products.filter((p) => (p.faulty_stock ?? 0) > 0);
      case 'nostock':   return products.filter((p) => p.stock === 0);
      default:          return products;
    }
  }

  async function handleStockSave(id) {
    try {
      await api.patch(`/api/stock/${id}`, { stock: parseInt(editStock) });
      setEditingId(null);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFaultyConfirm(e) {
    e.preventDefault();
    if (!faultyPopup) return;
    const qty = parseInt(faultyPopup.qty);
    if (!qty || qty <= 0) { setFaultyPopup(null); return; }
    try {
      const body = faultyPopup.type === 'add' ? { add_faulty: qty } : { remove_faulty: qty };
      await api.patch(`/api/stock/${faultyPopup.id}`, body);
      setFaultyPopup(null);
      fetchProducts();
    } catch (err) {
      setError(err.message);
      setFaultyPopup(null);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/api/products', {
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        commission_default: parseFloat(formData.commission_default),
        branch_id: formData.branch_id || branchId || undefined,
      });
      setShowForm(false);
      setFormData({ name: '', price: '', stock: '', commission_default: '0', branch_id: branchId || '' });
      fetchProducts();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setEditError('');
    try {
      await api.put(`/api/products/${editProduct.id}`, {
        name: editForm.name,
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock),
      });
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminar producto?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  const shown = filteredProducts();

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Cargando stock...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Faulty qty popup */}
      {faultyPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setFaultyPopup(null); }}>
          <form onSubmit={handleFaultyConfirm}
            className="bg-white rounded-xl shadow-xl p-6 w-72 mx-4">
            <h3 className="font-semibold text-slate-900 mb-1">
              {faultyPopup.type === 'add' ? 'Mover a fallas' : 'Restaurar al stock'}
            </h3>
            <p className="text-slate-500 text-xs mb-4">{faultyPopup.productName}</p>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Selecciona cantidad{' '}
              <span className="text-slate-400">(max {faultyPopup.maxQty})</span>
            </label>
            <input
              ref={faultyInputRef}
              type="number"
              min="1"
              max={faultyPopup.maxQty}
              value={faultyPopup.qty}
              onChange={(e) => setFaultyPopup((p) => ({ ...p, qty: e.target.value }))}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              placeholder="0"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setFaultyPopup(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className={`flex-1 text-white py-2 rounded-lg text-sm font-semibold transition-colors ${
                  faultyPopup.type === 'add'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}>
                Aceptar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock</h1>
          <p className="text-slate-500 text-sm mt-0.5">{shown.length} productos</p>
        </div>
        {hasRole('encargado', 'dueno') && (
          <button onClick={() => setShowForm((v) => !v)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
            + Nuevo producto
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* New product form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Nuevo producto</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {isDueno && !branchId && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Sucursal</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData((f) => ({ ...f, branch_id: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Seleccionar sucursal...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
              <input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                required placeholder="Nombre del producto"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Precio</label>
              <NumericInput value={formData.price}
                onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))} required placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Stock inicial</label>
              <input type="number" min="0" value={formData.stock}
                onChange={(e) => setFormData((f) => ({ ...f, stock: e.target.value }))} required placeholder="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Comision por unidad ($)</label>
              <NumericInput value={formData.commission_default}
                onChange={(e) => setFormData((f) => ({ ...f, commission_default: e.target.value }))} placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mt-3">
              <p className="text-red-700 text-xs">{formError}</p>
            </div>
          )}
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={() => setShowForm(false)}
              className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Edit product modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleEditSave} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-slate-900 mb-4">Editar producto</h3>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Codigo (no editable)</label>
              <input value={editProduct.code} readOnly
                className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed" />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Precio</label>
                <NumericInput value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad</label>
                <input type="number" min="0" value={editForm.stock}
                  onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            {editError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-3">
                <p className="text-red-700 text-xs">{editError}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setEditProduct(null)}
                className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); fetchProducts(); }} className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52" />
          <button type="submit"
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Buscar
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); fetchProducts(''); }}
              className="text-slate-400 hover:text-slate-700 text-sm px-2">
              X
            </button>
          )}
        </form>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Codigo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {tab === 'faulty' ? 'Unid. con fallas' : 'Stock'}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              {hasRole('encargado', 'dueno', 'cajero') && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                  No hay productos en esta categoria.
                </td>
              </tr>
            ) : (
              shown.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-right text-slate-700">${parseFloat(p.price).toFixed(2)}</td>

                  {/* Stock / faulty_stock column */}
                  <td className="px-4 py-3 text-center">
                    {tab !== 'faulty' && editingId === p.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <input type="number" min="0" value={editStock}
                          onChange={(e) => setEditStock(e.target.value)}
                          className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus />
                        <button onClick={() => handleStockSave(p.id)}
                          className="text-emerald-600 hover:text-emerald-800 font-bold text-sm px-1">OK</button>
                        <button onClick={() => setEditingId(null)}
                          className="text-slate-400 hover:text-slate-600 text-sm px-1">X</button>
                      </div>
                    ) : (
                      <span
                        className={`font-semibold text-slate-900 ${tab !== 'faulty' ? 'hover:text-indigo-600 transition-colors cursor-pointer' : ''}`}
                        onClick={tab !== 'faulty' ? () => { setEditingId(p.id); setEditStock(String(p.stock)); } : undefined}
                        title={tab !== 'faulty' ? 'Clic para editar' : undefined}
                      >
                        {tab === 'faulty' ? (p.faulty_stock ?? 0) : p.stock}
                      </span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 text-center">
                    {tab === 'faulty' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        Con fallas
                      </span>
                    ) : p.stock === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Sin stock
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${LEVEL_CLASSES[p.stock_level]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_DOTS[p.stock_level]}`} />
                        {p.stock_level === 'green' ? 'OK' : p.stock_level === 'yellow' ? 'Bajo' : 'Critico'}
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  {hasRole('encargado', 'dueno', 'cajero') && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {hasRole('encargado', 'dueno') && tab !== 'faulty' && (
                          <button
                            onClick={() => setFaultyPopup({ id: p.id, type: 'add', qty: '', productName: p.name, maxQty: p.stock })}
                            className="text-orange-500 hover:text-orange-700 text-xs font-medium transition-colors">
                            Fallas
                          </button>
                        )}
                        {hasRole('encargado', 'dueno') && tab === 'faulty' && (
                          <button
                            onClick={() => setFaultyPopup({ id: p.id, type: 'remove', qty: '', productName: p.name, maxQty: p.faulty_stock ?? 0 })}
                            className="text-emerald-600 hover:text-emerald-700 text-xs font-medium transition-colors">
                            Restaurar
                          </button>
                        )}
                        {hasRole('encargado', 'dueno') && (
                          <>
                            <button
                              onClick={() => { setEditProduct(p); setEditForm({ name: p.name, price: String(p.price), stock: String(p.stock) }); setEditError(''); }}
                              className="text-indigo-500 hover:text-indigo-700 text-xs font-medium transition-colors">
                              Editar
                            </button>
                            <button onClick={() => handleDelete(p.id)}
                              className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}