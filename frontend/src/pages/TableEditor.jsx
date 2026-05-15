import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function TableEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [table, setTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [tbl, prods, cls] = await Promise.all([
          api.get(`/api/tables/${id}`),
          api.get('/api/products'),
          api.get('/api/clients'),
        ]);
        setTable(tbl);
        setProducts(prods);
        setClients(cls);
        setItems(tbl.table_items || []);
        setSelectedClient(tbl.client_id || '');
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [id]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { product_id: '', qty: 1, unit_price: 0, discount_value: 0, discount_type: 'fixed', comment: '' },
    ]);
  }

  function updateItem(index, field, value) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-fill unit price when product changes
      if (field === 'product_id') {
        const product = products.find((p) => p.id === value);
        if (product) updated[index].unit_price = product.price;
      }
      return updated;
    });
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/tables/${id}`, { items });
      navigate('/tables');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const total = items.reduce((sum, item) => {
    const base = (item.qty || 0) * (item.unit_price || 0);
    const disc =
      item.discount_type === 'percent'
        ? base * ((item.discount_value || 0) / 100)
        : item.discount_value || 0;
    return sum + base - disc;
  }, 0);

  if (!table) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Cargando...</div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/tables')}
          className="text-slate-400 hover:text-slate-700 transition-colors text-lg leading-none"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mesa {table.table_number}</h1>
          <p className="text-slate-500 text-sm">Editando productos de la mesa</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Productos</h2>
          <button
            onClick={addItem}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            + Agregar producto
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-slate-400 italic py-4 text-center">Sin productos. Agrega uno arriba.</p>
        )}

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-slate-50 rounded-lg">
              <div className="col-span-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Producto</label>
                <select
                  value={item.product_id}
                  onChange={(e) => updateItem(i, 'product_id', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Cant.</label>
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 1)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Precio</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1">Descuento</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="0"
                    value={item.discount_value}
                    onChange={(e) => updateItem(i, 'discount_value', parseFloat(e.target.value) || 0)}
                    className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={item.discount_type}
                    onChange={(e) => updateItem(i, 'discount_type', e.target.value)}
                    className="border border-slate-300 rounded-lg px-1.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="fixed">$</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
              <div className="col-span-1 flex justify-end pb-1">
                <button
                  onClick={() => removeItem(i)}
                  className="text-slate-400 hover:text-red-500 transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">Total</span>
            <span className="font-bold text-slate-900 text-xl">${total.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => navigate('/tables')}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
