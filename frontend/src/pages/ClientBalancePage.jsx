import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { showToast } from '../components/Toast';

// ── Helpers ───────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function fmtDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

const TX_BADGE = {
  deuda:        'bg-red-100 text-red-700',
  pago:         'bg-emerald-100 text-emerald-700',
  nota_credito: 'bg-blue-100 text-blue-700',
};

const TX_LABELS = {
  deuda:        'Deuda',
  pago:         'Pago',
  nota_credito: 'Nota de crédito',
};

const EMPTY_TX_FORM = { type: 'pago', amount: '', date: todayStr(), description: '' };

// ── Main page ─────────────────────────────────────────────────
export default function ClientBalancePage() {
  const [clients, setClients]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [onlyWithDebt, setOnlyWithDebt] = useState(true);

  // Detail panel
  const [selected, setSelected]         = useState(null); // full client object with balance
  const [history, setHistory]           = useState(null); // { client, transactions }
  const [histLoading, setHistLoading]   = useState(false);

  // Transaction modal
  const [txModal, setTxModal]           = useState(null); // 'pago' | 'deuda'
  const [txForm, setTxForm]             = useState(EMPTY_TX_FORM);
  const [txSaving, setTxSaving]         = useState(false);
  const [txError, setTxError]           = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (onlyWithDebt) params.set('with_balance', 'true');
      const data = await api.get(`/api/clients?${params}`);
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar clientes.');
    } finally {
      setLoading(false);
    }
  }, [onlyWithDebt]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const loadHistory = useCallback(async (clientId) => {
    setHistLoading(true);
    try {
      const data = await api.get(`/api/clients/${clientId}/transactions`);
      setHistory(data);
      // Sync balance from history response
      if (data?.client) {
        setSelected(prev => prev ? { ...prev, balance: data.client.balance } : prev);
      }
    } catch (err) {
      showToast(err.message || 'Error al cargar historial.', 'error');
    } finally {
      setHistLoading(false);
    }
  }, []);

  function openClient(client) {
    setSelected(client);
    setHistory(null);
    loadHistory(client.id);
  }

  function openTxModal(type) {
    setTxForm({ ...EMPTY_TX_FORM, type, date: todayStr() });
    setTxError('');
    setTxModal(type);
  }

  async function handleTxSubmit(e) {
    e.preventDefault();
    setTxError('');
    const amount = parseFloat(txForm.amount);
    if (!amount || amount <= 0) { setTxError('El monto debe ser mayor a 0.'); return; }
    setTxSaving(true);
    try {
      await api.post(`/api/clients/${selected.id}/transactions`, {
        type:        txForm.type,
        amount,
        date:        txForm.date,
        description: txForm.description,
      });
      setTxModal(null);
      showToast(txForm.type === 'pago' ? 'Cobro registrado' : 'Deuda registrada', 'success');
      loadHistory(selected.id);
      loadClients();
    } catch (err) {
      setTxError(err.message || 'Error al registrar.');
    } finally {
      setTxSaving(false);
    }
  }

  const balance = selected?.balance ?? history?.client?.balance ?? 0;
  const isDebt  = balance > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-5 mb-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">Cuentas Corrientes</h1>
        <p className="text-blue-100 text-sm mt-1">Gestión de saldos y deudas de clientes</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── LEFT: Client list ─────────────────────────────── */}
        <div className="lg:w-1/2 xl:w-2/5">
          {/* Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setOnlyWithDebt(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${onlyWithDebt ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Solo con deuda
            </button>
            <button
              onClick={() => setOnlyWithDebt(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${!onlyWithDebt ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Ver todos
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {clients.length === 0 ? (
                <div className="px-4 py-10 text-center text-slate-400 text-sm">
                  {onlyWithDebt ? 'No hay clientes con saldo pendiente' : 'No hay clientes registrados'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                  {clients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openClient(c)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${selected?.id === c.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{c.name}</p>
                        {c.phone && <p className="text-xs text-slate-400 mt-0.5">{c.phone}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${(c.balance ?? 0) > 0 ? 'text-red-600' : (c.balance ?? 0) < 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {fmtMoney(c.balance ?? 0)}
                        </p>
                        {(c.balance ?? 0) !== 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {(c.balance ?? 0) > 0 ? 'debe' : 'a favor'}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Client detail panel ────────────────────── */}
        {selected && (
          <div className="lg:flex-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className={`px-5 py-4 ${isDebt ? 'bg-red-50 border-b border-red-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">{history?.client?.name || selected.name}</h2>
                    <p className="text-sm mt-1">
                      Saldo:{' '}
                      <span className={`font-bold text-base ${isDebt ? 'text-red-700' : balance < 0 ? 'text-blue-700' : 'text-slate-500'}`}>
                        {fmtMoney(balance)}
                      </span>
                      {isDebt && <span className="text-xs text-red-500 ml-1">(debe)</span>}
                      {balance < 0 && <span className="text-xs text-blue-500 ml-1">(a favor)</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openTxModal('pago')}
                      className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors">
                      + Cobro
                    </button>
                    <button onClick={() => openTxModal('deuda')}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors">
                      + Deuda
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions */}
              <div className="p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Historial</h3>
                {histLoading ? (
                  <div className="flex justify-center py-8">
                    <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                ) : history?.transactions?.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Sin movimientos registrados</p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {history?.transactions?.map(tx => (
                      <div key={tx.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap mt-0.5 ${TX_BADGE[tx.type] || 'bg-slate-100 text-slate-600'}`}>
                          {TX_LABELS[tx.type] || tx.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{fmtMoney(tx.amount)}</p>
                          {tx.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{tx.description}</p>}
                          <p className="text-xs text-slate-400 mt-0.5">
                            {fmtDate(tx.date)}
                            {tx.created_by_name && <span className="ml-2">· {tx.created_by_name}</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Transaction modal ─────────────────────────────────── */}
      {txModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setTxModal(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className={`px-6 py-4 border-b flex items-center justify-between rounded-t-2xl ${txModal === 'pago' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <h3 className="font-bold text-slate-800 text-base">
                {txModal === 'pago' ? 'Registrar cobro' : 'Registrar deuda'}
              </h3>
              <button onClick={() => setTxModal(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleTxSubmit} className="p-6 space-y-4">
              {txError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">{txError}</div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monto *</label>
                <input
                  type="number" min="0.01" step="0.01" required
                  value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha *</label>
                <input
                  type="date" required
                  value={txForm.date}
                  onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción</label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={txModal === 'pago' ? 'Ej: Abono en efectivo' : 'Ej: Compra a cuenta corriente'}
                  maxLength={200}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setTxModal(null)} disabled={txSaving}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={txSaving}
                  className={`flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors ${txModal === 'pago' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                  {txSaving ? 'Guardando…' : txModal === 'pago' ? 'Registrar cobro' : 'Registrar deuda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
