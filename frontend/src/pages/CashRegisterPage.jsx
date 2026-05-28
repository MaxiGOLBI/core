import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

// ── Helpers ────────────────────────────────────────────────────
function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

const MOVEMENT_TYPE_LABEL = {
  sale:       'Venta',
  expense:    'Gasto',
  manual_in:  'Ingreso manual',
  manual_out: 'Egreso manual',
};

const MOVEMENT_TYPE_COLOR = {
  sale:       'text-emerald-700 bg-emerald-50',
  manual_in:  'text-emerald-700 bg-emerald-50',
  expense:    'text-rose-700 bg-rose-50',
  manual_out: 'text-rose-700 bg-rose-50',
};

// ── Modal: movimiento manual ───────────────────────────────────
function MovementModal({ type, onConfirm, onClose }) {
  const [amount, setAmount]       = useState('');
  const [description, setDescription] = useState('');
  const isIn = type === 'manual_in';

  function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { showToast('Ingresá un monto válido', 'error'); return; }
    if (!description.trim())    { showToast('Ingresá una descripción', 'error'); return; }
    onConfirm({ type, amount: parsed, description: description.trim() });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {isIn ? '+ Ingreso manual' : '− Egreso manual'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
            <input
              type="number" min="0.01" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Motivo del movimiento..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
                isIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}>
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Constante de medios de pago para cierre manual ────────────
const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'virtual',  label: 'Virtual'  },
  { key: 'tarjeta',  label: 'Tarjeta'  },
];

