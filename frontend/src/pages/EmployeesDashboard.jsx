import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { NumericInput } from '../components/NumericInput';
import ConfirmModal from '../components/ConfirmModal';

export default function EmployeesDashboard() {
  const { hasRole, user } = useAuth();
  const isEncargado = user?.role === 'encargado';
  const [balances, setBalances] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [activeTab, setActiveTab] = useState(isEncargado ? 'team_commissions' : 'commissions');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [bal, com, disc, cls, prods, usrs, brs] = await Promise.all([
        api.get('/api/commissions/balances'),
        api.get('/api/commissions'),
        api.get('/api/discounts'),
        api.get('/api/clients'),
        api.get('/api/products'),
        api.get('/api/users'),
        api.get('/api/branches'),
      ]);
      setBalances(bal);
      setCommissions(com);
      setDiscounts(disc);
      setClients(cls);
      setProducts(prods);
      setUsers(usrs);
      setBranches(brs);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const tabs = isEncargado
    ? [
        { key: 'team_commissions', label: 'Comisiones del equipo' },
        { key: 'commissions',      label: 'Comisiones productos' },
      ]
    : [
        { key: 'commissions',      label: 'Comisiones productos' },
        { key: 'team_commissions', label: 'Comisiones del equipo' },
        { key: 'clients_discounts', label: 'Clientes / Descuentos' },
        { key: 'balances',         label: 'Saldos vendedores' },
        { key: 'users',            label: 'Usuarios' },
      ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Panel de Empleados</h1>
            <p className="text-blue-100 text-sm mt-1">Gestioná comisiones, descuentos, clientes y usuarios</p>
          </div>
          {hasRole('dueno') && (
            activeTab === 'config' ? (
              <button onClick={() => setActiveTab('commissions')}
                className="flex items-center gap-2 bg-white/25 hover:bg-white/35 border border-white/50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>
            ) : (
              <button onClick={() => setActiveTab('config')}
                className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuración
              </button>
            )
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {activeTab !== 'config' && (
        <div className="overflow-x-auto mb-6">
          <div className="flex gap-1.5 bg-slate-100/80 border border-slate-200 p-1.5 rounded-2xl w-max min-w-full sm:w-fit sm:min-w-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === t.key
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'balances' && hasRole('dueno') && <BalancesTab balances={balances} branches={branches} />}
      {activeTab === 'commissions' && (
        <CommissionsTab products={products} branches={branches} onRefresh={load} />
      )}
      {activeTab === 'clients_discounts' && hasRole('dueno') && (
        <ClientsDiscountsTab clients={clients} discounts={discounts} onRefresh={load} />
      )}
      {activeTab === 'team_commissions' && hasRole('encargado', 'dueno') && (
        <TeamCommissionsTab branches={branches} />
      )}
      {activeTab === 'users' && hasRole('dueno') && (
        <UsersTab users={users} branches={branches} onRefresh={load} />
      )}
      {activeTab === 'config' && hasRole('dueno') && (
        <ConfigTab />
      )}
    </div>
  );
}

const ROLE_LABELS = {
  vendedor: 'Vendedor',
  cajero: 'Cajero',
  encargado: 'Encargado',
  dueno: 'Dueño',
};

function BalancesTab({ balances, branches }) {
  const branchName = (id) => branches.find((b) => b.id === id)?.name ?? <span className="text-slate-400 italic">—</span>;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Empleado</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sucursal</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Comisión acumulada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {balances.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm italic">Sin empleados registrados</td></tr>
          )}
          {balances.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
              <td className="px-4 py-3 text-slate-500">{b.email}</td>
              <td className="px-4 py-3">
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                  {ROLE_LABELS[b.role] ?? b.role}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{branchName(b.branch_id)}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                ${parseFloat(b.commission_balance ?? 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function CommissionsTab({ products, branches, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({ name: '', price: '', commission_default: '' });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({ name: p.name, price: p.price, commission_default: p.commission_default ?? 0 });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setError('');
  }

  async function handleSave(id) {
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/products/${id}`, {
        name:               editForm.name,
        price:              parseFloat(editForm.price),
        commission_default: parseFloat(editForm.commission_default),
      });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const branchName = (id) => branches.find((b) => b.id === id)?.name ?? <span className="text-slate-400 italic">—</span>;

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        )}
        <span className="text-slate-400 text-sm">{filtered.length} productos</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sucursal</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Comisión/u</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm italic">Sin productos</td></tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className={`transition-colors ${editingId === p.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                {editingId === p.id ? (
                  <>
                    <td className="px-3 py-2">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        autoFocus
                        className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-sm">{branchName(p.branch_id)}</td>
                    <td className="px-3 py-2">
                      <NumericInput
                        value={editForm.price}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                        className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumericInput
                        value={editForm.commission_default}
                        onChange={(e) => setEditForm((f) => ({ ...f, commission_default: e.target.value }))}
                        className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSave(p.id)}
                          disabled={saving}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {saving ? '...' : 'Guardar'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm">{branchName(p.branch_id)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">${parseFloat(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">${parseFloat(p.commission_default ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function ClientsDiscountsTab({ clients, discounts, onRefresh }) {
  const [showClientModal, setShowClientModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', discount_type: 'fixed', discount_value: '' });
  const [discountForm, setDiscountForm] = useState({ name: '', discount_type: 'fixed', discount_value: '', active: true });
  const [error, setError] = useState('');
  const [deleteClientId, setDeleteClientId] = useState(null);
  const [deleteDiscountId, setDeleteDiscountId] = useState(null);

  async function handleCreateClient(e) {
    e.preventDefault();
    setError('');
    try {
      const val = parseFloat(clientForm.discount_value);
      const discount_rules = (!isNaN(val) && val > 0)
        ? { type: clientForm.discount_type, value: val }
        : {};
      await api.post('/api/clients', { name: clientForm.name, discount_rules });
      setClientForm({ name: '', discount_type: 'fixed', discount_value: '' });
      setShowClientModal(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteClient(id) {
    setDeleteClientId(null);
    await api.delete(`/api/clients/${id}`);
    onRefresh();
  }

  async function handleCreateDiscount(e) {
    e.preventDefault();
    setError('');
    try {
      const val = parseFloat(discountForm.discount_value);
      const rule_json = (!isNaN(val) && val > 0)
        ? { type: discountForm.discount_type, value: val }
        : {};
      await api.post('/api/discounts', { name: discountForm.name, rule_json, active: discountForm.active });
      setDiscountForm({ name: '', discount_type: 'fixed', discount_value: '', active: true });
      setShowDiscountModal(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteDiscount(id) {
    setDeleteDiscountId(null);
    await api.delete(`/api/discounts/${id}`);
    onRefresh();
  }

  async function handleToggleDiscount(d) {
    await api.put(`/api/discounts/${d.id}`, { name: d.name, rule_json: d.rule_json, active: !d.active });
    onRefresh();
  }

  function formatDiscount(type, value) {
    if (!value || isNaN(value) || value <= 0) return <span className="text-slate-300">Sin descuento</span>;
    return type === 'percent' ? `${value}%` : `$${value}`;
  }

  return (
    <>
    <div className="space-y-8">
      {/* ── Modal: Agregar cliente ── */}
      {showClientModal && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black/75 flex items-center justify-center z-[9999]"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowClientModal(false); setError(''); } }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-base">Agregar cliente</h3>
              <button type="button" onClick={() => { setShowClientModal(false); setError(''); }}
                className="text-white/70 hover:text-white transition-colors text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-3 text-sm p-6">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
                <input
                  value={clientForm.name}
                  onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
                  required autoFocus
                  placeholder="Nombre del cliente"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Descuento predeterminado</label>
                <div className="flex items-center gap-2">
                  <select
                    value={clientForm.discount_type}
                    onChange={(e) => setClientForm((f) => ({ ...f, discount_type: e.target.value }))}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">$ Neto</option>
                    <option value="percent">% Porcentaje</option>
                  </select>
                  <NumericInput
                    value={clientForm.discount_value}
                    onChange={(e) => setClientForm((f) => ({ ...f, discount_value: e.target.value }))}
                    placeholder={clientForm.discount_type === 'percent' ? '0' : '0.00'}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowClientModal(false); setError(''); }}
                  className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm">
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Agregar descuento ── */}
      {showDiscountModal && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black/75 flex items-center justify-center z-[9999]"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDiscountModal(false); setError(''); } }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-base">Agregar descuento</h3>
              <button type="button" onClick={() => { setShowDiscountModal(false); setError(''); }}
                className="text-white/70 hover:text-white transition-colors text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreateDiscount} className="space-y-3 text-sm p-6">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
                <input
                  value={discountForm.name}
                  onChange={(e) => setDiscountForm((f) => ({ ...f, name: e.target.value }))}
                  required autoFocus
                  placeholder="Nombre del descuento"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo y valor</label>
                <div className="flex items-center gap-2">
                  <select
                    value={discountForm.discount_type}
                    onChange={(e) => setDiscountForm((f) => ({ ...f, discount_type: e.target.value }))}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">$ Neto</option>
                    <option value="percent">% Porcentaje</option>
                  </select>
                  <NumericInput
                    value={discountForm.discount_value}
                    onChange={(e) => setDiscountForm((f) => ({ ...f, discount_value: e.target.value }))}
                    placeholder={discountForm.discount_type === 'percent' ? '0' : '0.00'}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowDiscountModal(false); setError(''); }}
                  className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm">
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CLIENTES ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Clientes</h2>
          <button
            onClick={() => { setShowClientModal(true); setError(''); }}
            className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm"
          >
            + Agregar cliente
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descuento predeterminado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400 text-sm italic">Sin clientes registrados</td></tr>
              )}
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {formatDiscount(c.discount_rules?.type, c.discount_rules?.value)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setDeleteClientId(c.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* ── CATÁLOGO DE DESCUENTOS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Catálogo de descuentos</h2>
          <button
            onClick={() => { setShowDiscountModal(true); setError(''); }}
            className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm"
          >
            + Agregar descuento
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descuento</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Activo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm italic">Sin descuentos en el catálogo</td></tr>
              )}
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {formatDiscount(d.rule_json?.type, d.rule_json?.value)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleDiscount(d)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
                        d.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {d.active ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setDeleteDiscountId(d.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      open={!!deleteClientId}
      title="Eliminar cliente"
      message="¿Estás seguro? Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      onConfirm={() => handleDeleteClient(deleteClientId)}
      onCancel={() => setDeleteClientId(null)}
    />
    <ConfirmModal
      open={!!deleteDiscountId}
      title="Eliminar descuento"
      message="¿Estás seguro? Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      onConfirm={() => handleDeleteDiscount(deleteDiscountId)}
      onCancel={() => setDeleteDiscountId(null)}
    />
    </>
  );
}

function ClientsTab({ clients, onRefresh }) {
  const [form, setForm] = useState({ name: '', discount_type: 'fixed', discount_value: '' });
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const val = parseFloat(form.discount_value);
      const discount_rules = (!isNaN(val) && val > 0)
        ? { type: form.discount_type, value: val }
        : {};
      await api.post('/api/clients', { name: form.name, discount_rules });
      setForm({ name: '', discount_type: 'fixed', discount_value: '' });
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setDeleteId(null);
    await api.delete(`/api/clients/${id}`);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="Nombre del cliente"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Descuento predeterminado</label>
          <div className="flex items-center gap-2">
            <select
              value={form.discount_type}
              onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="fixed">$ Neto</option>
              <option value="percent">% Porcentaje</option>
            </select>
            <NumericInput
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
              placeholder={form.discount_type === 'percent' ? '0' : '0.00'}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-xs self-end">{error}</p>}
        <button type="submit" className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm">
          Agregar
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descuento predeterminado</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-500 text-sm">
                  {c.discount_rules?.value > 0
                    ? c.discount_rules.type === 'percent'
                      ? `${c.discount_rules.value}%`
                      : `$${c.discount_rules.value}`
                    : <span className="text-slate-300">Sin descuento</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setDeleteId(c.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar cliente"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

const ROLE_OPTIONS = ['vendedor', 'cajero', 'encargado'];
const ROLE_LABELS_MAP = {
  vendedor: 'Vendedor',
  cajero: 'Cajero',
  encargado: 'Encargado',
  dueno: 'Dueño',
};
const ROLE_COLORS = {
  vendedor: 'bg-sky-100 text-sky-700',
  cajero: 'bg-purple-100 text-purple-700',
  encargado: 'bg-amber-100 text-amber-700',
  dueno: 'bg-blue-100 text-blue-700',
};

function UsersTab({ users, branches, onRefresh }) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'vendedor', branch_id: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // { id, name, role, branch_id }
  const [editError, setEditError] = useState('');
  const [deleteUserId, setDeleteUserId] = useState(null);

  // Reset branch_id when branches load and none selected yet
  useEffect(() => {
    if (branches.length > 0 && !form.branch_id) {
      setForm((f) => ({ ...f, branch_id: branches[0].id }));
    }
  }, [branches]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/api/users', form);
      setForm({ name: '', email: '', password: '', role: 'vendedor', branch_id: branches[0]?.id ?? '' });
      setSuccess('Usuario creado correctamente.');
      setShowCreateModal(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setDeleteUserId(null);
    try {
      await api.delete(`/api/users/${id}`);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(u) {
    setEditingUser({ id: u.id, name: u.name, role: u.role, branch_id: u.branch_id ?? '' });
    setEditError('');
  }

  async function handleEditSave() {
    setEditError('');
    try {
      await api.put(`/api/users/${editingUser.id}`, {
        name: editingUser.name,
        role: editingUser.role,
        branch_id: editingUser.branch_id,
      });
      setEditingUser(null);
      onRefresh();
    } catch (err) {
      setEditError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      {/* Modal de edición */}
      {editingUser && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black/75 flex items-center justify-center z-[9999]"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingUser(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-base">Editar usuario</h3>
              <button type="button" onClick={() => setEditingUser(null)}
                className="text-white/70 hover:text-white transition-colors text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
                <input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser((u) => ({ ...u, name: e.target.value }))}
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Rol</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser((u) => ({ ...u, role: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS_MAP[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Sucursal</label>
                <select
                  value={editingUser.branch_id}
                  onChange={(e) => setEditingUser((u) => ({ ...u, branch_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Seleccioná una sucursal</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-red-700 text-xs">{editError}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setEditingUser(null)}
                  className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditSave}
                  className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación */}
      {showCreateModal && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black/75 flex items-center justify-center z-[9999]"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateModal(false); setError(''); } }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-white text-base">Crear nuevo usuario</h3>
              <button type="button" onClick={() => { setShowCreateModal(false); setError(''); }}
                className="text-white/70 hover:text-white transition-colors text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required autoFocus
                    placeholder="Nombre completo"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    placeholder="correo@ejemplo.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Contraseña inicial</label>
                  <input
                    type="password" value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Rol</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS_MAP[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Sucursal</label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Seleccioná una sucursal</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mt-3">
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setError(''); }}
                  className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button type="submit"
                  className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm">
                  Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Usuarios</h2>
        <button
          onClick={() => { setShowCreateModal(true); setError(''); setSuccess(''); }}
          className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-cyan-500 transition-all shadow-sm"
        >
          + Crear usuario
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
          <p className="text-emerald-700 text-xs">{success}</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Sucursal</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{u.name}</span>
                  {u.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">vos</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {ROLE_LABELS_MAP[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-slate-500">
                  {branches.find((b) => b.id === u.branch_id)?.name ?? <span className="italic text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.id !== currentUser?.id && (
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => startEdit(u)} className="text-indigo-500 hover:text-indigo-700 text-xs font-medium transition-colors">
                        Editar
                      </button>
                      <button onClick={() => setDeleteUserId(u.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                        Eliminar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteUserId}
        title="Eliminar usuario"
        message="¿Estás seguro? El usuario perderá acceso inmediatamente."
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(deleteUserId)}
        onCancel={() => setDeleteUserId(null)}
      />
    </div>
  );
}

const VIEW_OPTIONS = [
  { key: 'tables',      label: 'Tickets' },
  { key: 'cashier',     label: 'Caja' },
  { key: 'stock',       label: 'Stock' },
  { key: 'sales',       label: 'Ventas' },
  { key: 'commissions', label: 'Comisiones' },
  { key: 'employees',   label: 'Empleados' },
  { key: 'prices',      label: 'Lista de Precios' },
];

const MANAGED_ROLES = [
  { key: 'vendedor',  label: 'Vendedor' },
  { key: 'cajero',    label: 'Cajero' },
  { key: 'encargado', label: 'Encargado' },
];

const DEFAULT_VIEWS = {
  vendedor:  ['tables', 'stock', 'sales', 'commissions'],
  cajero:    ['tables', 'cashier', 'stock', 'sales', 'commissions'],
  encargado: ['tables', 'cashier', 'stock', 'sales', 'commissions', 'employees'],
};

// ─── TeamCommissionsTab ────────────────────────────────────────────────────────
function getTeamDateRange(period, offset) {
  const now = new Date();
  if (period === 'daily') {
    const d = new Date(now); d.setDate(now.getDate() + offset);
    const from = new Date(d); from.setHours(0, 0, 0, 0);
    const to   = new Date(d); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (period === 'monthly') {
    const from = new Date(now.getFullYear(), now.getMonth() + offset, 1); from.setHours(0, 0, 0, 0);
    const to   = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  const day = now.getDay(); const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now); monday.setDate(now.getDate() + diff + offset * 7); monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
  return { from: monday, to: sunday };
}

function fmtTeamRangeLabel(period, from, to) {
  if (period === 'daily') return from.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });
  if (period === 'monthly') return from.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const opts = { day: '2-digit', month: 'short' };
  return `${from.toLocaleDateString('es-AR', opts)} — ${to.toLocaleDateString('es-AR', opts)}`;
}

function fmtISODate(date) { return date.toISOString().split('T')[0]; }

function fmtDT(str) {
  return new Date(str).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TEAM_ROLE_COLORS = {
  vendedor:  { bg: 'bg-sky-100',    text: 'text-sky-700',    dot: 'bg-sky-500' },
  cajero:    { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  encargado: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

function TeamCommissionsTab({ branches }) {
  const [period, setPeriod]       = useState('weekly');
  const [periodLoaded, setPeriodLoaded] = useState(false);
  const [offset, setOffset]       = useState(0);
  const [team, setTeam]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  useEffect(() => {
    api.get('/api/settings')
      .then(s => { if (s?.commission_period) setPeriod(s.commission_period); })
      .catch(() => {})
      .finally(() => setPeriodLoaded(true));
  }, []);

  const { from, to } = getTeamDateRange(period, offset);

  useEffect(() => {
    if (!periodLoaded) return;
    setLoading(true); setTeam([]);
    api.get(`/api/commissions/team?from=${fmtISODate(from)}&to=${fmtISODate(to)}`)
      .then(d => setTeam(d))
      .catch(() => setTeam([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, period, periodLoaded]);

  const branchName = (id) => branches.find(b => b.id === id)?.name ?? null;
  const periodCurrentLabel = { daily: 'Hoy', weekly: 'Semana actual', monthly: 'Mes actual' };
  const periodUnitLabel = (n) => {
    if (period === 'daily')   return n === 1 ? 'día' : 'días';
    if (period === 'weekly')  return n === 1 ? 'semana' : 'semanas';
    return n === 1 ? 'mes' : 'meses';
  };

  const totalGeneral = team.reduce((s, e) => s + e.total_commission, 0);
  const totalSales   = team.reduce((s, e) => s + e.sales.length, 0);

  return (
    <div className="space-y-5">
      {/* Period navigator */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <button onClick={() => setOffset(v => v - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Anterior
        </button>
        <div className="text-center min-w-[180px]">
          {!periodLoaded ? (
            <div className="flex justify-center items-center h-8">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-800 capitalize">{fmtTeamRangeLabel(period, from, to)}</p>
              {offset === 0
                ? <p className="text-xs text-blue-600 mt-0.5">{periodCurrentLabel[period]}</p>
                : <p className="text-xs text-slate-400 mt-0.5">Hace {Math.abs(offset)} {periodUnitLabel(Math.abs(offset))}</p>
              }
            </>
          )}
        </div>
        <button onClick={() => setOffset(v => v + 1)} disabled={offset >= 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed">
          Siguiente
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-slate-400 text-xs mb-1">Empleados activos</p>
            <p className="text-2xl font-bold text-slate-900">{team.filter(e => e.sales.length > 0).length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-slate-400 text-xs mb-1">Ventas totales</p>
            <p className="text-2xl font-bold text-slate-900">{totalSales}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-emerald-600 text-xs mb-1">Total comisiones</p>
            <p className="text-2xl font-bold text-emerald-700">${totalGeneral.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Employee list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Cargando comisiones...</span>
          </div>
        </div>
      ) : team.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-slate-500 font-medium">Sin empleados registrados</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {team.map(emp => {
            const colors = TEAM_ROLE_COLORS[emp.role] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
            const isOpen = expandedId === emp.id;
            return (
              <div key={emp.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Employee header row */}
                <button onClick={() => setExpandedId(v => v === emp.id ? null : emp.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                      <span className={`text-sm font-bold ${colors.text}`}>{emp.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{emp.name}</span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {ROLE_LABELS[emp.role] ?? emp.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {emp.sales.length} venta{emp.sales.length !== 1 ? 's' : ''}
                        {branchName(emp.branch_id) && ` · ${branchName(emp.branch_id)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${emp.total_commission > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        ${emp.total_commission.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400">en el período</p>
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Sales detail for this employee */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-2 bg-slate-50/50">
                    {emp.sales.length === 0 ? (
                      <p className="text-sm text-slate-400 italic text-center py-4">Sin ventas en este período</p>
                    ) : emp.sales.map(sale => {
                      const saleOpen = expandedSaleId === sale.id;
                      return (
                        <div key={sale.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                          <button onClick={() => setExpandedSaleId(v => v === sale.id ? null : sale.id)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{fmtDT(sale.date)}</p>
                              <p className="text-xs text-slate-400">{sale.details_json?.length ?? 0} producto(s) · Total: ${Number(sale.total).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-600">+${sale.commission_earned.toFixed(2)}</span>
                              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${saleOpen ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                          {saleOpen && (
                            <div className="border-t border-slate-100 px-4 py-3 overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-400 border-b border-slate-100">
                                    <th className="text-left pb-1.5 font-medium">Producto</th>
                                    <th className="text-center pb-1.5 font-medium">Cant.</th>
                                    <th className="text-right pb-1.5 font-medium">Com./u</th>
                                    <th className="text-right pb-1.5 font-medium">Comisión</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {(sale.details_json ?? []).map((item, i) => (
                                    <tr key={i} className="text-slate-700">
                                      <td className="py-1.5 font-medium">{item.product_name ?? '—'}</td>
                                      <td className="py-1.5 text-center text-slate-500">{item.qty}</td>
                                      <td className="py-1.5 text-right text-slate-500">${Number(item.commission_per_unit ?? 0).toFixed(2)}</td>
                                      <td className="py-1.5 text-right font-semibold text-emerald-600">+${Number(item.commission_earned ?? 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  {
    value: 'daily',
    label: 'Diario',
    desc: 'Las comisiones se muestran día a día',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
  },
  {
    value: 'weekly',
    label: 'Semanal',
    desc: 'Se agrupan de lunes a domingo',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'monthly',
    label: 'Mensual',
    desc: 'Se agrupan por mes calendario',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const CONFIG_ROLE_COLORS = {
  vendedor:  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  cajero:    { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  encargado: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

function ViewToggle({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange} role="switch" aria-checked={checked}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-slate-200'
      }`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
      }`} />
    </button>
  );
}

// ── Payment Methods Tab (dueno) ──────────────────────────────
function PaymentMethodsTab() {
  const [methods, setMethods]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [name, setName]         = useState('');
  const [commission, setCommission] = useState('');
  const [saving, setSaving]     = useState(false);
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

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/api/payment-methods', {
        name: name.trim(),
        commission_pct: parseFloat(commission) || 0,
        active: true,
      });
      setName(''); setCommission('');
      await loadMethods();
    } catch (err) { showToast(err.message, 'error'); } finally { setSaving(false); }
  }

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
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleDelete(id) {
    setDeleteMethodId(null);
    try {
      await api.delete(`/api/payment-methods/${id}`);
      await loadMethods();
    } catch (err) { showToast(err.message, 'error'); }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">Agregar método de pago</h3>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Efectivo, Mercado Pago…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Comisión %</label>
            <input type="number" value={commission} onChange={e => setCommission(e.target.value)}
              placeholder="0" min="0" max="100" step="0.01"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" disabled={saving || !name.trim()}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar
          </button>
        </form>
      </div>

      {/* Methods list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Métodos configurados</h3>
          <span className="text-xs text-slate-400">{methods.length} método{methods.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-sm">Cargando…</div>
        ) : methods.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">No hay métodos de pago configurados.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {methods.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                {editId === m.id ? (
                  <>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input type="number" value={editComm} onChange={e => setEditComm(e.target.value)}
                      min="0" max="100" step="0.01" placeholder="0"
                      className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-400">%</span>
                    <button onClick={() => handleSaveEdit(m)} className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${m.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{m.name}</p>
                    </div>
                    {m.commission_pct > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        +{m.commission_pct}%
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {m.active ? 'Activo' : 'Inactivo'}
                    </span>
                    <button onClick={() => handleToggleActive(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Activar/desactivar">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
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

function ConfigTab() {
  const [period, setPeriod]       = useState('weekly');
  const [permissions, setPermissions] = useState({
    vendedor:  [...DEFAULT_VIEWS.vendedor],
    cajero:    [...DEFAULT_VIEWS.cajero],
    encargado: [...DEFAULT_VIEWS.encargado],
  });
  const [roleLabels, setRoleLabels] = useState({ vendedor: 'Vendedor', cajero: 'Cajero', encargado: 'Encargado' });
  const [editingLabel, setEditingLabel] = useState(null);
  const [editLabelValue, setEditLabelValue] = useState('');
  const [savingLabels, setSavingLabels] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [savingRole, setSavingRole] = useState(null);
  const [savedRole, setSavedRole] = useState(null);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/settings'),
      api.get('/api/settings/role-permissions'),
    ]).then(([settings, perms]) => {
      if (settings?.commission_period) setPeriod(settings.commission_period);
      if (settings?.role_labels && typeof settings.role_labels === 'object') {
        setRoleLabels(prev => ({ ...prev, ...settings.role_labels }));
      }
      if (perms && typeof perms === 'object') {
        const map = { vendedor: [...DEFAULT_VIEWS.vendedor], cajero: [...DEFAULT_VIEWS.cajero], encargado: [...DEFAULT_VIEWS.encargado] };
        // Backend returns { vendedor: [...], cajero: [...], encargado: [...] }
        Object.entries(perms).forEach(([role, views]) => { if (map[role]) map[role] = views; });
        setPermissions(map);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function toggleView(role, viewKey) {
    setPermissions(prev => {
      const current = prev[role] ?? [];
      const next = current.includes(viewKey)
        ? current.filter(v => v !== viewKey)
        : [...current, viewKey];
      return { ...prev, [role]: next };
    });
  }

  async function handleSaveLabels() {
    setSavingLabels(true); setError('');
    try {
      await api.put('/api/settings', { role_labels: roleLabels });
      setSuccess('Nombres de roles guardados.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSavingLabels(false); setEditingLabel(null); }
  }

  async function handleSavePeriod(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put('/api/settings', { commission_period: period });
      setSuccess('Período guardado correctamente.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleSaveRole(roleKey) {
    setSavingRole(roleKey); setError('');
    try {
      await api.put(`/api/settings/role-permissions/${roleKey}`, { allowed_views: permissions[roleKey] });
      setSavedRole(roleKey);
      setTimeout(() => setSavedRole(null), 2000);
    } catch (err) { setError(err.message); }
    finally { setSavingRole(null); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Cargando configuración...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {error   && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" /></svg>
        {error}
      </div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        {success}
      </div>}

      {/* Commission period */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Período de comisiones</h3>
            <p className="text-slate-400 text-xs mt-0.5">Define cómo se agrupan y visualizan las comisiones</p>
          </div>
        </div>
        <form onSubmit={handleSavePeriod} className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setPeriod(opt.value)}
                className={`relative flex flex-col items-center gap-3 px-4 py-5 rounded-xl border-2 transition-all text-center ${
                  period === opt.value
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}>
                {period === opt.value && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  period === opt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {opt.icon}
                </div>
                <div>
                  <p className={`text-sm font-semibold transition-colors ${
                    period === opt.value ? 'text-blue-700' : 'text-slate-800'
                  }`}>{opt.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-tight">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <button type="submit" disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />Guardando...</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Guardar período</>
            )}
          </button>
        </form>
      </div>

      {/* Role names */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Nombres de roles</h3>
              <p className="text-slate-400 text-xs mt-0.5">Personalizá cómo se llaman los roles en tu negocio</p>
            </div>
          </div>
          <button onClick={handleSaveLabels} disabled={savingLabels}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50">
            {savingLabels ? <><div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />Guardando</> : 'Guardar nombres'}
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {MANAGED_ROLES.map(roleObj => {
            const colors = CONFIG_ROLE_COLORS[roleObj.key];
            const isEditing = editingLabel === roleObj.key;
            return (
              <div key={roleObj.key} className="px-6 py-4 flex items-center gap-4">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide font-semibold">{roleObj.label}</p>
                  {isEditing ? (
                    <input autoFocus value={editLabelValue} onChange={e => setEditLabelValue(e.target.value)}
                      onBlur={() => { setRoleLabels(prev => ({ ...prev, [roleObj.key]: editLabelValue.trim() || roleObj.label })); setEditingLabel(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') { setRoleLabels(prev => ({ ...prev, [roleObj.key]: editLabelValue.trim() || roleObj.label })); setEditingLabel(null); } if (e.key === 'Escape') setEditingLabel(null); }}
                      className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
                  ) : (
                    <p className="text-base font-semibold text-slate-800">{roleLabels[roleObj.key] || roleObj.label}</p>
                  )}
                </div>
                <button onClick={() => { setEditingLabel(roleObj.key); setEditLabelValue(roleLabels[roleObj.key] || roleObj.label); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role permissions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Permisos de vistas por rol</h3>
            <p className="text-slate-400 text-xs mt-0.5">Controlá qué secciones puede ver cada rol</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {MANAGED_ROLES.map(roleObj => {
            const colors = CONFIG_ROLE_COLORS[roleObj.key];
            const isSaved = savedRole === roleObj.key;
            return (
              <div key={roleObj.key} className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                      {roleObj.label}
                    </span>
                    <span className="text-xs text-slate-400">{permissions[roleObj.key]?.length ?? 0} vistas activas</span>
                  </div>
                  <button onClick={() => handleSaveRole(roleObj.key)} disabled={savingRole === roleObj.key}
                    className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                      isSaved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}>
                    {savingRole === roleObj.key ? (
                      <><div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />Guardando</>
                    ) : isSaved ? (
                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Guardado</>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  {VIEW_OPTIONS.map(view => {
                    const on = permissions[roleObj.key]?.includes(view.key) ?? false;
                    return (
                      <div key={view.key} className="flex items-center justify-between">
                        <span className={`text-sm transition-colors ${on ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{view.label}</span>
                        <ViewToggle checked={on} onChange={() => toggleView(roleObj.key, view.key)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
