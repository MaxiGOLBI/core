import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

// ── Constants ─────────────────────────────────────────────────
const RECEIPT_TYPES = ['FA', 'FB', 'FC', 'NCA', 'NCB', 'NCC', 'NDA', 'NDB'];

const IVA_CONDITIONS = [
  { value: 'consumidor_final',       label: 'Consumidor Final' },
  { value: 'responsable_inscripto',  label: 'Responsable Inscripto' },
  { value: 'monotributo',            label: 'Monotributo' },
  { value: 'exento',                 label: 'Exento' },
];

const STATUS_BADGE = {
  pending:    'bg-amber-100 text-amber-700',
  authorized: 'bg-emerald-100 text-emerald-700',
  rejected:   'bg-red-100 text-red-700',
};
const STATUS_LABEL = {
  pending:    'Pendiente',
  authorized: 'Autorizado',
  rejected:   'Rechazado',
};

const EMPTY_FORM = {
  receipt_type: 'FB', client_id: '', client_name: '', client_cuit: '',
  client_iva_condition: 'consumidor_final', sale_id: '',
  net_amount: '', iva_amount: '', total_amount: '', point_of_sale: 1,
};

const EMPTY_CONFIG = { cuit: '', point_of_sale: 1, integration_type: '', afip_environment: 'homologacion', cert_pem: '', key_pem: '' };

// ── Helpers ───────────────────────────────────────────────────
function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}
function today() {
  return new Date().toISOString().split('T')[0];
}

