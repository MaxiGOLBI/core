import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Constants ──────────────────────────────────────────────────
const TYPE_LABELS = { deuda: 'Deuda', pago: 'Pago' };
const PAYMENT_METHODS = ['efectivo', 'transferencia', 'tarjeta', 'cheque'];

const EMPTY_SUPPLIER = {
  name: '', cuit: '', phone: '', email: '', address: '', notes: '',
};

const EMPTY_TXN = {
  type: 'pago', amount: '', date: new Date().toISOString().split('T')[0],
  payment_method: 'transferencia', reference: '', notes: '',
};

// ── Helpers ────────────────────────────────────────────────────
function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = (str.split('T')[0]).split('-');
  return `${d}/${m}/${y}`;
}

// ── Badge de transacción ───────────────────────────────────────
function TxnBadge({ type }) {
  const styles = {
    deuda: 'bg-rose-100 text-rose-700',
    pago:  'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[type] ?? 'bg-slate-100 text-slate-600'}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ── Modal de formulario ────────────────────────────────────────
function SupplierFormModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState(supplier ? { ...supplier } : { ...EMPTY_SUPPLIER });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('El nombre es requerido.');
    setSaving(true); setError('');
    try {
      if (supplier) {
        await api.put(`/api/suppliers/${supplier.id}`, form);
      } else {
        await api.post('/api/suppliers', form);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-base">
            {supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-700 text-sm">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CUIT</label>
              <input value={form.cuit} onChange={e => set('cuit', e.target.value)} placeholder="30-12345678-9"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dirección</label>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de transacción ───────────────────────────────────────
function TxnFormModal({ supplierId, supplierName, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY_TXN });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return setError('El monto debe ser mayor a 0.');
    setSaving(true); setError('');
    const payload = {
      type: form.type,
      amount: parseFloat(form.amount),
      date: form.date,
      reference: form.reference,
      notes: form.notes,
      ...(form.type === 'pago' ? { payment_method: form.payment_method } : {}),
    };
    try {
      await api.post(`/api/suppliers/${supplierId}/transactions`, payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-base">Registrar movimiento — {supplierName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-700 text-sm">{error}</div>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
            <div className="flex gap-2">
              {['deuda', 'pago'].map(t => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    form.type === t
                      ? t === 'deuda' ? 'bg-rose-600 text-white border-rose-600' : 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto *</label>
              <input type="number" min="0.01" step="0.01" value={form.amount}
                onChange={e => set('amount', e.target.value)} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {form.type === 'pago' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Medio de pago</label>
              <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Referencia</label>
            <input value={form.reference} onChange={e => set('reference', e.target.value)}
              placeholder="Factura B 0001-00000042"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className={`px-5 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-50 ${
                form.type === 'deuda' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}>
              {saving ? 'Guardando...' : `Registrar ${TYPE_LABELS[form.type]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Panel de detalle del proveedor ─────────────────────────────
function SupplierDetailPanel({ supplierId, onClose, onEdit, onTxnAdded, canWrite }) {
  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnType, setTxnType]   = useState('pago');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get(`/api/suppliers/${supplierId}/transactions`);
      setDetail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  function openTxnModal(type) {
    setTxnType(type);
    setShowTxnModal(true);
  }

  async function handleTxnSaved() {
    setShowTxnModal(false);
    await load();
    onTxnAdded();
  }

  const supplier     = detail?.supplier;
  const transactions = detail?.transactions ?? [];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
          <div>
            <h2 className="font-semibold text-slate-800 text-base truncate">
              {supplier?.name ?? 'Cargando...'}
            </h2>
            {supplier && (
              <p className={`text-sm font-semibold ${supplier.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                Saldo: {fmtMoney(supplier.balance)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canWrite && supplier && (
              <button onClick={() => onEdit(supplier)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                Editar
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
          </div>
        </div>

        {/* Datos del proveedor */}
        {supplier && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-sm text-slate-600 space-y-1">
            {supplier.cuit    && <p><span className="font-medium">CUIT:</span> {supplier.cuit}</p>}
            {supplier.phone   && <p><span className="font-medium">Tel:</span> {supplier.phone}</p>}
            {supplier.email   && <p><span className="font-medium">Email:</span> {supplier.email}</p>}
            {supplier.address && <p><span className="font-medium">Dirección:</span> {supplier.address}</p>}
            {supplier.notes   && <p className="italic text-slate-400">{supplier.notes}</p>}
          </div>
        )}

        {/* Acciones */}
        {canWrite && supplier && (
          <div className="px-5 py-3 border-b border-slate-100 flex gap-2">
            <button onClick={() => openTxnModal('pago')}
              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              + Registrar pago
            </button>
            <button onClick={() => openTxnModal('deuda')}
              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700">
              + Registrar deuda
            </button>
          </div>
        )}

        {/* Transacciones */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Historial de movimientos</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="px-5 py-4 text-sm text-rose-600">{error}</p>
          ) : transactions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">Sin movimientos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {transactions.map(txn => (
                <li key={txn.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TxnBadge type={txn.type} />
                        <span className="text-xs text-slate-400">{fmtDate(txn.date)}</span>
                        {txn.payment_method && (
                          <span className="text-xs text-slate-400 italic">{txn.payment_method}</span>
                        )}
                      </div>
                      {txn.reference && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{txn.reference}</p>
                      )}
                      {txn.notes && (
                        <p className="text-xs text-slate-400 italic truncate">{txn.notes}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{txn.created_by_name}</p>
                    </div>
                    <span className={`font-bold text-sm whitespace-nowrap ${txn.type === 'deuda' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {txn.type === 'deuda' ? '+' : '-'}{fmtMoney(txn.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal transacción */}
      {showTxnModal && supplier && (
        <TxnFormModal
          supplierId={supplier.id}
          supplierName={supplier.name}
          initialType={txnType}
          onClose={() => setShowTxnModal(false)}
          onSaved={handleTxnSaved}
        />
      )}
    </>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('dueno');

  const [suppliers, setSuppliers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [withBalance, setWithBalance] = useState(false);

  const [selectedId, setSelectedId]       = useState(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier]   = useState(null);
  const [confirmDelete, setConfirmDelete]       = useState(null);
  const [deleting, setDeleting]                 = useState(false);
  const [deleteError, setDeleteError]           = useState('');

  const loadSuppliers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const url = withBalance ? '/api/suppliers?with_balance=true' : '/api/suppliers';
      const data = await api.get(url);
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [withBalance]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  function openNew()   { setEditingSupplier(null); setShowSupplierForm(true); }
  function openEdit(s) { setEditingSupplier(s);    setShowSupplierForm(true); }

  async function handleSaved() {
    setShowSupplierForm(false);
    setEditingSupplier(null);
    await loadSuppliers();
  }

  async function handleDelete(supplier) {
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`/api/suppliers/${supplier.id}`);
      setConfirmDelete(null);
      if (selectedId === supplier.id) setSelectedId(null);
      await loadSuppliers();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Proveedores</h1>
            <p className="text-blue-100 text-sm mt-1">Gestión de proveedores y saldos pendientes</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setWithBalance(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                withBalance
                  ? 'bg-white text-rose-600 border-white'
                  : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${withBalance ? 'bg-rose-500' : 'bg-white'}`} />
              Solo con saldo
            </button>
            {canWrite && (
              <button onClick={openNew}
                className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all">
                + Nuevo proveedor
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">{error}</div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : suppliers.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-400 text-center">
            {withBalance ? 'No hay proveedores con saldo pendiente.' : 'No hay proveedores registrados.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Nombre</th>
                  <th className="px-5 py-3 text-left hidden sm:table-cell">CUIT</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">Teléfono</th>
                  <th className="px-5 py-3 text-left hidden lg:table-cell">Email</th>
                  <th className="px-5 py-3 text-right">Saldo</th>
                  {canWrite && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">{s.cuit || '—'}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{s.phone || '—'}</td>
                    <td className="px-5 py-3 text-slate-500 hidden lg:table-cell">{s.email || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-semibold ${s.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {fmtMoney(s.balance)}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDelete(s); setDeleteError(''); }}
                          className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded"
                          title="Eliminar"
                        >
                          ✕
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

      {/* Panel de detalle */}
      {selectedId && (
        <SupplierDetailPanel
          supplierId={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={supplier => { setSelectedId(null); openEdit(supplier); }}
          onTxnAdded={loadSuppliers}
          canWrite={canWrite}
        />
      )}

      {/* Modal nuevo/editar proveedor */}
      {showSupplierForm && (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => { setShowSupplierForm(false); setEditingSupplier(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Eliminar proveedor</h3>
            <p className="text-sm text-slate-600">
              ¿Eliminar <span className="font-semibold">{confirmDelete.name}</span>?
              Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <p className="text-sm text-rose-600">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
