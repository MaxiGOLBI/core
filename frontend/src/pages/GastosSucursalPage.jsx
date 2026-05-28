import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { showToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'efectivo',       label: 'Efectivo' },
  { value: 'tarjeta',        label: 'Tarjeta' },
  { value: 'transferencia',  label: 'Transferencia' },
  { value: 'cheque',         label: 'Cheque' },
];
const VOUCHER_TYPES = ['Factura', 'Recibo', 'Ticket', 'Nota de crédito', 'Otro'];
const PERIODS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes' },
  { key: 'custom', label: 'Personalizado' },
];
const CAT_PALETTE = [
  { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  { bg: 'bg-cyan-100',    text: 'text-cyan-700',    dot: 'bg-cyan-500'    },
  { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
  { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
];

// ── Helpers ────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}
function getPeriodRange(period, customFrom, customTo) {
  const t = todayStr();
  if (period === 'hoy') return [t, t];
  if (period === 'semana') {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    return [from.toISOString().split('T')[0], t];
  }
  if (period === 'mes') return [monthStartStr(), t];
  return [customFrom || t, customTo || t];
}
function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}
function fmtDate(str) {
  if (!str) return '—';
  return str.slice(0, 10).split('-').reverse().join('/');
}
function catColorForName(name, categories) {
  const idx = categories.findIndex(c => c.name === name);
  if (idx < 0) return CAT_PALETTE[7];
  return CAT_PALETTE[idx % CAT_PALETTE.length];
}

// ── Sub-components ─────────────────────────────────────────────
function StatusBadge({ expense }) {
  const today = todayStr();
  let label, cls;
  if (expense.status === 'paid') {
    label = 'Pagado';
    cls = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else if (expense.due_date && expense.due_date < today) {
    label = 'Vencido';
    cls = 'bg-red-50 text-red-700 border border-red-200';
  } else {
    label = 'Pendiente';
    cls = 'bg-amber-50 text-amber-700 border border-amber-200';
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const SELECT = `${INPUT} appearance-none pr-8`;
const FILTER_INPUT = 'border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const EMPTY_FORM = {
  expense_date:   todayStr(),
  due_date:       '',
  amount:         '',
  supplier:       '',
  category:       '',
  voucher_type:   '',
  voucher_number: '',
  comment:        '',
  payment_method: 'efectivo',
  payment_date:   todayStr(),
  status:         'paid',
};

// ── Main page ──────────────────────────────────────────────────
export default function GastosSucursalPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'encargado';

  // ── View mode & filters ──
  const [typeTab, setTypeTab] = useState('gasto');
  const [period, setPeriod]       = useState('mes');
  const [customFrom, setCustomFrom] = useState(monthStartStr());
  const [customTo, setCustomTo]   = useState(todayStr());
  const [filterCat, setFilterCat] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [filterSt,  setFilterSt]  = useState('');

  // ── Data ──
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]   = useState(false);

  // ── Panel ──
  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState(null);

  const suppliers = useMemo(
    () => [...new Set(expenses.map((e) => e.supplier).filter(Boolean))],
    [expenses],
  );

  const [from, to] = getPeriodRange(period, customFrom, customTo);

  // ── Load expenses (backend filters by branch automatically) ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      params.set('type', typeTab);
      if (filterCat) params.set('category', filterCat);
      if (filterPay) params.set('payment_method', filterPay);
      if (filterSt)  params.set('status', filterSt);
      const data = await api.get(`/api/expenses?${params}`);
      setExpenses(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterCat, filterPay, filterSt, typeTab]);

  async function loadCategories() {
    try {
      const data = await api.get('/api/expense-categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch { /* non-critical */ }
  }

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCategories(); }, []);

  // ── Summary ──
  const today = todayStr();
  const totalPagado = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const pending  = expenses.filter(e => e.status !== 'paid');
  const aVencer  = pending.filter(e => !e.due_date || e.due_date >= today);
  const vencidos = pending.filter(e => e.due_date && e.due_date < today);
  const aPagar   = pending.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalAll = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  // ── Form helpers ──
  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, expense_date: todayStr(), payment_date: todayStr() });
    setShowPanel(true);
  }

  function openEdit(ex) {
    if (!canWrite) return;
    setEditingId(ex.id);
    setForm({
      expense_date:   ex.expense_date?.slice(0, 10) || todayStr(),
      due_date:       ex.due_date?.slice(0, 10) || '',
      amount:         String(ex.amount || ''),
      supplier:       ex.supplier || '',
      category:       ex.category || '',
      voucher_type:   ex.voucher_type || '',
      voucher_number: ex.voucher_number || '',
      comment:        ex.comment || ex.description || '',
      payment_method: ex.payment_method || 'efectivo',
      payment_date:   ex.payment_date?.slice(0, 10) || todayStr(),
      status:         ex.status || 'paid',
    });
    setShowPanel(true);
  }

  function closePanel() { setShowPanel(false); setEditingId(null); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      showToast('El importe es obligatorio', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        expense_date:   form.expense_date,
        due_date:       form.due_date || null,
        amount:         parseFloat(form.amount),
        supplier:       form.supplier.trim(),
        category:       form.category.trim(),
        voucher_type:   form.voucher_type || null,
        voucher_number: form.voucher_number.trim() || null,
        comment:        form.comment.trim(),
        description:    form.comment.trim(),
        payment_method: form.payment_method,
        payment_date:   form.status === 'paid' ? form.payment_date : null,
        status:         form.status,
        type:           typeTab,
      };
      if (editingId) {
        await api.put(`/api/expenses/${editingId}`, payload);
        showToast('Gasto actualizado', 'success');
      } else {
        await api.post('/api/expenses', payload);
        showToast('Gasto registrado', 'success');
      }
      closePanel();
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleteExpenseId(null);
    try {
      await api.delete(`/api/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
      showToast('Gasto eliminado', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ── Render ──
  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">

      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {typeTab === 'gasto' ? 'Gastos de la sucursal' : 'Ingresos de la sucursal'}
            </h1>
            <p className="text-blue-100 text-sm mt-1">{fmtDate(from)} — {fmtDate(to)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-white/10 rounded-xl p-1">
              {[{ key: 'gasto', label: 'Gastos' }, { key: 'ingreso', label: 'Ingresos' }].map(t => (
                <button key={t.key} type="button" onClick={() => setTypeTab(t.key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    typeTab === t.key ? 'bg-white text-blue-700' : 'text-white/80 hover:text-white'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            {canWrite && (
              <button onClick={openNew}
                className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {typeTab === 'gasto' ? 'Nuevo gasto' : 'Nuevo ingreso'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Período</p>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
              {PERIODS.map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className={`px-3.5 py-1.5 font-semibold transition-colors ${
                    period === key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {period === 'custom' && (
            <>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Desde</p>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={FILTER_INPUT} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Hasta</p>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={FILTER_INPUT} />
              </div>
            </>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Categoría</p>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={`${FILTER_INPUT} appearance-none pr-8`}>
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Medio de pago</p>
            <select value={filterPay} onChange={e => setFilterPay(e.target.value)} className={`${FILTER_INPUT} appearance-none pr-8`}>
              <option value="">Todos</option>
              {PAYMENT_METHODS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Estado</p>
            <select value={filterSt} onChange={e => setFilterSt(e.target.value)} className={`${FILTER_INPUT} appearance-none pr-8`}>
              <option value="">Todos</option>
              <option value="paid">Pagados</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'A vencer',    val: aVencer.length,        color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
          { label: 'Vencidos',    val: vencidos.length,       color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
          { label: 'A pagar',     val: fmtMoney(aPagar),      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100' },
          { label: 'Total pagado',val: fmtMoney(totalPagado), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`rounded-2xl border px-4 py-3.5 ${bg}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <p className="text-slate-400 text-sm py-16 text-center">Cargando…</p>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
            </svg>
            <p className="text-slate-400 text-sm">No hay {typeTab === 'gasto' ? 'gastos' : 'ingresos'} en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Vencim.</th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left">Comentario</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  {canWrite && <th className="px-4 py-3 w-10" />}
                </tr>
              </thead>
              <tbody>
                {expenses.map(ex => (
                  <tr
                    key={ex.id}
                    onClick={() => openEdit(ex)}
                    className={`border-t border-slate-100 transition-colors ${
                      canWrite
                        ? `hover:bg-blue-50/50 cursor-pointer ${editingId === ex.id ? 'bg-blue-50' : ''}`
                        : 'cursor-default'
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(ex.expense_date)}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(ex.due_date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {ex.supplier || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {ex.category ? (() => {
                        const col = catColorForName(ex.category, categories);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${col.bg} ${col.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                            {ex.category}
                          </span>
                        );
                      })() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                      {ex.comment || ex.description || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge expense={ex} /></td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">{fmtMoney(ex.amount)}</td>
                    {canWrite && (
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setDeleteExpenseId(ex.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={canWrite ? 6 : 6} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">
                    Total del período
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800 text-base">{fmtMoney(totalAll)}</td>
                  {canWrite && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal (encargado only) ── */}
      {canWrite && showPanel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closePanel}>
          <div className="bg-blue-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-900 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
              <h3 className="font-bold text-white text-base">
                {editingId
                  ? (typeTab === 'gasto' ? 'Editar gasto' : 'Editar ingreso')
                  : (typeTab === 'gasto' ? 'Nuevo gasto' : 'Nuevo ingreso')}
              </h3>
              <button type="button" onClick={closePanel} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 overflow-y-auto flex-1 bg-white rounded-b-2xl">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha" required>
                  <input type="date" value={form.expense_date} onChange={e => setField('expense_date', e.target.value)} required className={INPUT} />
                </Field>
                <Field label="Vencimiento">
                  <input type="date" value={form.due_date} onChange={e => setField('due_date', e.target.value)} className={INPUT} />
                </Field>
              </div>

              <Field label="Importe" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">$</span>
                  <input type="number" min="0" step="0.01" value={form.amount}
                    onChange={e => setField('amount', e.target.value)}
                    required placeholder="0.00" className={`${INPUT} pl-7`} />
                </div>
              </Field>

              <Field label="Proveedor">
                <input type="text" value={form.supplier} onChange={e => setField('supplier', e.target.value)}
                  placeholder="Nombre del proveedor" list="suppliers-list" className={INPUT} />
                <datalist id="suppliers-list">
                  {suppliers.map(s => <option key={s} value={s} />)}
                </datalist>
              </Field>

              <Field label="Categoría">
                <select value={form.category} onChange={e => setField('category', e.target.value)} className={SELECT}>
                  <option value="">Seleccionar…</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Comprobante">
                  <select value={form.voucher_type} onChange={e => setField('voucher_type', e.target.value)} className={SELECT}>
                    <option value="">—</option>
                    {VOUCHER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Nº comprobante">
                  <input type="text" value={form.voucher_number} onChange={e => setField('voucher_number', e.target.value)}
                    placeholder="0001-00000001" className={INPUT} />
                </Field>
              </div>

              <Field label="Comentario">
                <textarea value={form.comment} onChange={e => setField('comment', e.target.value)}
                  rows={2} placeholder="Notas adicionales…" className={`${INPUT} resize-none`} />
              </Field>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Pago</p>
                <div className="flex gap-2 mb-3.5">
                  {[{ v: 'paid', l: 'Pagado' }, { v: 'pending', l: 'Pendiente' }].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setField('status', v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        form.status === v
                          ? v === 'paid'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-amber-500 text-white border-amber-500'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>

                <Field label="Medio de pago">
                  <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)} className={SELECT}>
                    {PAYMENT_METHODS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>

                {form.status === 'paid' && (
                  <div className="mt-3.5">
                    <Field label="Fecha de pago">
                      <input type="date" value={form.payment_date} onChange={e => setField('payment_date', e.target.value)} className={INPUT} />
                    </Field>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closePanel}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : (typeTab === 'gasto' ? 'Crear gasto' : 'Crear ingreso')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      <ConfirmModal
        open={!!deleteExpenseId}
        title="Eliminar gasto"
        message="¿Estás seguro de que querés eliminar este gasto?"
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(deleteExpenseId)}
        onCancel={() => setDeleteExpenseId(null)}
      />
    </div>
  );
}