// ── Page ──────────────────────────────────────────────────────
export default function FiscalReceiptsPage() {
  const { hasRole } = useAuth();
  const isDueno = hasRole('dueno');

  const [tab, setTab] = useState('list'); // 'list' | 'config'

  // List state
  const [receipts, setReceipts]   = useState([]);
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Filters
  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom]     = useState(monthStart());
  const [filterTo, setFilterTo]         = useState(today());

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  // Authorize loading
  const [authorizingId, setAuthorizingId] = useState(null);

  // Config tab
  const [config, setConfig]         = useState(EMPTY_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving]   = useState(false);
  const [configError, setConfigError]     = useState('');
  const [hasCert, setHasCert]             = useState(false);
  const [hasKey, setHasKey]               = useState(false);

  // Load clients once
  useEffect(() => {
    api.get('/api/clients')
      .then(d => setClients(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Load config when tab switches to 'config'
  useEffect(() => {
    if (tab !== 'config' || !isDueno) return;
    setConfigLoading(true);
    api.get('/api/fiscal/config')
      .then(d => {
        setConfig({ cuit: d.cuit || '', point_of_sale: d.point_of_sale || 1, integration_type: d.integration_type || '', afip_environment: d.afip_environment || 'homologacion', cert_pem: '', key_pem: '' });
        setHasCert(!!d.has_cert);
        setHasKey(!!d.has_key);
      })
      .catch(err => setConfigError(err.message))
      .finally(() => setConfigLoading(false));
  }, [tab, isDueno]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterType)   params.set('receipt_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterFrom)   params.set('from', filterFrom);
      if (filterTo)     params.set('to', filterTo);
      const data = await api.get(`/api/fiscal/receipts?${params}`);
      setReceipts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar comprobantes.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterFrom, filterTo]);

  useEffect(() => { if (tab === 'list') load(); }, [load, tab]);

  // Auto-calculate total when net/iva change
  function handleAmountChange(field, value) {
    setForm(f => {
      const updated = { ...f, [field]: value };
      const net = parseFloat(updated.net_amount || 0);
      const iva = parseFloat(updated.iva_amount || 0);
      if (field === 'net_amount' || field === 'iva_amount') {
        updated.total_amount = (net + iva).toFixed(2);
      }
      return updated;
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    const total = parseFloat(form.total_amount);
    if (!total || total <= 0) { setFormError('El monto total debe ser mayor a 0.'); return; }
    setSaving(true);
    try {
      await api.post('/api/fiscal/receipts', {
        receipt_type:         form.receipt_type,
        client_id:            form.client_id            || undefined,
        client_name:          form.client_name,
        client_cuit:          form.client_cuit,
        client_iva_condition: form.client_iva_condition,
        sale_id:              form.sale_id              || undefined,
        net_amount:           parseFloat(form.net_amount    || 0),
        iva_amount:           parseFloat(form.iva_amount    || 0),
        total_amount:         total,
        point_of_sale:        parseInt(form.point_of_sale || 1),
      });
      showToast('Comprobante creado', 'success');
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Error al crear comprobante.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAuthorize(id) {
    setAuthorizingId(id);
    try {
      await api.post(`/api/fiscal/receipts/${id}/authorize`, {});
      showToast('Comprobante autorizado', 'success');
      load();
    } catch (err) {
      // Backend returns 503 while AFIP integration is pending — show friendly message
      showToast(err.message || 'Autorización AFIP no disponible aún', 'error');
    } finally {
      setAuthorizingId(null);
    }
  }

  async function handleConfigSave(e) {
    e.preventDefault();
    setConfigError('');
    setConfigSaving(true);
    try {
      const payload = {
        cuit:             config.cuit,
        point_of_sale:    parseInt(config.point_of_sale || 1),
        integration_type: config.integration_type || null,
        afip_environment: config.afip_environment || 'homologacion',
      };
      if (config.cert_pem.trim()) payload.cert_pem = config.cert_pem.trim();
      if (config.key_pem.trim())  payload.key_pem  = config.key_pem.trim();
      const saved = await api.put('/api/fiscal/config', payload);
      setHasCert(!!saved.has_cert);
      setHasKey(!!saved.has_key);
      setConfig(c => ({ ...c, cert_pem: '', key_pem: '' }));
      showToast('Configuración guardada', 'success');
    } catch (err) {
      setConfigError(err.message || 'Error al guardar configuración.');
    } finally {
      setConfigSaving(false);
    }
  }

  const INPUT  = 'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const SELECT = INPUT;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Comprobantes Fiscales</h1>
            <p className="text-blue-100 text-sm mt-1">Facturas y notas de crédito/débito fiscales</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Tabs */}
            <div className="flex gap-1 bg-white/20 rounded-xl p-1">
              <button onClick={() => setTab('list')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${tab === 'list' ? 'bg-white text-blue-700' : 'text-white/80 hover:text-white'}`}>
                Comprobantes
              </button>
              {isDueno && (
                <button onClick={() => setTab('config')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${tab === 'config' ? 'bg-white text-blue-700' : 'text-white/80 hover:text-white'}`}>
                  Configuración
                </button>
              )}
            </div>
            {tab === 'list' && (
              <button onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowModal(true); }}
                className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all">
                + Nuevo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Config tab ── */}
      {tab === 'config' && isDueno && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-lg">
          <h2 className="font-bold text-slate-700 text-base mb-4">Configuración AFIP / ARCA</h2>
          {configLoading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <form onSubmit={handleConfigSave} className="space-y-4">
              {configError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{configError}</div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                La integración ARCA/AFIP (obtención de CAE) está pendiente de configuración. Podés guardar los datos fiscales ahora y activarla cuando esté disponible.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CUIT de la empresa</label>
                <input type="text" value={config.cuit}
                  onChange={e => setConfig(c => ({ ...c, cuit: e.target.value }))}
                  className={INPUT} placeholder="20-12345678-3" maxLength={15} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Punto de Venta</label>
                <input type="number" min="1" max="9999" value={config.point_of_sale}
                  onChange={e => setConfig(c => ({ ...c, point_of_sale: e.target.value }))}
                  className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de integración</label>
                <select value={config.integration_type}
                  onChange={e => setConfig(c => ({ ...c, integration_type: e.target.value }))} className={SELECT}>
                  <option value="">Sin configurar</option>
                  <option value="wsfe_propio">WSFE Propio (certificado digital)</option>
                  <option value="servicio_tercero">Servicio de terceros (API)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Entorno AFIP</label>
                <select value={config.afip_environment}
                  onChange={e => setConfig(c => ({ ...c, afip_environment: e.target.value }))} className={SELECT}>
                  <option value="homologacion">Homologación (pruebas)</option>
                  <option value="produccion">Producción</option>
                </select>
              </div>

              {/* Certificate fields — only relevant for wsfe_propio */}
              {config.integration_type === 'wsfe_propio' && (
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Certificado digital AFIP</p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Certificado (.crt / .pem)
                      {hasCert && <span className="ml-2 text-emerald-600 font-normal">✓ cargado</span>}
                    </label>
                    <input
                      type="file"
                      accept=".pem,.crt,.cer,.txt"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setConfig(c => ({ ...c, cert_pem: ev.target.result }));
                        reader.readAsText(file);
                      }}
                      className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {config.cert_pem && (
                      <p className="mt-1 text-xs text-slate-400">{config.cert_pem.length} caracteres cargados</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Clave privada (.key / .pem)
                      {hasKey && <span className="ml-2 text-emerald-600 font-normal">✓ cargada</span>}
                    </label>
                    <input
                      type="file"
                      accept=".pem,.key,.txt"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setConfig(c => ({ ...c, key_pem: ev.target.result }));
                        reader.readAsText(file);
                      }}
                      className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {config.key_pem && (
                      <p className="mt-1 text-xs text-slate-400">{config.key_pem.length} caracteres cargados</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Los archivos se guardan cifrados en la base de datos. Dejá los campos vacíos para conservar el certificado existente.
                  </p>
                </div>
              )}

              <button type="submit" disabled={configSaving}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {configSaving ? 'Guardando…' : 'Guardar configuración'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── List tab ── */}
      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {RECEIPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="authorized">Autorizado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={load}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              Filtrar
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {receipts.length === 0 ? (
                <div className="px-4 py-12 text-center text-slate-400 text-sm">No hay comprobantes en este período</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nº</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CUIT</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Neto</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">IVA</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CAE</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receipts.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-700 font-mono">
                              {r.receipt_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {String(r.point_of_sale).padStart(4, '0')}-{String(r.number).padStart(8, '0')}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-[140px] truncate">
                            {r.client_name || r.client_name_rel || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs font-mono">{r.client_cuit || '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{fmtMoney(r.net_amount)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{fmtMoney(r.iva_amount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtMoney(r.total_amount)}</td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">
                            {r.cae ? (
                              <span title={`Vence: ${fmtDate(r.cae_expiry)}`} className="text-emerald-600">{r.cae}</span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-500'}`}>
                              {STATUS_LABEL[r.status] || r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(r.created_at)}</td>
                          <td className="px-4 py-3">
                            {r.status === 'pending' && (
                              <button
                                onClick={() => handleAuthorize(r.id)}
                                disabled={authorizingId === r.id}
                                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold border border-emerald-200 hover:bg-emerald-50 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                                {authorizingId === r.id ? '…' : 'Autorizar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Create Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-700 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-white text-base">Nuevo Comprobante Fiscal</h3>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo *</label>
                  <select value={form.receipt_type} onChange={e => setForm(f => ({ ...f, receipt_type: e.target.value }))} className={SELECT}>
                    {RECEIPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Punto de Venta</label>
                  <input type="number" min="1" value={form.point_of_sale}
                    onChange={e => setForm(f => ({ ...f, point_of_sale: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente (opcional)</label>
                <select value={form.client_id} onChange={e => {
                  const c = clients.find(x => x.id === e.target.value);
                  setForm(f => ({ ...f, client_id: e.target.value, client_name: c?.name || f.client_name }));
                }} className={SELECT}>
                  <option value="">Sin cliente registrado</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre / Razón social</label>
                  <input type="text" value={form.client_name}
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={INPUT} placeholder="Consumidor Final" maxLength={200} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">CUIT</label>
                  <input type="text" value={form.client_cuit}
                    onChange={e => setForm(f => ({ ...f, client_cuit: e.target.value }))} className={INPUT} placeholder="20-00000000-0" maxLength={15} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Condición IVA</label>
                <select value={form.client_iva_condition}
                  onChange={e => setForm(f => ({ ...f, client_iva_condition: e.target.value }))} className={SELECT}>
                  {IVA_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ID de Venta (opcional)</label>
                <input type="text" value={form.sale_id}
                  onChange={e => setForm(f => ({ ...f, sale_id: e.target.value }))} className={INPUT} placeholder="UUID de la venta" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Neto</label>
                  <input type="number" min="0" step="0.01" value={form.net_amount}
                    onChange={e => handleAmountChange('net_amount', e.target.value)} className={INPUT} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">IVA</label>
                  <input type="number" min="0" step="0.01" value={form.iva_amount}
                    onChange={e => handleAmountChange('iva_amount', e.target.value)} className={INPUT} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Total *</label>
                  <input type="number" min="0.01" step="0.01" required value={form.total_amount}
                    onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} className={INPUT} placeholder="0.00" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Creando…' : 'Crear comprobante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