// ── Modal: cierre manual (cajero / encargado) ──────────────────
function ManualCloseModal({ openingAmount, expectedAmount, onConfirm, onClose }) {
  const empty = { ingresos: '', egresos: '' };
  const [fields, setFields] = useState({
    efectivo: { ...empty },
    virtual:  { ...empty },
    tarjeta:  { ...empty },
  });
  const [notes, setNotes] = useState('');

  function setField(method, side, value) {
    setFields(prev => ({ ...prev, [method]: { ...prev[method], [side]: value } }));
  }

  const rows = PAYMENT_METHODS.map(m => {
    const ing = parseFloat(fields[m.key].ingresos || 0);
    const egr = parseFloat(fields[m.key].egresos  || 0);
    return { ...m, ing, egr, total: ing - egr };
  });

  const totalIngresos = rows.reduce((s, r) => s + r.ing, 0);
  const totalEgresos  = rows.reduce((s, r) => s + r.egr, 0);
  const balanceFinal  = openingAmount + totalIngresos - totalEgresos;
  const diff          = balanceFinal - expectedAmount;

  function handleSubmit(e) {
    e.preventDefault();
    for (const m of PAYMENT_METHODS) {
      if (fields[m.key].ingresos === '') {
        showToast(`Ingresá los ingresos para ${m.label}`, 'error'); return;
      }
      if (fields[m.key].egresos === '') {
        showToast(`Ingresá los egresos para ${m.label}`, 'error'); return;
      }
    }
    const manual_breakdown = {};
    for (const m of PAYMENT_METHODS) {
      manual_breakdown[m.key] = {
        ingresos: parseFloat(fields[m.key].ingresos),
        egresos:  parseFloat(fields[m.key].egresos),
      };
    }
    onConfirm({ manual_breakdown, notes: notes.trim() });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Cerrar Caja</h2>
        <p className="text-sm text-slate-500 mb-4">Ingresá los montos por cada medio de pago.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campos por método */}
          <div className="space-y-3">
            {PAYMENT_METHODS.map(m => {
              const row = rows.find(r => r.key === m.key);
              return (
                <div key={m.key} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{m.label}</p>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Ingresos</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={fields[m.key].ingresos}
                        onChange={e => setField(m.key, 'ingresos', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Egresos</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={fields[m.key].egresos}
                        onChange={e => setField(m.key, 'egresos', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-right pb-0.5">
                      <p className="text-xs text-slate-400 mb-1">Total</p>
                      <p className={`text-sm font-bold ${row?.total >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {fmtMoney(row?.total ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totales */}
          <div className="bg-blue-50 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total ingresos:</span>
              <span className="font-semibold text-emerald-700">{fmtMoney(totalIngresos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total egresos:</span>
              <span className="font-semibold text-rose-600">{fmtMoney(totalEgresos)}</span>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-1.5">
              <span className="font-bold text-slate-700">Balance final:</span>
              <span className={`font-bold text-base ${balanceFinal >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                {fmtMoney(balanceFinal)}
              </span>
            </div>
            {expectedAmount > 0 && (
              <p className={`text-xs font-semibold text-right ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                Diferencia con sistema: {diff >= 0 ? '+' : ''}{fmtMoney(diff)}
              </p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
            <input
              type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones del cierre..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors">
              Confirmar Cierre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: cierre automático (dueño) ──────────────────────────
function OwnerCloseModal({ onConfirm, onClose }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get('/api/cash/close-breakdown')
      .then(data => setBreakdown(data))
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoadingBreakdown(false));
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!breakdown) return;
    onConfirm({ closing_amount: breakdown.balance_final, notes: notes.trim() });
  }

  const allIngMethods = breakdown
    ? Object.entries(breakdown.ingresos_por_metodo ?? {}).filter(([, v]) => v > 0)
    : [];
  const allEgrMethods = breakdown
    ? Object.entries(breakdown.egresos_por_metodo ?? {}).filter(([, v]) => v > 0)
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Cerrar Caja</h2>
            <p className="text-sm text-slate-500">Recuento automático del sistema</p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-full">Dueño</span>
        </div>

        {loadingBreakdown ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !breakdown ? (
          <p className="text-sm text-rose-600 py-4">Error al cargar el recuento. Intentá de nuevo.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Apertura */}
            <div className="bg-slate-50 rounded-xl p-3 flex justify-between text-sm">
              <span className="text-slate-600">Monto de apertura:</span>
              <span className="font-semibold text-slate-700">{fmtMoney(breakdown.apertura)}</span>
            </div>

            {/* Ingresos por método */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ingresos por medio de pago</h3>
              <div className="bg-emerald-50 rounded-xl overflow-hidden divide-y divide-emerald-100">
                {allIngMethods.length === 0 && breakdown.manual_in === 0 ? (
                  <p className="px-4 py-2.5 text-sm text-slate-400">Sin ingresos por ventas registrados</p>
                ) : (
                  <>
                    {allIngMethods.map(([method, amount]) => (
                      <div key={method} className="px-4 py-2.5 flex justify-between text-sm">
                        <span className="text-slate-600">{method}</span>
                        <span className="font-semibold text-emerald-700">{fmtMoney(amount)}</span>
                      </div>
                    ))}
                    {breakdown.manual_in > 0 && (
                      <div className="px-4 py-2.5 flex justify-between text-sm">
                        <span className="text-slate-500 italic">Ingresos manuales</span>
                        <span className="font-semibold text-emerald-700">{fmtMoney(breakdown.manual_in)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Egresos por método */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Egresos por medio de pago</h3>
              <div className="bg-rose-50 rounded-xl overflow-hidden divide-y divide-rose-100">
                {allEgrMethods.length === 0 && breakdown.manual_out === 0 ? (
                  <p className="px-4 py-2.5 text-sm text-slate-400">Sin egresos registrados</p>
                ) : (
                  <>
                    {allEgrMethods.map(([method, amount]) => (
                      <div key={method} className="px-4 py-2.5 flex justify-between text-sm">
                        <span className="text-slate-600">{method}</span>
                        <span className="font-semibold text-rose-600">{fmtMoney(amount)}</span>
                      </div>
                    ))}
                    {breakdown.manual_out > 0 && (
                      <div className="px-4 py-2.5 flex justify-between text-sm">
                        <span className="text-slate-500 italic">Egresos manuales</span>
                        <span className="font-semibold text-rose-600">{fmtMoney(breakdown.manual_out)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Totales */}
            <div className="bg-blue-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total ingresos:</span>
                <span className="font-semibold text-emerald-700">{fmtMoney(breakdown.total_ingresos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total egresos:</span>
                <span className="font-semibold text-rose-600">{fmtMoney(breakdown.total_egresos)}</span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-1.5">
                <span className="font-bold text-slate-800">Balance final:</span>
                <span className={`font-bold text-base ${breakdown.balance_final >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                  {fmtMoney(breakdown.balance_final)}
                </span>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
              <input
                type="text" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones del cierre..."
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors">
                Confirmar Cierre
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de resumen ─────────────────────────────────────────
function SummaryCard({ label, amount, colorClass }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorClass}`}>{fmtMoney(amount)}</p>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function CashRegisterPage({ hideHeader = false }) {
  const { hasRole, user } = useAuth();

  const [status, setStatus]         = useState(null);   // { session, summary } | null
  const [arqueo, setArqueo]         = useState(null);
  const [showArqueo, setShowArqueo] = useState(false);
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Opening form state
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes]   = useState('');
  const [submitting, setSubmitting]       = useState(false);

  // Modals
  const [movementModal, setMovementModal] = useState(null); // 'manual_in' | 'manual_out' | null
  const [showCloseModal, setShowCloseModal] = useState(false);

  const canSeeHistory = hasRole('encargado', 'dueno');
  const isDueno = user?.role === 'dueno';

  // Branch filter (dueño only)
  const [branches, setBranches]         = useState([]);
  const [branchFilter, setBranchFilter] = useState('');

  // ── Data fetching ────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get('/api/cash/status');
      setStatus(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    if (!canSeeHistory) return;
    try {
      const q = branchFilter ? `?branch_id=${encodeURIComponent(branchFilter)}` : '';
      const data = await api.get(`/api/cash/sessions${q}`);
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      // non-critical
    }
  }, [canSeeHistory, branchFilter]);

  useEffect(() => {
    if (!isDueno) return;
    api.get('/api/branches').then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isDueno]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadSessions()]);
      setLoading(false);
    })();
  }, [loadStatus, loadSessions]);

  // ── Acciones ─────────────────────────────────────────────────
  async function handleOpen(e) {
    e.preventDefault();
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) { showToast('Ingresá un monto de apertura válido', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/cash/open', { opening_amount: amount, notes: openingNotes.trim() });
      showToast('Caja abierta exitosamente', 'success');
      setOpeningAmount('');
      setOpeningNotes('');
      await Promise.all([loadStatus(), loadSessions()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArqueo() {
    try {
      const data = await api.get('/api/cash/arqueo');
      setArqueo(data);
      setShowArqueo(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleMovement(payload) {
    try {
      await api.post('/api/cash/movements', payload);
      showToast('Movimiento registrado', 'success');
      setMovementModal(null);
      await loadStatus();
      if (showArqueo) await handleArqueo();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleClose(payload) {
    setSubmitting(true);
    try {
      await api.post('/api/cash/close', payload);
      showToast('Caja cerrada exitosamente', 'success');
      setShowCloseModal(false);
      setShowArqueo(false);
      setArqueo(null);
      await Promise.all([loadStatus(), loadSessions()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-8 px-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">{error}</div>
      </div>
    );
  }

  const session = status?.session ?? null;
  const summary = status?.summary ?? null;
  const isOpen  = session?.status === 'open';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Caja</h1>
            <p className="text-sm text-slate-500 mt-0.5">Apertura, cierre y movimientos de caja</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
            isOpen
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isOpen ? 'Abierta' : 'Cerrada'}
          </span>
        </div>
      )}

      {/* ── CAJA CERRADA: formulario de apertura ── */}
      {!isOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Abrir Caja</h2>
          <form onSubmit={handleOpen} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Monto inicial <span className="text-slate-400 font-normal">(efectivo en caja)</span>
              </label>
              <input
                type="number" min="0" step="0.01"
                value={openingAmount}
                onChange={e => setOpeningAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notas <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={openingNotes}
                onChange={e => setOpeningNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones de apertura..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </form>
        </div>
      )}

      {/* ── CAJA ABIERTA: panel principal ── */}
      {isOpen && (
        <>
          {/* Banner de estado */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="font-medium">Abierta desde:</span>{' '}
              {fmtDateTime(session.opened_at)}
            </span>
            {session.opened_by_name && (
              <span>
                <span className="font-medium">Por:</span>{' '}
                {session.opened_by_name}
              </span>
            )}
          </div>

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Monto inicial"  amount={session.opening_amount}   colorClass="text-slate-700" />
            <SummaryCard label="Ventas"         amount={summary?.sales_total ?? 0}    colorClass="text-emerald-700" />
            <SummaryCard label="Egresos"        amount={summary?.expenses_total ?? 0} colorClass="text-rose-600" />
            <SummaryCard label="Esperado en caja" amount={summary?.expected_amount ?? 0} colorClass="text-blue-700" />
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMovementModal('manual_in')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span className="text-base leading-none">+</span> Ingreso manual
            </button>
            <button
              onClick={() => setMovementModal('manual_out')}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span className="text-base leading-none">−</span> Egreso manual
            </button>
            <button
              onClick={showArqueo ? () => setShowArqueo(false) : handleArqueo}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {showArqueo ? 'Ocultar Arqueo' : 'Ver Arqueo'}
            </button>
            <button
              onClick={() => setShowCloseModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors ml-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Cerrar Caja
            </button>
          </div>

          {/* Arqueo detallado */}
          {showArqueo && arqueo && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Arqueo de caja</h3>
                <div className="text-sm text-slate-600">
                  Esperado: <span className="font-bold text-blue-700">{fmtMoney(arqueo.expected_amount)}</span>
                </div>
              </div>
              {/* Resumen del arqueo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
                {[
                  { label: 'Apertura',      value: arqueo.opening_amount,  color: 'text-slate-700' },
                  { label: 'Ventas',         value: arqueo.sales_total,     color: 'text-emerald-700' },
                  { label: 'Ingresos manuales', value: arqueo.manual_in,   color: 'text-emerald-700' },
                  { label: 'Egresos',        value: arqueo.expenses_total + arqueo.manual_out, color: 'text-rose-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="px-4 py-3">
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className={`text-sm font-semibold ${color}`}>{fmtMoney(value)}</p>
                  </div>
                ))}
              </div>

              {/* Listado de movimientos */}
              {arqueo.movements?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-5 py-3 text-left">Tipo</th>
                        <th className="px-5 py-3 text-left">Descripción</th>
                        <th className="px-5 py-3 text-right">Monto</th>
                        <th className="px-5 py-3 text-right">Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {arqueo.movements.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${MOVEMENT_TYPE_COLOR[m.type] ?? 'bg-slate-100 text-slate-600'}`}>
                              {MOVEMENT_TYPE_LABEL[m.type] ?? m.type}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600">{m.description || '—'}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${
                            m.type === 'sale' || m.type === 'manual_in' ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {m.type === 'expense' || m.type === 'manual_out' ? '−' : '+'}{fmtMoney(m.amount)}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-400 text-xs">
                            {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 py-4 text-sm text-slate-400">Sin movimientos registrados.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Historial de sesiones (encargado / dueño) ── */}
      {canSeeHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-slate-800">Historial de sesiones</h3>
            {isDueno && branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las sucursales</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>
          {sessions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">No hay sesiones cerradas aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Fecha</th>
                    <th className="px-5 py-3 text-left hidden sm:table-cell">Sucursal</th>
                    <th className="px-5 py-3 text-right">Apertura</th>
                    <th className="px-5 py-3 text-right hidden md:table-cell">Esperado</th>
                    <th className="px-5 py-3 text-right">Contado</th>
                    <th className="px-5 py-3 text-right">Diferencia</th>
                    <th className="px-5 py-3 text-left hidden lg:table-cell">Abrió</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map(s => {
                    const diff = s.difference ?? 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                          {fmtDate(s.opened_at)}
                        </td>
                        <td className="px-5 py-3 text-slate-600 hidden sm:table-cell">
                          {s.branch_name ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">
                          {fmtMoney(s.opening_amount)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700 hidden md:table-cell">
                          {s.expected_amount != null ? fmtMoney(s.expected_amount) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">
                          {s.closing_amount != null ? fmtMoney(s.closing_amount) : '—'}
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold ${
                          diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {diff > 0 ? '+' : ''}{fmtMoney(diff)}
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs hidden lg:table-cell">
                          {s.opened_by_name ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modales ── */}
      {movementModal && (
        <MovementModal
          type={movementModal}
          onConfirm={handleMovement}
          onClose={() => setMovementModal(null)}
        />
      )}
      {showCloseModal && isDueno && (
        <OwnerCloseModal
          onConfirm={handleClose}
          onClose={() => setShowCloseModal(false)}
        />
      )}
      {showCloseModal && !isDueno && (
        <ManualCloseModal
          openingAmount={parseFloat(session?.opening_amount ?? 0)}
          expectedAmount={summary?.expected_amount ?? 0}
          onConfirm={handleClose}
          onClose={() => setShowCloseModal(false)}
        />
      )}
    </div>
  );
}
