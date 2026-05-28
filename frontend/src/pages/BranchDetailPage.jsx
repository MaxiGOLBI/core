import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import SalesHistory from './SalesHistory';
import StockList, { CategoriesTab } from './StockList';

const TABS = [
  { key: 'tickets',    label: 'Tickets' },
  { key: 'ventas',     label: 'Ventas' },
  { key: 'stock',      label: 'Stock' },
  { key: 'categorias', label: 'Categorías' },
];

const TABLE_STATUS_COLORS = {
  open:      'border-l-4 border-indigo-400 bg-indigo-50',
  ready:     'border-l-4 border-emerald-400 bg-emerald-50',
  paying:    'border-l-4 border-amber-400 bg-amber-50',
  confirmed: 'border-l-4 border-violet-400 bg-violet-50',
  completed: 'border-l-4 border-slate-300 bg-slate-50',
  cancelled: 'border-l-4 border-red-300 bg-red-50',
};
const TABLE_STATUS_LABELS = {
  open:      'Abierta',
  ready:     'Lista',
  paying:    'Pagando',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};
const TABLE_STATUS_BADGE = {
  open:      'bg-indigo-100 text-indigo-700',
  ready:     'bg-emerald-100 text-emerald-700',
  paying:    'bg-amber-100 text-amber-700',
  confirmed: 'bg-violet-100 text-violet-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
};

function MesasTab({ branchId }) {
  const [tables, setTables]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    async function fetchTables() {
      setLoading(true);
      try {
        const data = await api.get(`/api/tables?branch_id=${branchId}`);
        setTables(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTables();
  }, [branchId]);

  if (loading) return <p className="text-slate-400 text-sm p-6">Cargando mesas...</p>;
  if (error)   return <p className="text-red-500 text-sm p-6">{error}</p>;
  if (tables.length === 0) {
    return (
      <p className="text-slate-400 text-sm p-6 text-center py-16">
        No hay mesas abiertas en esta sucursal.
      </p>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl shadow-sm overflow-hidden ${TABLE_STATUS_COLORS[t.status] ?? 'border-l-4 border-slate-200 bg-white'}`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <span className="font-bold text-slate-800 text-sm leading-tight">Ticket #{t.table_number}</span>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${TABLE_STATUS_BADGE[t.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {TABLE_STATUS_LABELS[t.status] ?? t.status}
                </span>
              </div>
              {t.seller?.name && (
                <p className="text-xs text-slate-500 mb-0.5">
                  <span className="text-slate-400">Vendedor:</span> {t.seller.name}
                </p>
              )}
              {t.client?.name && (
                <p className="text-xs text-slate-500 mb-0.5">
                  <span className="text-slate-400">Cliente:</span> {t.client.name}
                </p>
              )}
              {(t.table_items ?? []).length > 0 && (
                <div className="mt-2 pt-2 border-t border-black/5 space-y-0.5">
                  {(t.table_items ?? []).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-600 truncate">{item.products?.name ?? 'Producto'}</span>
                      <span className="ml-2 font-medium text-indigo-500">×{item.qty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesTabWrapper() {
  const [categories, setCategories] = useState([]);
  async function load() {
    try { const data = await api.get('/api/categories'); setCategories(data); } catch {}
  }
  useEffect(() => { load(); }, []);
  return <div className="p-4 sm:p-6"><CategoriesTab categories={categories} onRefresh={load} /></div>;
}

export default function BranchDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [tab, setTab]       = useState('tickets');
  const [branchName, setBranchName] = useState('');

  useEffect(() => {
    api.get(`/api/branches`)
      .then((list) => {
        const branch = list.find((b) => b.id === id);
        if (branch) setBranchName(branch.name);
      })
      .catch(() => {});
  }, [id]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
        <button
          onClick={() => navigate('/branches')}
          className="mb-4 inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          ← Sucursales
        </button>
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-0 shadow-lg">
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
          <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative">
            <h1 className="text-2xl font-bold text-white">{branchName || 'Sucursal'}</h1>
            <p className="text-blue-100 text-sm mt-1">Vista completa de la sucursal</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de cada tab */}
      {tab === 'tickets'    && <MesasTab branchId={id} />}
      {tab === 'ventas'     && <SalesHistory branchId={id} />}
      {tab === 'stock'      && <StockList branchId={id} />}
      {tab === 'categorias' && <CategoriesTabWrapper />}
    </div>
  );
}
