import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────
const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
];

const AGENCIES = [
  'AFIP','IIBB_BUENOS_AIRES','IIBB_CABA','IIBB_CORDOBA','IIBB_SANTA_FE','OTRO',
];
const AGENCY_LABEL = {
  AFIP:              'AFIP',
  IIBB_BUENOS_AIRES: 'IIBB Bs. As.',
  IIBB_CABA:         'IIBB CABA',
  IIBB_CORDOBA:      'IIBB Córdoba',
  IIBB_SANTA_FE:     'IIBB Santa Fe',
  OTRO:              'Otro',
};

const TIPOS_IMPUESTO = ['Ganancias','IVA','IIBB','SUSS','Otro'];

const EMPTY_FORM = {
  type: 'retencion', sufrida_emitida: 'sufrida',
  agency: 'AFIP', tipo: '', regimen: '',
  base_amount: '', rate: '', amount: '',
  certificate_number: '', proveedor_cliente: '', cuit: '', notes: '',
};

// ── Helpers ───────────────────────────────────────────────────
function fmtMoney(n) {
  return `$ ${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildDateRange(año, mesIdx, quincena) {
  const y = parseInt(año);
  if (mesIdx === '' || mesIdx === null || mesIdx === undefined) {
    return { from: `${y}-01-01`, to: `${y}-12-31T23:59:59` };
  }
  const m  = parseInt(mesIdx) + 1;
  const pad = String(m).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  if (quincena === 'PRIMERA') return { from: `${y}-${pad}-01`, to: `${y}-${pad}-15T23:59:59` };
  if (quincena === 'SEGUNDA') return { from: `${y}-${pad}-16`, to: `${y}-${pad}-${lastDay}T23:59:59` };
  return { from: `${y}-${pad}-01`, to: `${y}-${pad}-${lastDay}T23:59:59` };
}

// ── Sortable header cell ──────────────────────────────────────
function Th({ children, col, sort, onSort }) {
  const active = sort.col === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap border-b border-slate-200 bg-slate-50 hover:bg-slate-100"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="text-[10px] text-slate-400">
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function TaxWithholdingsPage() {
  const { hasRole } = useAuth();
  const isDueno = hasRole('dueno');

  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  // ── Filters ──
  const [año,      setAño]      = useState(String(currentYear));
  const [mes,      setMes]      = useState(currentMonth);   // 0-based or ''
  const [quincena, setQuincena] = useState('TODOS');
  const [branchId, setBranchId] = useState('');
  const [retPerc,  setRetPerc]  = useState('');
  const [sufrEmit, setSufrEmit] = useState('');
  const [tipo,     setTipo]     = useState('');
  const [numCert,  setNumCert]  = useState('');
  const [provCli,  setProvCli]  = useState('');
  const [cuit,     setCuit]     = useState('');

  // ── Data ──
  const [branches, setBranches] = useState([]);
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // ── Sort ──
  const [sort, setSort] = useState({ col: 'created_at', dir: 'desc' });

  // ── Modal ──
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.get('/api/branches').then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
    doConsultar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doConsultar() {
    setLoading(true);
    setError('');
    try {
      const { from, to } = buildDateRange(año, mes, quincena);
      const p = new URLSearchParams({ from, to });
      if (retPerc)  p.set('type',               retPerc);
      if (sufrEmit) p.set('sufrida_emitida',     sufrEmit);
      if (tipo)     p.set('tipo',                tipo);
      if (branchId) p.set('branch_id',           branchId);
      if (numCert)  p.set('certificate_number',  numCert);
      if (provCli)  p.set('proveedor_cliente',   provCli);
      if (cuit)     p.set('cuit',                cuit);
      const data = await api.get(`/api/tax-withholdings?${p}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al consultar.');
    } finally {
      setLoading(false);
    }
  }

  function handleSort(col) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  }

  const sorted = [...rows].sort((a, b) => {
    const { col, dir } = sort;
    const av = a[col] ?? '';
    const bv = b[col] ?? '';
    const n = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return dir === 'asc' ? n : -n;
  });

  const totalRet  = rows.filter(r => r.type === 'retencion').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const totalPerc = rows.filter(r => r.type === 'percepcion').reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  // ── Export CSV ──
  function exportCSV() {
    const header = ['Fecha','Retención/Percepción','Sufrida Emitida','Tipo','Jurisdicción','Importe','Regimen','Descripción','Nro Certificado','Proveedor/Cliente','CUIT'];
    const data = sorted.map(r => [
      fmtDate(r.created_at),
      r.type === 'retencion' ? 'Retención' : 'Percepción',
      r.sufrida_emitida || '—',
      r.tipo || '—',
      AGENCY_LABEL[r.agency] || r.agency,
      parseFloat(r.amount || 0),
      r.regimen || '—',
      r.notes   || '—',
      r.certificate_number  || '—',
      r.proveedor_cliente   || '—',
      r.cuit                || '—',
    ]);
    const csv = [header, ...data]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: url,
      download: `retenciones_${año}_${typeof mes === 'number' ? MESES[mes] : 'todos'}.csv`,
    }).click();
    URL.revokeObjectURL(url);
  }

  // ── Modal: auto-calc amount ──
  function handleFormChange(field, value) {
    setForm(f => {
      const u = { ...f, [field]: value };
      if (field === 'base_amount' || field === 'rate') {
        const base = parseFloat(u.base_amount || 0);
        const rate = parseFloat(u.rate         || 0);
        if (base && rate) u.amount = (base * rate).toFixed(2);
      }
      return u;
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
        sufrida_emitida:    form.sufrida_emitida,
        agency:             form.agency,
        tipo:               form.tipo               || undefined,
        regimen:            form.regimen             || undefined,
        base_amount:        parseFloat(form.base_amount || 0),
        rate:               parseFloat(form.rate         || 0),
        amount,
        certificate_number: form.certificate_number || undefined,
        proveedor_cliente:  form.proveedor_cliente  || undefined,
        cuit:               form.cuit               || undefined,
        notes:              form.notes,
      });
      setShowModal(false);
      doConsultar();
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
      doConsultar();
    } catch (err) {
      setError(err.message);
    }
  }

  const years  = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  const SEL = 'border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const INP = 'border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const FSEL = 'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const FINP = 'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1440px] mx-auto px-4 py-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Consulta Retenciones / Percepciones</h1>
          <div className="flex gap-2">
            {isDueno && (
              <button
                onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowModal(true); }}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors"
              >
                + Registrar
              </button>
            )}
            <button
              onClick={exportCSV}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar
            </button>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-3">
          {/* Fila 1 */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Año:</label>
              <select value={año} onChange={e => setAño(e.target.value)} className={SEL}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Mes:</label>
              <select value={mes} onChange={e => setMes(e.target.value === '' ? '' : parseInt(e.target.value))} className={SEL}>
                <option value="">TODOS</option>
                {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Quincena:</label>
              <select value={quincena} onChange={e => setQuincena(e.target.value)} className={SEL}>
                <option value="TODOS">TODOS</option>
                <option value="PRIMERA">PRIMERA</option>
                <option value="SEGUNDA">SEGUNDA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Sucursal</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className={SEL}>
                <option value="">sucursal</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Retención / Percepción:</label>
              <select value={retPerc} onChange={e => setRetPerc(e.target.value)} className={SEL}>
                <option value="">TODAS</option>
                <option value="retencion">RETENCIÓN</option>
                <option value="percepcion">PERCEPCIÓN</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Sufridas Emitidas:</label>
              <select value={sufrEmit} onChange={e => setSufrEmit(e.target.value)} className={SEL}>
                <option value="">TODAS</option>
                <option value="sufrida">SUFRIDAS</option>
                <option value="emitida">EMITIDAS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tipo:</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={SEL}>
                <option value="">TODOS</option>
                {TIPOS_IMPUESTO.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          {/* Fila 2 */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Numero Certificado:</label>
              <input type="text" value={numCert} onChange={e => setNumCert(e.target.value)} className={`${INP} w-44`} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Proveedor Cliente:</label>
              <input type="text" value={provCli} onChange={e => setProvCli(e.target.value)} className={`${INP} w-52`} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">CUIT:</label>
              <input type="text" value={cuit} onChange={e => setCuit(e.target.value)} className={`${INP} w-40`} />
            </div>
            <button
              onClick={doConsultar}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-1.5 rounded text-sm font-semibold transition-colors"
            >
              {loading ? 'Consultando…' : 'Consultar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-2 text-sm">{error}</div>
        )}

        {/* ── Cards resumen ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-600 rounded-lg p-5">
            <p className="text-white font-semibold text-lg mb-1">Monto retención</p>
            <p className="text-white text-3xl font-bold">{fmtMoney(totalRet)}</p>
          </div>
          <div className="bg-orange-500 rounded-lg p-5">
            <p className="text-white font-semibold text-lg mb-1">Monto percepción</p>
            <p className="text-white text-3xl font-bold">{fmtMoney(totalPerc)}</p>
          </div>
        </div>

        {/* ── Tabla ── */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Sin registros en el período seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr>
                    <Th col="created_at"         sort={sort} onSort={handleSort}>Fecha</Th>
                    <Th col="type"               sort={sort} onSort={handleSort}>Retención /<br/>Percepción</Th>
                    <Th col="sufrida_emitida"    sort={sort} onSort={handleSort}>Sufrida Emitida</Th>
                    <Th col="tipo"               sort={sort} onSort={handleSort}>Tipo</Th>
                    <Th col="agency"             sort={sort} onSort={handleSort}>Jurisdicción</Th>
                    <Th col="amount"             sort={sort} onSort={handleSort}>Importe</Th>
                    <Th col="regimen"            sort={sort} onSort={handleSort}>Regimen</Th>
                    <Th col="notes"              sort={sort} onSort={handleSort}>Descripción</Th>
                    <Th col="certificate_number" sort={sort} onSort={handleSort}>Numero Certificado</Th>
                    <Th col="proveedor_cliente"  sort={sort} onSort={handleSort}>Proveedor Cliente</Th>
                    {isDueno && <th className="px-3 py-2.5 border-b border-slate-200 bg-slate-50" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors text-xs">
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="px-3 py-2.5 text-slate-700 font-medium capitalize">
                        {r.type === 'retencion' ? 'Retención' : 'Percepción'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 capitalize">{r.sufrida_emitida || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.tipo || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{AGENCY_LABEL[r.agency] || r.agency || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800 font-semibold text-right whitespace-nowrap">{fmtMoney(r.amount)}</td>
                      <td className="px-3 py-2.5 text-slate-500">{r.regimen || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-[160px] truncate" title={r.notes}>{r.notes || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-500">{r.certificate_number || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.proveedor_cliente || '—'}</td>
                      {isDueno && (
                        <td className="px-3 py-2.5">
                          <button onClick={() => handleDelete(r.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium">
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
      </div>

      {/* ── Modal Registrar ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-800 text-base">Registrar Retención / Percepción</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Retención / Percepción *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={FSEL}>
                    <option value="retencion">Retención</option>
                    <option value="percepcion">Percepción</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sufrida / Emitida *</label>
                  <select value={form.sufrida_emitida} onChange={e => setForm(f => ({ ...f, sufrida_emitida: e.target.value }))} className={FSEL}>
                    <option value="sufrida">Sufrida</option>
                    <option value="emitida">Emitida</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jurisdicción *</label>
                  <select value={form.agency} onChange={e => setForm(f => ({ ...f, agency: e.target.value }))} className={FSEL}>
                    {AGENCIES.map(a => <option key={a} value={a}>{AGENCY_LABEL[a] || a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo impuesto</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={FSEL}>
                    <option value="">—</option>
                    {TIPOS_IMPUESTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Base imponible</label>
                  <input type="number" min="0" step="0.01" value={form.base_amount}
                    onChange={e => handleFormChange('base_amount', e.target.value)} className={FINP} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tasa (ej: 0.035)</label>
                  <input type="number" min="0" max="1" step="0.0001" value={form.rate}
                    onChange={e => handleFormChange('rate', e.target.value)} className={FINP} placeholder="0.035" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Monto *</label>
                  <input type="number" min="0.01" step="0.01" required value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={FINP} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nº Certificado</label>
                  <input type="text" value={form.certificate_number}
                    onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))} className={FINP} placeholder="Opcional" maxLength={100} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Régimen</label>
                  <input type="text" value={form.regimen}
                    onChange={e => setForm(f => ({ ...f, regimen: e.target.value }))} className={FINP} placeholder="Ej: RG 2854" maxLength={100} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Proveedor / Cliente</label>
                  <input type="text" value={form.proveedor_cliente}
                    onChange={e => setForm(f => ({ ...f, proveedor_cliente: e.target.value }))} className={FINP} placeholder="Nombre" maxLength={200} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">CUIT</label>
                  <input type="text" value={form.cuit}
                    onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))} className={FINP} placeholder="xx-xxxxxxxx-x" maxLength={20} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción / Notas</label>
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={`${FINP} resize-none`} placeholder="Opcional…" maxLength={500} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
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
