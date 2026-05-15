import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_CONFIG = {
  pending:     { label: 'Pendiente',    bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   icon: '🕐' },
  in_progress: { label: 'En proceso',   bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    icon: '🔧' },
  ready:       { label: 'Listo',        bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: '✅' },
  completed:   { label: 'Completado',   bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400',   icon: '💰' },
  cancelled:   { label: 'Cancelado',    bg: 'bg-red-100',     text: 'text-red-600',     dot: 'bg-red-400',     icon: '🚫' },
};

const EMPTY_FORM = {
  client_name: '', client_phone: '',
  device_description: '', service_description: '', notes: '',
  total_amount: '', deposit_amount: '',
  arrival_date: new Date().toISOString().slice(0, 10),
  assigned_to: '',
};

function fmt(n) { return `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

/* ─── Modal: crear / editar orden ─── */
function ServiceOrderModal({ order, employees, onClose, onSaved }) {
  const [form, setForm] = useState(order ? {
    client_name:         order.client_name,
    client_phone:        order.client_phone ?? '',
    device_description:  order.device_description,
    service_description: order.service_description ?? '',
    notes:               order.notes ?? '',
    total_amount:        String(order.total_amount ?? ''),
    deposit_amount:      String(order.deposit_amount ?? ''),
    arrival_date:        order.arrival_date ?? new Date().toISOString().slice(0, 10),
    assigned_to:         order.assigned_to ?? '',
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_amount:   parseFloat(form.total_amount)   || 0,
        deposit_amount: parseFloat(form.deposit_amount) || 0,
        assigned_to:    form.assigned_to || null,
      };
      if (order) {
        await api.put(`/api/service-orders/${order.id}`, payload);
      } else {
        await api.post('/api/service-orders', payload);
      }
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const remaining = Math.max(0, (parseFloat(form.total_amount) || 0) - (parseFloat(form.deposit_amount) || 0));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-6 py-4 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🔧</span>
            <h3 className="font-bold text-white text-base">{order ? 'Editar orden' : 'Nueva orden de servicio'}</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Datos del cliente */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Datos del cliente</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del cliente *</label>
                <input value={form.client_name} onChange={f('client_name')} required placeholder="Ej: Juan Pérez"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                <input value={form.client_phone} onChange={f('client_phone')} placeholder="Ej: 11-1234-5678" type="tel"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de llegada</label>
                <input type="date" value={form.arrival_date} onChange={f('arrival_date')}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
          </div>

          {/* Datos del equipo */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Equipo y servicio</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción del equipo *</label>
                <input value={form.device_description} onChange={f('device_description')} required placeholder="Ej: iPhone 14 Pro - pantalla rota"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trabajo a realizar</label>
                <input value={form.service_description} onChange={f('service_description')} placeholder="Ej: Cambio de pantalla + batería"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notas internas</label>
                <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Observaciones, contraseña del equipo, etc."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
            </div>
          </div>

          {/* Montos */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Montos</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Precio total</label>
                <input type="number" min="0" step="0.01" value={form.total_amount} onChange={f('total_amount')} placeholder="0.00"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Seña / Adelanto</label>
                <input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={f('deposit_amount')} placeholder="0.00"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            {remaining > 0 && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
                <span className="text-xs text-amber-700 font-medium">Saldo pendiente al retirar</span>
                <span className="text-base font-bold text-amber-700">{fmt(remaining)}</span>
              </div>
            )}
          </div>

          {/* Técnico asignado */}
          {employees.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Técnico asignado</label>
              <select value={form.assigned_to} onChange={f('assigned_to')}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Sin asignar</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-500 text-white py-2.5 rounded-xl text-sm font-bold hover:from-violet-700 hover:to-purple-600 transition-all disabled:opacity-50">
              {saving ? 'Guardando...' : order ? 'Guardar cambios' : 'Crear orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal: cobrar saldo / cambiar estado ─── */
function CollectModal({ order, onClose, onSaved }) {
  const remaining = Math.max(0, (order.total_amount || 0) - (order.deposit_amount || 0));
  const [payment, setPayment] = useState(String(remaining));
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  async function handleCollect(e) {
    e.preventDefault(); setError('');
    setSaving(true);
    try {
      await api.put(`/api/service-orders/${order.id}`, {
        additional_payment: parseFloat(payment) || 0,
        status: 'completed',
      });
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <h3 className="font-bold text-white">Cobrar y completar</h3>
        </div>
        <form onSubmit={handleCollect} className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente</span>
              <span className="font-semibold text-slate-800">{order.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total servicio</span>
              <span className="font-semibold text-slate-800">{fmt(order.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ya pagó (seña)</span>
              <span className="font-semibold text-emerald-600">{fmt(order.deposit_amount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
              <span className="text-slate-700 font-semibold">Saldo a cobrar</span>
              <span className="font-bold text-lg text-amber-600">{fmt(remaining)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Monto a cobrar ahora</label>
            <input type="number" min="0" step="0.01" value={payment} onChange={(e) => setPayment(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {saving ? 'Procesando...' : 'Cobrar y completar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Tarjeta de orden ─── */
function OrderCard({ order, onEdit, onCollect, onStatusChange, onDelete, canManage }) {
  const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const remaining = Math.max(0, (order.total_amount || 0) - (order.deposit_amount || 0));
  const isCompleted = order.status === 'completed' || order.status === 'cancelled';

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${isCompleted ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-slate-100 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 truncate">{order.client_name}</span>
            {order.client_phone && (
              <span className="text-xs text-slate-400 font-mono">{order.client_phone}</span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-0.5 truncate">{order.device_description}</p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2 text-sm">
        {order.service_description && (
          <p className="text-slate-600 text-xs">{order.service_description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs text-slate-400">Total</span>
              <p className="font-bold text-slate-900">{fmt(order.total_amount)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Seña</span>
              <p className="font-semibold text-emerald-600">{fmt(order.deposit_amount)}</p>
            </div>
            {remaining > 0 && !isCompleted && (
              <div>
                <span className="text-xs text-slate-400">Saldo</span>
                <p className="font-bold text-amber-600">{fmt(remaining)}</p>
              </div>
            )}
          </div>
          {order.assignee?.name && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">🔧 {order.assignee.name}</span>
          )}
        </div>
        {order.notes && (
          <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-2">{order.notes}</p>
        )}
        <div className="text-xs text-slate-400">
          {order.arrival_date && (
            <span className="inline-flex items-center gap-1 mr-2">
              📅 Llegó: {new Date(order.arrival_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          Creado: {new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
          {order.creator?.name && <> · por {order.creator.name}</>}
          {order.branch?.name && <> · {order.branch.name}</>}
        </div>
      </div>

      {/* Actions */}
      {canManage && !isCompleted && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {order.status === 'pending' && (
            <button onClick={() => onStatusChange(order.id, 'in_progress')}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Iniciar
            </button>
          )}
          {order.status === 'in_progress' && (
            <button onClick={() => onStatusChange(order.id, 'ready')}
              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Marcar listo
            </button>
          )}
          {(order.status === 'ready') && (
            <button onClick={() => onCollect(order)}
              className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Cobrar y completar
            </button>
          )}
          <button onClick={() => onEdit(order)}
            className="text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
            Editar
          </button>
          <button onClick={() => onStatusChange(order.id, 'cancelled')}
            className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg font-medium transition-colors">
            Cancelar
          </button>
        </div>
      )}
      {canManage && isCompleted && (
        <div className="px-4 pb-3 flex gap-1.5 border-t border-slate-100 pt-3">
          <button onClick={() => onDelete(order.id)}
            className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg font-medium transition-colors">
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Página principal ─── */
export default function ServicePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('encargado', 'dueno');

  const [orders, setOrders]       = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState('active'); // active | all | completed
  const [showModal, setShowModal]   = useState(false);
  const [editOrder, setEditOrder]   = useState(null);
  const [collectOrder, setCollectOrder] = useState(null);
  const [deleteId, setDeleteId]     = useState(null);

  async function loadOrders() {
    try {
      const [data, emps] = await Promise.all([
        api.get('/api/service-orders'),
        api.get('/api/users'),
      ]);
      setOrders(data);
      setEmployees(emps.filter(e => ['vendedor', 'encargado', 'dueno'].includes(e.role)));
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadOrders(); }, []);

  async function handleStatusChange(id, status) {
    try {
      await api.put(`/api/service-orders/${id}`, { status });
      await loadOrders();
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleDelete(id) {
    setDeleteId(null);
    try {
      await api.delete(`/api/service-orders/${id}`);
      await loadOrders();
      showToast('Orden eliminada', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  }

  const filtered = orders.filter(o => {
    if (filterStatus === 'active')    return !['completed', 'cancelled'].includes(o.status);
    if (filterStatus === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  const counts = {
    pending:     orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    ready:       orders.filter(o => o.status === 'ready').length,
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-700 to-purple-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-purple-300/20 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">🔧 Servicio Técnico</h1>
            <p className="text-purple-100 text-sm mt-1">{orders.filter(o => !['completed','cancelled'].includes(o.status)).length} órdenes activas</p>
          </div>
          {canManage && (
            <button onClick={() => { setEditOrder(null); setShowModal(true); }}
              className="bg-white text-violet-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-violet-50 transition-all flex items-center gap-1.5 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva orden
            </button>
          )}
        </div>
      </div>

      {/* Resumen de estados */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { key: 'pending',     label: 'Pendientes', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
          { key: 'in_progress', label: 'En proceso', color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200'  },
          { key: 'ready',       label: 'Listos',     color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        ].map(s => (
          <div key={s.key} className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{counts[s.key]}</p>
            <p className={`text-xs font-semibold ${s.color} mt-0.5`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'active',    label: 'Activas' },
          { key: 'all',       label: 'Todas' },
          { key: 'completed', label: 'Completadas / Canceladas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filterStatus === f.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-3">🔧</div>
          <p className="font-medium">No hay órdenes en esta categoría</p>
          {canManage && filterStatus !== 'completed' && (
            <button onClick={() => { setEditOrder(null); setShowModal(true); }}
              className="mt-4 bg-violet-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
              Crear primera orden
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              canManage={canManage}
              onEdit={(o) => { setEditOrder(o); setShowModal(true); }}
              onCollect={(o) => setCollectOrder(o)}
              onStatusChange={handleStatusChange}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Modales */}
      {showModal && (
        <ServiceOrderModal
          order={editOrder}
          employees={employees}
          onClose={() => { setShowModal(false); setEditOrder(null); }}
          onSaved={() => { setShowModal(false); setEditOrder(null); loadOrders(); showToast(editOrder ? 'Orden actualizada' : 'Orden creada', 'success'); }}
        />
      )}
      {collectOrder && (
        <CollectModal
          order={collectOrder}
          onClose={() => setCollectOrder(null)}
          onSaved={() => { setCollectOrder(null); loadOrders(); showToast('Orden completada y cobrada', 'success'); }}
        />
      )}
      <ConfirmModal
        open={!!deleteId}
        title="Eliminar orden"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
