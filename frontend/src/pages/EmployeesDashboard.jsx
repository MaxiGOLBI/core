import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function EmployeesDashboard() {
  const { hasRole } = useAuth();
  const [balances, setBalances] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('commissions');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [bal, com, disc, cls, prods, usrs] = await Promise.all([
        api.get('/api/commissions/balances'),
        api.get('/api/commissions'),
        api.get('/api/discounts'),
        api.get('/api/clients'),
        api.get('/api/products'),
        api.get('/api/users'),
      ]);
      setBalances(bal);
      setCommissions(com);
      setDiscounts(disc);
      setClients(cls);
      setProducts(prods);
      setUsers(usrs);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const tabs = [
    { key: 'commissions', label: 'Comisiones' },
    { key: 'clients_discounts', label: 'Clientes / Descuentos' },
    { key: 'balances', label: 'Saldos vendedores' },
    ...(hasRole('dueno') ? [{ key: 'users', label: 'Usuarios' }] : []),
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Panel de Empleados</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gestioná comisiones, descuentos, clientes y usuarios</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'balances' && <BalancesTab balances={balances} />}
      {activeTab === 'commissions' && (
        <CommissionsTab commissions={commissions} products={products} onRefresh={load} />
      )}
      {activeTab === 'clients_discounts' && (
        <ClientsDiscountsTab clients={clients} discounts={discounts} onRefresh={load} />
      )}
      {activeTab === 'users' && hasRole('dueno') && (
        <UsersTab users={users} onRefresh={load} />
      )}
    </div>
  );
}

function BalancesTab({ balances }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendedor</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Comisión acumulada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {balances.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
              <td className="px-4 py-3 text-slate-500">{b.email}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                ${parseFloat(b.commission_balance ?? 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommissionsTab({ commissions, products, onRefresh }) {
  const [form, setForm] = useState({ product_id: '', commission_per_unit: '', active: true });
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/commissions', {
        product_id: form.product_id,
        commission_per_unit: parseFloat(form.commission_per_unit),
        active: form.active,
      });
      setForm({ product_id: '', commission_per_unit: '', active: true });
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar comisión?')) return;
    await api.delete(`/api/commissions/${id}`);
    onRefresh();
  }

  async function handleToggle(c) {
    await api.put(`/api/commissions/${c.id}`, { commission_per_unit: c.commission_per_unit, active: !c.active });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex gap-4 flex-wrap items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Producto</label>
          <select
            value={form.product_id}
            onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleccionar...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Comisión por unidad ($)</label>
          <input
            type="number" min="0" step="0.01"
            value={form.commission_per_unit}
            onChange={(e) => setForm((f) => ({ ...f, commission_per_unit: e.target.value }))}
            required
            placeholder="0.00"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
          />
        </div>
        {error && <p className="text-red-600 text-xs self-end">{error}</p>}
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
          Agregar
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Comisión/u</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Activo</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {commissions.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{c.products?.name ?? c.product_id}</td>
                <td className="px-4 py-3 text-right text-slate-700">${parseFloat(c.commission_per_unit).toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(c)}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
                      c.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {c.active ? 'Sí' : 'No'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientsDiscountsTab({ clients, discounts, onRefresh }) {
  const [clientForm, setClientForm] = useState({ name: '', discount_type: 'fixed', discount_value: '' });
  const [discountForm, setDiscountForm] = useState({ name: '', discount_type: 'fixed', discount_value: '', active: true });
  const [error, setError] = useState('');

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
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteClient(id) {
    if (!confirm('¿Eliminar cliente?')) return;
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
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteDiscount(id) {
    if (!confirm('¿Eliminar descuento?')) return;
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
    <div className="space-y-8">
      {/* ── CLIENTES ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Clientes</h2>
        <form onSubmit={handleCreateClient} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
            <input
              value={clientForm.name}
              onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Nombre del cliente"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Descuento predeterminado</label>
            <div className="flex items-center gap-2">
              <select
                value={clientForm.discount_type}
                onChange={(e) => setClientForm((f) => ({ ...f, discount_type: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="fixed">$ Neto</option>
                <option value="percent">% Porcentaje</option>
              </select>
              <input
                type="number" min="0" step="0.01"
                value={clientForm.discount_value}
                onChange={(e) => setClientForm((f) => ({ ...f, discount_value: e.target.value }))}
                placeholder={clientForm.discount_type === 'percent' ? '0' : '0.00'}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs self-end">{error}</p>}
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
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
                    <button onClick={() => handleDeleteClient(c.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CATÁLOGO DE DESCUENTOS ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Catálogo de descuentos</h2>
        <form onSubmit={handleCreateDiscount} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
            <input
              value={discountForm.name}
              onChange={(e) => setDiscountForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Nombre del descuento"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo y valor</label>
            <div className="flex items-center gap-2">
              <select
                value={discountForm.discount_type}
                onChange={(e) => setDiscountForm((f) => ({ ...f, discount_type: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="fixed">$ Neto</option>
                <option value="percent">% Porcentaje</option>
              </select>
              <input
                type="number" min="0" step="0.01"
                value={discountForm.discount_value}
                onChange={(e) => setDiscountForm((f) => ({ ...f, discount_value: e.target.value }))}
                placeholder={discountForm.discount_type === 'percent' ? '0' : '0.00'}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
              />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Agregar
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
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
                    <button onClick={() => handleDeleteDiscount(d.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
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
  );
}

function ClientsTab({ clients, onRefresh }) {
  const [form, setForm] = useState({ name: '', discount_type: 'fixed', discount_value: '' });
  const [error, setError] = useState('');

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
    if (!confirm('¿Eliminar cliente?')) return;
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
            <input
              type="number" min="0" step="0.01"
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
              placeholder={form.discount_type === 'percent' ? '0' : '0.00'}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-xs self-end">{error}</p>}
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
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
                  <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  dueno: 'bg-indigo-100 text-indigo-700',
};

function UsersTab({ users, onRefresh }) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'vendedor' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingRole, setEditingRole] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/api/users', form);
      setForm({ name: '', email: '', password: '', role: 'vendedor' });
      setSuccess('Usuario creado correctamente.');
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await api.delete(`/api/users/${id}`);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRoleChange(id) {
    try {
      await api.put(`/api/users/${id}/role`, { role: editingRole.role });
      setEditingRole(null);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Crear nuevo usuario</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Nombre completo"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
            <input
              type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="correo@ejemplo.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Contraseña inicial</label>
            <input
              type="password" value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS_MAP[r]}</option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mt-3">
            <p className="text-red-700 text-xs">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 mt-3">
            <p className="text-emerald-700 text-xs">{success}</p>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Crear usuario
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
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
                  {editingRole?.id === u.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <select
                        value={editingRole.role}
                        onChange={(e) => setEditingRole({ id: u.id, role: e.target.value })}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS_MAP[r]}</option>
                        ))}
                      </select>
                      <button onClick={() => handleRoleChange(u.id)} className="text-emerald-600 hover:text-emerald-800 font-bold text-sm">✓</button>
                      <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-600 text-sm">×</button>
                    </div>
                  ) : (
                    <span
                      className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold cursor-pointer hover:opacity-80 transition-opacity ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}
                      onClick={() => u.id !== currentUser?.id && setEditingRole({ id: u.id, role: u.role })}
                      title={u.id !== currentUser?.id ? 'Clic para cambiar rol' : ''}
                    >
                      {ROLE_LABELS_MAP[u.role] ?? u.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.id !== currentUser?.id && (
                    <button onClick={() => handleDelete(u.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium transition-colors">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
