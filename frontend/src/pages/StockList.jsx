import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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

export default function StockList() {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editStock, setEditStock] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', price: '', stock: '', commission_default: '0' });
  const [formError, setFormError] = useState('');

  async function fetchProducts() {
    try {
      const data = await api.get('/api/stock');
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function handleStockSave(id) {
    try {
      await api.patch(`/api/stock/${id}`, { stock: parseInt(editStock) });
      setEditingId(null);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/api/products', {
        code: formData.code,
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        commission_default: parseFloat(formData.commission_default),
      });
      setShowForm(false);
      setFormData({ code: '', name: '', price: '', stock: '', commission_default: '0' });
      fetchProducts();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar producto?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Cargando stock...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock</h1>
          <p className="text-slate-500 text-sm mt-0.5">{products.length} productos</p>
        </div>
        {hasRole('encargado', 'dueno') && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Nuevo producto
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Nuevo producto</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Código</label>
              <input
                value={formData.code}
                onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                required
                placeholder="SKU-001"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Nombre del producto"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Precio</label>
              <input
                type="number" min="0" step="0.01"
                value={formData.price}
                onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))}
                required
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Stock inicial</label>
              <input
                type="number" min="0"
                value={formData.stock}
                onChange={(e) => setFormData((f) => ({ ...f, stock: e.target.value }))}
                required
                placeholder="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Comisión por unidad ($)</label>
              <input
                type="number" min="0" step="0.01"
                value={formData.commission_default}
                onChange={(e) => setFormData((f) => ({ ...f, commission_default: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mt-3">
              <p className="text-red-700 text-xs">{formError}</p>
            </div>
          )}
          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Nivel</th>
              {hasRole('encargado', 'dueno', 'cajero') && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-slate-600 text-xs">{p.code}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                <td className="px-4 py-3 text-right text-slate-700">${parseFloat(p.price).toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number" min="0"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleStockSave(p.id)}
                        className="text-emerald-600 hover:text-emerald-800 font-bold text-sm"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-400 hover:text-slate-600 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                      onClick={() => { setEditingId(p.id); setEditStock(String(p.stock)); }}
                      title="Clic para editar"
                    >
                      {p.stock}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${LEVEL_CLASSES[p.stock_level]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_DOTS[p.stock_level]}`} />
                    {p.stock_level === 'green' ? 'OK' : p.stock_level === 'yellow' ? 'Bajo' : 'Crítico'}
                  </span>
                </td>
                {hasRole('encargado', 'dueno', 'cajero') && (
                  <td className="px-4 py-3 text-center">
                    {hasRole('encargado', 'dueno') && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
