import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function PriceList() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  async function fetchProducts(searchParam = search, catId = filterCategory) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParam) params.set('search', searchParam);
      if (catId)       params.set('category_id', catId);
      const q = params.toString() ? `?${params}` : '';
      const data = await api.get(`/api/prices${q}`);
      setProducts(Array.isArray(data) ? data : []);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchProducts();
    api.get('/api/categories')
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">Lista de Precios</h1>
          <p className="text-blue-100 text-sm mt-1">{products.length} productos disponibles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); fetchProducts(); }} className="flex gap-2 flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit"
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Buscar
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); fetchProducts('', filterCategory); }}
              className="text-slate-400 hover:text-slate-700 text-sm px-2">✕</button>
          )}
        </form>
        {categories.length > 0 && (
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); fetchProducts(search, e.target.value); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
          <p className="text-slate-500 font-medium">No se encontraron productos</p>
          {(search || filterCategory) && (
            <button onClick={() => { setSearch(''); setFilterCategory(''); fetchProducts('', ''); }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                {p.categories?.name && (
                  <span className="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium mb-2">
                    {p.categories.name}
                  </span>
                )}
                <h3 className="font-semibold text-slate-900 text-sm leading-snug">{p.name}</h3>
                {p.code && <p className="text-xs text-slate-400 mt-0.5 font-mono">{p.code}</p>}
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 flex items-center justify-between">
                <span className="text-white/80 text-xs font-medium">Precio</span>
                <span className="text-white font-bold text-lg">${parseFloat(p.price).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
