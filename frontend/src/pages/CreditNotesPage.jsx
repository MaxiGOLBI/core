import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_BADGE  = { pending: 'bg-amber-100 text-amber-700', used: 'bg-slate-100 text-slate-500' };
const STATUS_LABEL  = { pending: 'Pendiente', used: 'Usada' };

const EMPTY_FORM = { client_name: '', dni: '', reason: '', amount: '', notes: '' };

export default function CreditNotesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('cajero', 'encargado', 'dueno');

  const [notes,  setNotes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterFrom)   params.set('from', filterFrom);
      if (filterTo)     params.set('to', filterTo);
      const data = await api.get(`/api/credit-notes?${params}`);
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar notas.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function setField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/api/credit-notes', {
        client_name: form.client_name.trim(),
        dni:         form.dni.trim(),
        reason:      form.reason.trim(),
        amount:      form.amount,
        notes:       form.notes.trim(),
      });
      showToast('Nota de crédito creada', 'success');
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkUsed(id) {
    try {
      await api.patch(`/api/credit-notes/${id}`, { status: 'used' });
      showToast('Marcada como usada', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta nota de crédito?')) return;
    try {
      await api.delete(`/api/credit-notes/${id}`);
      showToast('Nota eliminada', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const INPUT = 'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-5 mb-6 shadow-lg flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Notas de Crédito</h1>
          <p className="text-blue-200 text-sm mt-0.5">Registro de notas de crédito emitidas</p>
        </div>
        {canManage && (
          <button onClick={openNew}
            className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all">
            + Nueva nota
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="used">Usada</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
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

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {notes.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-400 text-sm">No hay notas de crédito</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nº</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DNI</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nota interna</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    {canManage && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notes.map((note) => (
                    <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{note.number || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{note.client_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{note.dni || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{note.reason || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{fmtMoney(note.amount)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[160px] truncate italic">{note.notes || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[note.status] || 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_LABEL[note.status] || note.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(note.created_at)}</td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {note.status === 'pending' && (
                              <button onClick={() => handleMarkUsed(note.id)}
                                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors whitespace-nowrap">
                                Marcar usada
                              </button>
                            )}
                            {note.status === 'pending' && (
                              <button onClick={() => handleDelete(note.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                                Eliminar
                              </button>
                            )}
                          </div>
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
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-700 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Nueva nota de crédito</h3>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Nombre del cliente <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={form.client_name} onChange={setField('client_name')}
                  className={INPUT} placeholder="Ej: Juan Pérez" maxLength={150} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  DNI <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={form.dni} onChange={setField('dni')}
                  className={INPUT} placeholder="Ej: 30123456" maxLength={20} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={form.reason} onChange={setField('reason')}
                  className={INPUT} placeholder="Ej: Devolución de mercadería" maxLength={200} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Monto <span className="text-red-500">*</span>
                </label>
                <input type="number" min="0.01" step="0.01" required value={form.amount}
                  onChange={setField('amount')} className={INPUT} placeholder="0.00" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Nota interna <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea rows={2} value={form.notes} onChange={setField('notes')}
                  className={INPUT + ' resize-none'} placeholder="Uso interno..." maxLength={500} />
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                El número de nota (NC-XXXX) es asignado automáticamente por el sistema.
              </p>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Guardando…' : 'Crear nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
