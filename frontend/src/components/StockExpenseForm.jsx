import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { showToast } from './Toast';
import ConfirmModal from './ConfirmModal';

// ── Constants ─────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'tarjeta',       label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque',        label: 'Cheque' },
];
const VOUCHER_TYPES = ['Factura', 'Recibo', 'Ticket', 'Nota de crédito', 'Otro'];
const IVA_RATES = [0, 10.5, 21, 27];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtMoney(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

const INPUT = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const SELECT = `${INPUT} appearance-none`;
const SMALL_INPUT = 'w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Fiscal section (IVA + otros impuestos) ─────────────────────
export function FiscalFields({ form, setField }) {
  const ivaAmount = useMemo(() => {
    const base = parseFloat(form.subtotal || 0);
    const rate = parseFloat(form.iva_rate || 0);
    return base > 0 && rate > 0 ? +(base * rate / 100).toFixed(2) : parseFloat(form.iva_amount || 0);
  }, [form.subtotal, form.iva_rate, form.iva_amount]);

  function handleIvaRate(rate) {
    const base = parseFloat(form.subtotal || 0);
    const computed = base > 0 ? +(base * rate / 100).toFixed(2) : 0;
    setField('iva_rate', rate);
    setField('iva_amount', computed);
  }

  return (
    <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Datos de factura</p>

      {/* IVA */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="IVA %">
          <select value={form.iva_rate} onChange={e => handleIvaRate(parseFloat(e.target.value))} className={SELECT}>
            {IVA_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
        </Field>
        <Field label="IVA $">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
            <input type="number" min="0" step="0.01" value={form.iva_amount}
              onChange={e => setField('iva_amount', e.target.value)}
              className={`${INPUT} pl-6`} />
          </div>
        </Field>
      </div>

      {/* Otros impuestos */}
      <Field label="Otros impuestos $">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
          <input type="number" min="0" step="0.01" value={form.other_taxes}
            onChange={e => setField('other_taxes', e.target.value)}
            className={`${INPUT} pl-6`} />
        </div>
      </Field>

      {/* Percepciones y retenciones — solo visible en contexto dueno */}
      {form.showPerRet && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Percepciones $">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
              <input type="number" min="0" step="0.01" value={form.percepciones}
                onChange={e => setField('percepciones', e.target.value)}
                className={`${INPUT} pl-6`} />
            </div>
          </Field>
          <Field label="Retenciones $">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
              <input type="number" min="0" step="0.01" value={form.retenciones}
                onChange={e => setField('retenciones', e.target.value)}
                className={`${INPUT} pl-6`} />
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}

// ── StockExpenseForm ───────────────────────────────────────────
export default function StockExpenseForm({ onClose, onSaved }) {
  const [products, setProducts]   = useState([]);
  const [search,   setSearch]     = useState('');
  const [saving,   setSaving]     = useState(false);
  const [confirm,  setConfirm]    = useState(false);

  // Expense header fields
  const [form, setFormState] = useState({
    expense_date:   todayStr(),
    supplier:       '',
    category:       'Ingreso de stock',
    comment:        '',
    payment_method: 'efectivo',
    payment_date:   todayStr(),
    status:         'paid',
    voucher_type:   '',
    voucher_number: '',
    iva_rate:       0,
    iva_amount:     0,
    other_taxes:    0,
    percepciones:   0,
    retenciones:    0,
    showPerRet:     true,
  });

  // Items: [{product_id, name, code, qty, unit_cost}]
  const [items, setItems] = useState([]);

  function setField(k, v) { setFormState(prev => ({ ...prev, [k]: v })); }

  // Load products
  useEffect(() => {
    api.get('/api/products').then(setProducts).catch(() => {});
  }, []);

  // Totals
  const subtotal = useMemo(() =>
    items.reduce((s, i) => s + parseFloat(i.unit_cost || 0) * parseInt(i.qty || 0), 0),
    [items]);

  const totalAmount = subtotal
    + parseFloat(form.iva_amount  || 0)
    + parseFloat(form.other_taxes || 0)
    + parseFloat(form.percepciones || 0)
    + parseFloat(form.retenciones  || 0);

  // Keep subtotal in sync for FiscalFields IVA auto-calc
  useEffect(() => {
    setField('subtotal', subtotal);
    if (parseFloat(form.iva_rate) > 0) {
      setField('iva_amount', +(subtotal * parseFloat(form.iva_rate) / 100).toFixed(2));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 30);
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.sku  || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [products, search]);

  function addProduct(product) {
    setItems(prev => {
      const exists = prev.find(i => i.product_id === product.id);
      if (exists) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, qty: i.qty + 1 }
          : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        code: product.code,
        qty: 1,
        unit_cost: parseFloat(product.cost_price || 0),
      }];
    });
    setSearch('');
  }

  function updateItem(product_id, field, value) {
    setItems(prev => prev.map(i =>
      i.product_id === product_id ? { ...i, [field]: value } : i
    ));
  }

  function removeItem(product_id) {
    setItems(prev => prev.filter(i => i.product_id !== product_id));
  }

  async function handleSave() {
    setConfirm(false);
    if (items.length === 0) {
      showToast('Agregá al menos un producto', 'error');
      return;
    }
    for (const item of items) {
      if (!item.qty || parseInt(item.qty) <= 0) {
        showToast(`Cantidad inválida para ${item.name}`, 'error');
        return;
      }
      if (item.unit_cost == null || parseFloat(item.unit_cost) < 0) {
        showToast(`Costo inválido para ${item.name}`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      await api.post('/api/expenses/stock', {
        expense_date:   form.expense_date,
        supplier:       form.supplier,
        category:       form.category,
        comment:        form.comment,
        payment_method: form.payment_method,
        payment_date:   form.status === 'paid' ? form.payment_date : null,
        status:         form.status,
        voucher_type:   form.voucher_type || null,
        voucher_number: form.voucher_number,
        iva_rate:       parseFloat(form.iva_rate   || 0),
        iva_amount:     parseFloat(form.iva_amount  || 0),
        other_taxes:    parseFloat(form.other_taxes || 0),
        percepciones:   parseFloat(form.percepciones || 0),
        retenciones:    parseFloat(form.retenciones  || 0),
        items: items.map(i => ({
          product_id: i.product_id,
          qty:        parseInt(i.qty),
          unit_cost:  parseFloat(i.unit_cost),
        })),
      });
      showToast('Ingreso de stock registrado y stock actualizado', 'success');
      onSaved();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-cyan-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-white text-base">Ingreso de stock</h3>
            <p className="text-blue-100 text-xs mt-0.5">Los productos se suman al stock y se actualiza el costo</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* ── Header info ── */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha" required>
                <input type="date" value={form.expense_date}
                  onChange={e => setField('expense_date', e.target.value)}
                  required className={INPUT} />
              </Field>
              <Field label="Proveedor">
                <input type="text" value={form.supplier}
                  onChange={e => setField('supplier', e.target.value)}
                  placeholder="Nombre del proveedor" className={INPUT} />
              </Field>
              <Field label="Comprobante">
                <select value={form.voucher_type}
                  onChange={e => setField('voucher_type', e.target.value)} className={SELECT}>
                  <option value="">—</option>
                  {VOUCHER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Nº comprobante">
                <input type="text" value={form.voucher_number}
                  onChange={e => setField('voucher_number', e.target.value)}
                  placeholder="0001-00000001" className={INPUT} />
              </Field>
            </div>

            <Field label="Comentario">
              <input type="text" value={form.comment}
                onChange={e => setField('comment', e.target.value)}
                placeholder="Notas adicionales…" className={INPUT} />
            </Field>

            {/* ── Product search & list ── */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Productos del gasto
              </p>

              {/* Search */}
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar producto por nombre, código o SKU…"
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Dropdown results */}
              {search.trim() && filtered.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-3 max-h-48 overflow-y-auto">
                  {filtered.map(p => (
                    <button key={p.id} type="button" onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-left text-sm transition-colors border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{p.code} · Costo actual: {fmtMoney(p.cost_price)}</span>
                    </button>
                  ))}
                </div>
              )}
              {search.trim() && filtered.length === 0 && (
                <p className="text-sm text-slate-400 mb-3 text-center py-3 border border-slate-200 rounded-xl">
                  No se encontraron productos
                </p>
              )}

              {/* Items table */}
              {items.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center">
                  <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                  </svg>
                  <p className="text-slate-400 text-sm">Buscá y seleccioná productos arriba</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-center w-24">Cantidad</th>
                        <th className="px-3 py-2 text-center w-32">Costo unit.</th>
                        <th className="px-3 py-2 text-right w-28">Subtotal</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.product_id} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                            <p className="text-xs text-slate-400">{item.code}</p>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="number" min="1" step="1"
                              value={item.qty}
                              onChange={e => updateItem(item.product_id, 'qty', e.target.value)}
                              className={`${SMALL_INPUT} text-center w-20`} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                              <input type="number" min="0" step="0.01"
                                value={item.unit_cost}
                                onChange={e => updateItem(item.product_id, 'unit_cost', e.target.value)}
                                className={`${SMALL_INPUT} pl-5 text-right w-28`} />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-700">
                            {fmtMoney(parseFloat(item.unit_cost || 0) * parseInt(item.qty || 0))}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => removeItem(item.product_id)}
                              className="text-red-400 hover:text-red-600 transition-colors p-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td colSpan={3} className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">
                          Subtotal productos
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">{fmtMoney(subtotal)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* ── Fiscal section ── */}
            <FiscalFields form={form} setField={setField} />

            {/* ── Total ── */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-700">Total del gasto</span>
              <span className="text-xl font-bold text-blue-800">{fmtMoney(totalAmount)}</span>
            </div>

            {/* ── Payment ── */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pago</p>
              <div className="flex gap-2">
                {[{ v: 'paid', l: 'Pagado' }, { v: 'pending', l: 'Pendiente' }].map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setField('status', v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      form.status === v
                        ? v === 'paid' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-500'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Medio de pago">
                  <select value={form.payment_method}
                    onChange={e => setField('payment_method', e.target.value)} className={SELECT}>
                    {PAYMENT_METHODS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                {form.status === 'paid' && (
                  <Field label="Fecha de pago">
                    <input type="date" value={form.payment_date}
                      onChange={e => setField('payment_date', e.target.value)} className={INPUT} />
                  </Field>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 px-5 py-4 flex gap-3 bg-white flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="button"
            onClick={() => { if (items.length > 0) setConfirm(true); else showToast('Agregá al menos un producto', 'error'); }}
            disabled={saving}
            className="flex-2 flex-grow-[2] bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? 'Guardando…' : `Confirmar ingreso · ${fmtMoney(totalAmount)}`}
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={confirm}
        title="Confirmar ingreso de stock"
        message={`Se agregarán ${items.length} producto(s) al stock y se actualizarán sus costos. Total: ${fmtMoney(totalAmount)}`}
        confirmLabel="Confirmar"
        onConfirm={handleSave}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
