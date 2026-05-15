import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import SaleDetailModal from '../components/SaleDetailModal';
import { showToast } from '../components/Toast';

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

export default function SalesHistory({ branchId } = {}) {
  const { hasRole } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '', payment_method: '' });
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // ── Credit note modal state ───────────────────────────────
  const [ncModal, setNcModal]   = useState(null); // { sale_id, client_id, amount }
  const [ncForm, setNcForm]     = useState({ reason: '', notes: '', number: '' });
  const [ncSaving, setNcSaving] = useState(false);
  const [ncError, setNcError]   = useState('');

  // ── Remito loading state ─────────────────────────────────
  const [remitoLoading, setRemitoLoading] = useState(null); // sale id being processed

  // ── Facturar modal state ──────────────────────────────────
  const [fiscalModal, setFiscalModal]   = useState(null);  // { sale } | null
  const [fiscalForm, setFiscalForm]     = useState({});
  const [fiscalSaving, setFiscalSaving] = useState(false); // 'create' | 'authorize' | false
  const [fiscalError, setFiscalError]   = useState('');
  const [fiscalCAE, setFiscalCAE]       = useState(null);  // { cae, cae_expiry } after authorize

  useEffect(() => {
    api.get('/api/payment-methods')
      .then(data => { if (Array.isArray(data)) setPaymentMethods(data.filter(m => m.active)); })
      .catch(() => {});
  }, []);

  async function fetchSales(overrideFilters) {
    setLoading(true);
    setError('');
    try {
      const f = overrideFilters ?? filters;
      const params = new URLSearchParams();
      if (f.from) params.set('from', f.from);
      // Incluir todo el día seleccionado sumando hasta las 23:59:59
      if (f.to)   params.set('to', `${f.to}T23:59:59`);
      if (f.payment_method) params.set('payment_method', f.payment_method);
      if (branchId) params.set('branch_id', branchId);
      const query = params.toString() ? `?${params}` : '';
      const data = await api.get(`/api/sales${query}`);
      setSales(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSales(); }, [branchId]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const displayedSales = sales.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const sellerName   = (s.users?.name ?? '').toLowerCase();
    const clientName   = (s.clients?.name ?? '').toLowerCase();
    const productNames = (s.details_json ?? [])
      .map((i) => (getProductName(i) ?? '').toLowerCase())
      .join(' ');
    const dateStr = new Date(s.date).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).toLowerCase();
    return sellerName.includes(q) || clientName.includes(q) || productNames.includes(q) || dateStr.includes(q);
  });

  const totalPages = Math.ceil(displayedSales.length / PAGE_SIZE);
  const pagedSales = displayedSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      // Register export log
      api.post('/api/export-logs', {
        type: 'ventas',
        filters: { from: filters.from, to: filters.to },
        row_count: displayedSales.length,
      }).catch(() => {});
    } catch (err) {
      setError(err.message);
    }
  }

  function openFiscalModal(e, sale) {
    e.stopPropagation();
    const total = parseFloat(sale.total || 0);
    const net   = parseFloat((total / 1.21).toFixed(2));
    const iva   = parseFloat((total - net).toFixed(2));
    setFiscalForm({
      receipt_type:         'FB',
      client_name:          sale.clients?.name || '',
      client_cuit:          '',
      client_iva_condition: 'consumidor_final',
      net_amount:           String(net),
      iva_amount:           String(iva),
      total_amount:         String(total),
      sale_id:              sale.id,
    });
    setFiscalError('');
    setFiscalCAE(null);
    setFiscalModal({ sale });
  }

  function handleFiscalAmountChange(field, value) {
    setFiscalForm(f => {
      const updated = { ...f, [field]: value };
      const net = parseFloat(updated.net_amount || 0);
      const iva = parseFloat(updated.iva_amount || 0);
      if (field === 'net_amount' || field === 'iva_amount') {
        updated.total_amount = (net + iva).toFixed(2);
      }
      return updated;
    });
  }

  async function handleFiscalCreate(andAuthorize = false) {
    const total = parseFloat(fiscalForm.total_amount);
    if (!total || total <= 0) { setFiscalError('El monto total debe ser mayor a 0.'); return; }
    if (fiscalForm.receipt_type === 'FA' && !fiscalForm.client_cuit.trim()) {
      setFiscalError('El CUIT del cliente es requerido para Factura A.');
      return;
    }
    setFiscalError('');
    setFiscalSaving(andAuthorize ? 'authorize' : 'create');
    try {
      const created = await api.post('/api/fiscal/receipts', {
        receipt_type:         fiscalForm.receipt_type,
        client_name:          fiscalForm.client_name,
        client_cuit:          fiscalForm.client_cuit,
        client_iva_condition: fiscalForm.client_iva_condition,
        sale_id:              fiscalForm.sale_id,
        net_amount:           parseFloat(fiscalForm.net_amount  || 0),
        iva_amount:           parseFloat(fiscalForm.iva_amount  || 0),
        total_amount:         total,
      });
      if (!andAuthorize) {
        showToast('Comprobante creado. Ir a Comprobantes Fiscales para autorizar.', 'success');
        setFiscalModal(null);
        return;
      }
      // Authorize in sequence
      const authorized = await api.post(`/api/fiscal/receipts/${created.id}/authorize`, {});
      setFiscalCAE({ cae: authorized.cae, cae_expiry: authorized.cae_expiry });
      showToast(`Autorizado · CAE ${authorized.cae}`, 'success');
    } catch (err) {
      setFiscalError(err.message || 'Error al procesar comprobante.');
    } finally {
      setFiscalSaving(false);
    }
  }

  async function handleGenerateNC(e, sale) {
    e.stopPropagation();
    setNcForm({ reason: '', notes: '', number: '' });
    setNcError('');
    setNcModal({ sale_id: sale.id, client_id: sale.client_id ?? sale.clients?.id ?? null, amount: parseFloat(sale.total) });
  }

  async function handleNcSubmit(e) {
    e.preventDefault();
    setNcError('');
    setNcSaving(true);
    try {
      await api.post('/api/credit-notes', {
        sale_id:   ncModal.sale_id,
        client_id: ncModal.client_id || undefined,
        type:      'credito',
        amount:    ncModal.amount,
        reason:    ncForm.reason,
        notes:     ncForm.notes,
        number:    ncForm.number,
      });
      setNcModal(null);
      showToast('Nota de crédito creada', 'success');
    } catch (err) {
      setNcError(err.message || 'Error al crear la nota de crédito.');
    } finally {
      setNcSaving(false);
    }
  }

  async function handleRemito(e, saleId) {
    e.stopPropagation();
    setRemitoLoading(saleId);
    try {
      const remito = await api.post(`/api/remitos/from-sale/${saleId}`, {});
      // Fetch PDF with auth token and open in new tab
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/remitos/${remito.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err.message || 'Error al generar remito.');
    } finally {
      setRemitoLoading(null);
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header — solo en página autónoma */}
      {!branchId && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
          <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Historial de Ventas</h1>
              <p className="text-blue-100 text-sm mt-1">{displayedSales.length} ventas encontradas</p>
            </div>
            {hasRole('encargado', 'dueno') && (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleExportCSV}
                  className="bg-white/25 border border-white/50 text-white text-sm px-3 py-2 rounded-xl hover:bg-white/35 font-semibold transition-all">
                  CSV
                </button>
                <button onClick={handleExportPDF}
                  className="bg-white text-blue-700 text-sm px-3 py-2 rounded-xl font-bold shadow-sm hover:bg-blue-50 transition-all">
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {branchId && hasRole('encargado', 'dueno') && (
        <div className="flex justify-end gap-2 mb-4">
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

      {/* KPI Summary cards */}
      {!loading && displayedSales.length > 0 && (() => {
        const totalAmt = displayedSales.reduce((s, x) => s + parseFloat(x.total ?? 0), 0);
        const totalComm = displayedSales.reduce((s, x) => {
          const c = getCommissionTotal(x);
          return s + (c ?? 0);
        }, 0);
        const hasComm = displayedSales.some(x => getCommissionTotal(x) !== null);
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm">
              <p className="text-xs text-slate-400 mb-1">Ventas</p>
              <p className="text-2xl font-bold text-slate-800">{displayedSales.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm">
              <p className="text-xs text-slate-400 mb-1">Total recaudado</p>
              <p className="text-2xl font-bold text-emerald-600">${totalAmt.toFixed(2)}</p>
            </div>
            {hasComm && (
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm col-span-2 sm:col-span-1">
                <p className="text-xs text-slate-400 mb-1">Comisiones totales</p>
                <p className="text-2xl font-bold text-blue-600">${totalComm.toFixed(2)}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Desde</label>
            <input type="date" value={filters.from}
              onChange={(e) => { const newF = { ...filters, from: e.target.value }; setFilters(newF); fetchSales(newF); }}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Hasta</label>
            <input type="date" value={filters.to}
              onChange={(e) => { const newF = { ...filters, to: e.target.value }; setFilters(newF); fetchSales(newF); }}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Buscar vendedor, cliente o producto</label>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {paymentMethods.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Medio de pago</label>
              <select value={filters.payment_method}
                onChange={(e) => { const newF = { ...filters, payment_method: e.target.value }; setFilters(newF); fetchSales(newF); }}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8">
                <option value="">Todos</option>
                {paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={() => { const empty = { from: '', to: '', payment_method: '' }; setFilters(empty); setSearch(''); fetchSales(empty); }}
            className="border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Limpiar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Sales list */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm">Cargando...</div>
      ) : displayedSales.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p className="text-slate-500 font-medium">Sin ventas en este período</p>
          <p className="text-slate-400 text-sm mt-1">Probá cambiando los filtros de fecha.</p>
        </div>
      ) : (
        <>
        <div className="flex flex-col gap-3">
          {pagedSales.map((sale) => {
            const commission = getCommissionTotal(sale);
            const items = sale.details_json ?? [];
            const productSummary = items.length > 0
              ? items.map((i) => `${getProductName(i) ?? i.product_id} x${i.qty}`).join(', ')
              : '—';

            return (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className={`bg-white border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer hover:border-indigo-300 ${
                  sale.status === 'cancelled' ? 'border-red-200 opacity-70' : 'border-slate-200'
                }`}
              >
                {/* Card header */}
                <div className="px-4 py-3 sm:px-5 flex items-start sm:items-center justify-between gap-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      sale.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {sale.users?.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-slate-800 text-sm">{sale.users?.name ?? sale.seller_id}</span>
                        {sale.clients?.name && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{sale.clients.name}</span>
                        )}
                        {sale.status === 'cancelled' && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-semibold">Cancelada</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(sale.date).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}
                        {new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-base ${sale.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      ${parseFloat(sale.total).toFixed(2)}
                    </p>
                    {sale.payment_method && (
                      <p className="text-xs text-slate-500 mt-0.5 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                        {sale.payment_method}
                      </p>
                    )}
                    {commission !== null && commission > 0 && (
                      <p className="text-xs text-emerald-600 font-medium">+${commission.toFixed(2)} comis.</p>
                    )}
                    {sale.discount_value > 0 && (
                      <p className="text-xs text-red-500">
                        {sale.discount_type === 'percent' ? `-${sale.discount_value}%` : `-$${parseFloat(sale.discount_value).toFixed(2)}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Product summary + action buttons */}
                <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 truncate flex-1" title={productSummary}>{productSummary}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasRole('encargado', 'dueno') && sale.status !== 'cancelled' && (
                      <button
                        onClick={(e) => handleGenerateNC(e, sale)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-semibold border border-amber-200 hover:bg-amber-50 px-2 py-0.5 rounded-lg transition-colors">
                        NC
                      </button>
                    )}
                    {sale.status !== 'cancelled' && (
                      <button
                        onClick={(e) => handleRemito(e, sale.id)}
                        disabled={remitoLoading === sale.id}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 hover:bg-indigo-50 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-50">
                        {remitoLoading === sale.id ? '…' : 'Remito'}
                      </button>
                    )}
                    {hasRole('encargado', 'dueno') && sale.status !== 'cancelled' && (
                      <button
                        onClick={(e) => openFiscalModal(e, sale)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 hover:bg-blue-50 px-2 py-0.5 rounded-lg transition-colors">
                        Facturar
                      </button>
                    )}
                    <svg className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayedSales.length)}</span> de <span className="font-semibold text-slate-700">{displayedSales.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, i) => item === '…'
                  ? <span key={`sep-${i}`} className="px-1 text-slate-400 text-sm">…</span>
                  : <button key={item} onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${page === item ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {item}
                    </button>
                )
              }
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onCancelled={fetchSales}
        />
      )}

      {/* ── Fiscal Modal ─────────────────────────────────────── */}
      {fiscalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={e => { if (!fiscalSaving && e.target === e.currentTarget) setFiscalModal(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-700 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Generar Comprobante Fiscal</h3>
              <button onClick={() => setFiscalModal(null)} disabled={!!fiscalSaving} className="text-white/70 hover:text-white text-xl leading-none disabled:opacity-40">&times;</button>
            </div>

            {fiscalCAE ? (
              <div className="p-6 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-emerald-700 font-bold text-base mb-1">Comprobante autorizado</p>
                  <p className="text-emerald-600 text-sm">CAE: <span className="font-mono font-bold">{fiscalCAE.cae}</span></p>
                  {fiscalCAE.cae_expiry && (
                    <p className="text-emerald-500 text-xs mt-1">Vence: {new Date(fiscalCAE.cae_expiry).toLocaleDateString('es-AR')}</p>
                  )}
                </div>
                <button onClick={() => setFiscalModal(null)}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {fiscalError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{fiscalError}</div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                    <select value={fiscalForm.receipt_type}
                      onChange={e => setFiscalForm(f => ({ ...f, receipt_type: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="FB">FB — Factura B</option>
                      <option value="FA">FA — Factura A</option>
                      <option value="FC">FC — Factura C</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Condición IVA cliente</label>
                    <select value={fiscalForm.client_iva_condition}
                      onChange={e => setFiscalForm(f => ({ ...f, client_iva_condition: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="consumidor_final">Consumidor Final</option>
                      <option value="responsable_inscripto">Resp. Inscripto</option>
                      <option value="monotributo">Monotributo</option>
                      <option value="exento">Exento</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
                  <input type="text" value={fiscalForm.client_name}
                    onChange={e => setFiscalForm(f => ({ ...f, client_name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del cliente" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    CUIT del cliente {fiscalForm.receipt_type === 'FA' && <span className="text-red-500">*</span>}
                  </label>
                  <input type="text" value={fiscalForm.client_cuit}
                    onChange={e => setFiscalForm(f => ({ ...f, client_cuit: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="20-12345678-3" maxLength={15} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Neto</label>
                    <input type="number" min="0" step="0.01" value={fiscalForm.net_amount}
                      onChange={e => handleFiscalAmountChange('net_amount', e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">IVA</label>
                    <input type="number" min="0" step="0.01" value={fiscalForm.iva_amount}
                      onChange={e => handleFiscalAmountChange('iva_amount', e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Total</label>
                    <input type="number" min="0" step="0.01" value={fiscalForm.total_amount}
                      onChange={e => setFiscalForm(f => ({ ...f, total_amount: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setFiscalModal(null)} disabled={!!fiscalSaving}
                    className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40">
                    Cancelar
                  </button>
                  <button type="button" onClick={() => handleFiscalCreate(false)}
                    disabled={!!fiscalSaving}
                    className="flex-1 border border-blue-300 text-blue-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-40">
                    {fiscalSaving === 'create' ? 'Creando…' : 'Solo crear'}
                  </button>
                  <button type="button" onClick={() => handleFiscalCreate(true)}
                    disabled={!!fiscalSaving}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {fiscalSaving === 'authorize' ? 'Procesando…' : 'Crear y Autorizar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NC Modal ──────────────────────────────────────────── */}
      {ncModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setNcModal(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-700 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Generar Nota de Crédito</h3>
              <button onClick={() => setNcModal(null)} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleNcSubmit} className="p-5 space-y-4">
              {ncError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{ncError}</div>
              )}
              <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-sm text-slate-700">
                <span className="font-medium">Monto:</span> ${parseFloat(ncModal.amount).toFixed(2)}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">N&#xBA; de nota</label>
                <input type="text" value={ncForm.number}
                  onChange={e => setNcForm(f => ({ ...f, number: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="NC-001" maxLength={50} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo</label>
                <input type="text" value={ncForm.reason}
                  onChange={e => setNcForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Devolución de mercadería" maxLength={200} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notas internas</label>
                <textarea rows={2} value={ncForm.notes}
                  onChange={e => setNcForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Opcional..." maxLength={500} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setNcModal(null)} disabled={ncSaving}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={ncSaving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {ncSaving ? 'Creando…' : 'Crear nota de crédito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
