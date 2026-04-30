import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import SalesHistory from './SalesHistory';
import StockList from './StockList';

const TABS = [
  { key: 'tickets',   label: 'Tickets' },
  { key: 'ventas',  label: 'Ventas' },
  { key: 'stock',   label: 'Stock' },
];

const TABLE_STATUS_COLORS = {
  open:    'border-indigo-300 bg-indigo-50',
  ready:   'border-emerald-300 bg-emerald-50',
  paying:  'border-amber-300 bg-amber-50',
};
const TABLE_STATUS_LABELS = {
  open:   'Abierta',
  ready:  'Lista',
  paying: 'Pagando',
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
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border-2 p-4 ${TABLE_STATUS_COLORS[t.status] ?? 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 text-lg">Mesa {t.table_number}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/70 text-slate-600">
                {TABLE_STATUS_LABELS[t.status] ?? t.status}
              </span>
            </div>
            {t.seller?.name && (
              <p className="text-xs text-slate-500 mb-1">Vendedor: {t.seller.name}</p>
            )}
            {t.client?.name && (
              <p className="text-xs text-slate-500 mb-1">Cliente: {t.client.name}</p>
            )}
            <div className="mt-2 space-y-0.5">
              {(t.table_items ?? []).map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-600">
                  <span className="truncate">{item.products?.name ?? 'Producto'}</span>
                  <span className="ml-2 text-slate-400">x{item.qty}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BranchDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [tab, setTab]       = useState('mesas');
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
      <div className="px-6 pt-6 pb-0">
        <button
          onClick={() => navigate('/branches')}
          className="text-sm text-indigo-600 hover:underline mb-3 inline-flex items-center gap-1"
        >
          ← Sucursales
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{branchName || 'Sucursal'}</h1>
        <p className="text-slate-400 text-sm mt-0.5 mb-4">Vista completa de la sucursal</p>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-indigo-500 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de cada tab */}
      {tab === 'mesas'  && <MesasTab branchId={id} />}
      {tab === 'ventas' && <SalesHistory branchId={id} />}
      {tab === 'stock'  && <StockList branchId={id} />}
    </div>
  );
}
