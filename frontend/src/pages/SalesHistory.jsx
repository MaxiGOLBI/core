import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function getCommissionTotal(sale) {
  if (!sale.details_json || !Array.isArray(sale.details_json)) return null;
  return sale.details_json.reduce((sum, item) => {
    const comm =
      typeof item.commission === 'number' ? item.commission :
      typeof item.commission_per_unit === 'number' ? item.commission_per_unit : 0;
    return sum + comm * (item.qty ?? 1);
  }, 0);
}

function getProductName(item) {
  return item.product_name ?? item.name ?? null;
}

export default function SalesHistory() {
  const { hasRole } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  async function fetchSales() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const query = params.toString() ? `?${params}` : '';
      const data = await api.get(`/api/sales${query}`);
      setSales(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSales(); }, []);

  const displayedSales = sales.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const sellerName = (s.users?.name ?? '').toLowerCase();
    const clientName = (s.clients?.name ?? '').toLowerCase();
    const productNames = (s.details_json ?? [])
      .map((i) => (getProductName(i) ?? '').toLowerCase())
      .join(' ');
    return sellerName.includes(q) || clientName.includes(q) || productNames.includes(q);
  });

  async function handleExportCSV() {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/sales/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ventas.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleExportPDF() {
    const printWindow = window.open('', '_blank');
    const rows = displayedSales.map((s) => {
      const items = s.details_json ?? [];
      const commission = getCommissionTotal(s);
      const productos = items.length > 0
        ? items.map((i) => `${getProductName(i) ?? i.product_id} x${i.qty}`).join(', ')
        : '-';
      return `<tr>
        <td>${new Date(s.date).toLocaleDateString('es-AR')}</td>
        <td>${s.users?.name ?? s.seller_id}</td>
        <td>${s.clients?.name ?? '-'}</td>
        <td>${productos}</td>
        <td>$${parseFloat(s.total).toFixed(2)}</td>
        <td>${commission !== null ? '$' + commission.toFixed(2) : '-'}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Historial de Ventas</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { color: #666; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; text-align: left; padding: 6px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h1>Historial de Ventas</h1>
      <p>${displayedSales.length} ventas</p>
      <table>
        <thead><tr>
          <th>Fecha</th><th>Vendedor</th><th>Cliente</th>
          <th>Productos</th><th>Total</th><th>Comision</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de Ventas</h1>
          <p className="text-slate-500 text-sm mt-0.5">{displayedSales.length} ventas encontradas</p>
        </div>
        {hasRole('encargado', 'dueno') && (
          <div className="flex gap-2">
            <button onClick={handleExportCSV}
              className="border border-slate-200 text-slate-600 text-sm px-3 py-2 rounded-lg hover:bg-slate-50 font-medium transition-colors">
              CSV
            </button>
            <button onClick={handleExportPDF}
              className="border border-slate-200 text-slate-600 text-sm px-3 py-2 rounded-lg hover:bg-slate-50 font-medium transition-colors">
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Desde</label>
            <input type="date" value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Hasta</label>
            <input type="date" value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Buscar por vendedor, cliente o producto</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-60" />
          </div>
          <button onClick={fetchSales}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Filtrar
          </button>
          {(filters.from || filters.to || search) && (
            <button onClick={() => { setFilters({ from: '', to: '' }); setSearch(''); }}
              className="text-slate-400 hover:text-slate-700 text-sm transition-colors">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendedor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Productos</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Comision</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Cargando...</td></tr>
            ) : displayedSales.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Sin ventas en este periodo.</td></tr>
            ) : (
              displayedSales.flatMap((sale) => {
                const commission = getCommissionTotal(sale);
                const items = sale.details_json ?? [];
                const isExpanded = expandedId === sale.id;
                const productSummary = items.length > 0
                  ? items.map((i) => `${getProductName(i) ?? i.product_id} x${i.qty}`).join(', ')
                  : '-';

                const rows = [
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(sale.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{sale.users?.name ?? sale.seller_id}</td>
                    <td className="px-4 py-3 text-slate-500">{sale.clients?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={productSummary}>
                      {productSummary}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ${parseFloat(sale.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {commission !== null ? `$${commission.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {items.length > 0 && (
                        <button onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                          className="text-indigo-500 hover:text-indigo-700 text-xs font-medium transition-colors">
                          {isExpanded ? 'Ocultar' : 'Ver'}
                        </button>
                      )}
                    </td>
                  </tr>,
                ];

                if (isExpanded && items.length > 0) {
                  rows.push(
                    <tr key={`${sale.id}-detail`} className="bg-indigo-50/60">
                      <td colSpan={7} className="px-6 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-indigo-100">
                              <th className="text-left pb-2 font-semibold">Producto</th>
                              <th className="text-center pb-2 font-semibold">Cantidad</th>
                              <th className="text-right pb-2 font-semibold">Precio unit.</th>
                              <th className="text-right pb-2 font-semibold">Descuento</th>
                              <th className="text-right pb-2 font-semibold">Subtotal</th>
                              <th className="text-right pb-2 font-semibold">Comision</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-indigo-100">
                            {items.map((item, idx) => {
                              const base = item.qty * item.unit_price;
                              const disc = item.discount_type === 'percent'
                                ? base * ((item.discount_value ?? 0) / 100)
                                : (item.discount_value ?? 0);
                              const subtotal = base - disc;
                              const comm =
                                typeof item.commission === 'number' ? item.commission :
                                typeof item.commission_per_unit === 'number' ? item.commission_per_unit : null;
                              return (
                                <tr key={idx}>
                                  <td className="py-1.5 text-slate-700 font-medium">
                                    {getProductName(item) ?? item.product_id}
                                  </td>
                                  <td className="py-1.5 text-center text-slate-600">{item.qty}</td>
                                  <td className="py-1.5 text-right text-slate-600">${parseFloat(item.unit_price).toFixed(2)}</td>
                                  <td className="py-1.5 text-right text-slate-500">
                                    {item.discount_value
                                      ? `${item.discount_value}${item.discount_type === 'percent' ? '%' : '$'}`
                                      : '-'}
                                  </td>
                                  <td className="py-1.5 text-right font-semibold text-slate-800">${subtotal.toFixed(2)}</td>
                                  <td className="py-1.5 text-right text-slate-600">
                                    {comm !== null ? `$${(comm * item.qty).toFixed(2)}` : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  );
                }

                return rows;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}