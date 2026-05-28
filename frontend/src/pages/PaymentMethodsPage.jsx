import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { showToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

function AddMethodModal({ onClose, onSaved }) {
  const [name, setName]             = useState('');
  const [commission, setCommission] = useState('');
  const [saving, setSaving]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/api/payment-methods', {
        name: name.trim(),
        commission_pct: parseFloat(commission) || 0,
        active: true,
      });
      showToast('Método de pago agregado', 'success');
      onSaved();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-cyan-500 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Nuevo método de pago</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Efectivo, Mercado Pago, Tarjeta…"
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Comisión del método (%)
              <span className="ml-1 text-slate-400 normal-case font-normal">— si el medio cobra un %, ingresalo acá</span>
            </label>
            <input type="number" value={commission} onChange={e => setCommission(e.target.value)}
              placeholder="0" min="0" max="100" step="0.01"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PaymentMethodsPage() {
  const [methods, setMethods]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState('');
  const [editComm, setEditComm] = useState('');
  const [deleteMethodId, setDeleteMethodId] = useState(null);

  async function loadMethods() {
    setLoading(true);
    try {
      const data = await api.get('/api/payment-methods');
      setMethods(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  useEffect(() => { loadMethods(); }, []);

  async function handleToggleActive(m) {
    try {
      await api.put(`/api/payment-methods/${m.id}`, { ...m, active: !m.active });
      await loadMethods();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleSaveEdit(m) {
    try {
      await api.put(`/api/payment-methods/${m.id}`, {
        ...m, name: editName.trim(), commission_pct: parseFloat(editComm) || 0,
      });
      setEditId(null);
      await loadMethods();
      showToast('Guardado', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleDelete(id) {
    setDeleteMethodId(null);
    try {
      await api.delete(`/api/payment-methods/${id}`);
      await loadMethods();
      showToast('Eliminado', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {showModal && (
        <AddMethodModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadMethods(); }}
        />
      )}

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Métodos de pago</h1>
            <p className="text-blue-100 text-sm mt-1">Configurá los medios de cobro disponibles para tu negocio</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all flex items-center gap-1.5 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar método
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Métodos configurados</h3>
          <span className="text-xs text-slate-400">{methods.length} método{methods.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">Cargando…</div>
        ) : methods.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <p className="text-slate-500 font-medium text-sm">No hay métodos configurados</p>
            <p className="text-slate-400 text-xs mt-1">Agregá el primero usando el formulario de arriba.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {methods.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                {editId === m.id ? (
                  <>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <input type="number" value={editComm} onChange={e => setEditComm(e.target.value)}
                        min="0" max="100" step="0.01" placeholder="0"
                        className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                    <button onClick={() => handleSaveEdit(m)}
                      className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${m.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{m.name}</p>
                    </div>
                    {m.commission_pct > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        +{m.commission_pct}%
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {m.active ? 'Activo' : 'Inactivo'}
                    </span>
                    <button onClick={() => handleToggleActive(m)}
                      title={m.active ? 'Desactivar' : 'Activar'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                      </svg>
                    </button>
                    <button onClick={() => { setEditId(m.id); setEditName(m.name); setEditComm(String(m.commission_pct ?? 0)); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                    <button onClick={() => setDeleteMethodId(m.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={!!deleteMethodId}
        title="Eliminar método de pago"
        message="¿Estás seguro? Los registros existentes no se verán afectados."
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(deleteMethodId)}
        onCancel={() => setDeleteMethodId(null)}
      />
    </div>
  );
}
