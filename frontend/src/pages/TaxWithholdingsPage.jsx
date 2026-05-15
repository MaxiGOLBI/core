import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

// ── Constants ─────────────────────────────────────────────────
const AGENCIES = [
  'AFIP',
  'IIBB_BUENOS_AIRES',
  'IIBB_CABA',
  'IIBB_CORDOBA',
  'IIBB_SANTA_FE',
  'OTRO',
];

const AGENCY_LABEL = {
  AFIP:              'AFIP',
  IIBB_BUENOS_AIRES: 'IIBB Buenos Aires',
  IIBB_CABA:         'IIBB CABA',
  IIBB_CORDOBA:      'IIBB Córdoba',
  IIBB_SANTA_FE:     'IIBB Santa Fe',
  OTRO:              'Otro',
};

const TYPE_BADGE = {
  retencion:  'bg-red-100 text-red-700',
  percepcion: 'bg-violet-100 text-violet-700',
};
const TYPE_LABEL = {
  retencion:  'Retención',
  percepcion: 'Percepción',
};

const EMPTY_FORM = {
  type: 'retencion', agency: 'AFIP',
  sale_id: '', fiscal_receipt_id: '',
  base_amount: '', rate: '', amount: '',
  certificate_number: '', notes: '',
};

// ── Helpers ───────────────────────────────────────────────────
function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
function fmtPct(n) {
  const v = parseFloat(n || 0);
  return v ? `${(v * 100).toFixed(2)}%` : '—';
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
export default function TaxWithholdingsPage() {
  const { hasRole } = useAuth();
  const isDueno = hasRole('dueno');

  const [withholdings, setWithholdings] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Filters
  const [filterType, setFilterType]     = useState('');
  const [filterAgency, setFilterAgency] = useState('');
  const [filterFrom, setFilterFrom]     = useState(monthStart());
  const [filterTo, setFilterTo]         = useState(today());

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterType)   params.set('type', filterType);
      if (filterAgency) params.set('agency', filterAgency);
      if (filterFrom)   params.set('from', filterFrom);
      if (filterTo)     params.set('to', filterTo);
      const data = await api.get(`/api/tax-withholdings?${params}`);
      setWithholdings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar retenciones.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterAgency, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  // Auto-calc amount when base + rate change
  function handleFormChange(field, value) {
    setForm(f => {
      const updated = { ...f, [field]: value };
      if (field === 'base_amount' || field === 'rate') {
        const base = parseFloat(updated.base_amount || 0);
        const rate = parseFloat(updated.rate || 0);
        if (base && rate) updated.amount = (base * rate).toFixed(2);
      }
      return updated;
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setFormError('El monto debe ser mayor a 0.'); return; }
    setSaving(true);
    try {
      await api.post('/api/tax-withholdings', {
        type:               form.type,
        agency:             form.agency,
        sale_id:            form.sale_id            || undefined,
        fiscal_receipt_id:  form.fiscal_receipt_id  || undefined,
        base_amount:        parseFloat(form.base_amount || 0),
        rate:               parseFloat(form.rate        || 0),
        amount,
        certificate_number: form.certificate_number || undefined,
        notes:              form.notes,
      });
      showToast('Retención/percepción registrada', 'success');
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Error al registrar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/api/tax-withholdings/${id}`);
      showToast('Eliminado', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Summary totals
  const totalRetencion  = withholdings.filter(w => w.type === 'retencion').reduce((s, w) => s + parseFloat(w.amount || 0), 0);
  const totalPercepcion = withholdings.filter(w => w.type === 'percepcion').reduce((s, w) => s + parseFloat(w.amount || 0), 0);

  const INPUT  = 'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const SELECT = INPUT;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-5 mb-6 shadow-lg flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Retenciones / Percepciones</h1>
          <p className="text-blue-100 text-sm mt-1">Registro de retenciones y percepciones impositivas</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowModal(true); }}
          className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all">
          + Registrar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="retencion">Retención</option>
            <option value="percepcion">Percepción</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Organismo</label>
          <select value={filterAgency} onChange={e => setFilterAgency(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {AGENCIES.map(a => <option key={a} value={a}>{AGENCY_LABEL[a] || a}</option>)}
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

      {/* Summary cards */}
      {!loading && withholdings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">Total registros</p>
            <p className="text-2xl font-bold text-slate-800">{withholdings.length}</p>
          </div>
          <div className="bg-white border border-red-100 rounded-xl px-4 py-3.5 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">Total Retenciones</p>
            <p className="text-2xl font-bold text-red-600">{fmtMoney(totalRetencion)}</p>
          </div>
          <div className="bg-white border border-violet-100 rounded-xl px-4 py-3.5 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400 mb-1">Total Percepciones</p>
            <p className="text-2xl font-bold text-violet-600">{fmtMoney(totalPercepcion)}</p>
          </div>
        </div>
      )}

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
          {withholdings.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-400 text-sm">
              No hay retenciones/percepciones en este período
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Organismo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Base</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasa</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    {isDueno && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withholdings.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[w.type] || 'bg-slate-100 text-slate-600'}`}>
                          {TYPE_LABEL[w.type] || w.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{AGENCY_LABEL[w.agency] || w.agency}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtMoney(w.base_amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{fmtPct(w.rate)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtMoney(w.amount)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{w.certificate_number || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{w.created_by_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(w.created_at)}</td>
                      {isDueno && (
                        <td className="px-4 py-3">
                          <button onClick={() => handleDelete(w.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-700 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-white text-base">Registrar Retención / Percepción</h3>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={SELECT}>
                    <option value="retencion">Retención</option>
                    <option value="percepcion">Percepción</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Organismo *</label>
                  <select value={form.agency} onChange={e => setForm(f => ({ ...f, agency: e.target.value }))} className={SELECT}>
                    {AGENCIES.map(a => <option key={a} value={a}>{AGENCY_LABEL[a] || a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Base imponible</label>
                  <input type="number" min="0" step="0.01" value={form.base_amount}
                    onChange={e => handleFormChange('base_amount', e.target.value)} className={INPUT} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tasa (ej: 0.035)</label>
                  <input type="number" min="0" max="1" step="0.0001" value={form.rate}
                    onChange={e => handleFormChange('rate', e.target.value)} className={INPUT} placeholder="0.035" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Monto *</label>
                  <input type="number" min="0.01" step="0.01" required value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={INPUT} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nº de certificado</label>
                <input type="text" value={form.certificate_number}
                  onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))} className={INPUT} placeholder="Opcional" maxLength={100} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ID de Venta (opcional)</label>
                <input type="text" value={form.sale_id}
                  onChange={e => setForm(f => ({ ...f, sale_id: e.target.value }))} className={INPUT} placeholder="UUID de la venta" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ID de Comprobante Fiscal (opcional)</label>
                <input type="text" value={form.fiscal_receipt_id}
                  onChange={e => setForm(f => ({ ...f, fiscal_receipt_id: e.target.value }))} className={INPUT} placeholder="UUID del comprobante" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notas</label>
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={INPUT + ' resize-none'} placeholder="Opcional…" maxLength={500} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Guardando…' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
