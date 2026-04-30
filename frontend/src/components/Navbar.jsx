import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  vendedor: 'Vendedor',
  cajero: 'Cajero',
  encargado: 'Encargado',
  dueno: 'Dueño',
};

function navClass({ isActive }) {
  return `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white/15 text-white'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`;
}

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <nav className="bg-slate-900 border-b border-slate-700 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-8">
        <span className="font-bold text-indigo-400 text-xl tracking-tight">Core</span>
        <div className="flex items-center gap-1">
          {hasRole('vendedor', 'cajero', 'encargado') && (
            <NavLink to="/tables" className={navClass}>Tickets</NavLink>
          )}
          {hasRole('cajero', 'encargado', 'dueno') && user?.branch_id && (
            <NavLink to="/cashier" className={navClass}>Caja</NavLink>
          )}
          {hasRole('encargado', 'dueno', 'cajero', 'vendedor') && user?.branch_id && (
            <NavLink to="/stock" className={navClass}>Stock</NavLink>
          )}
          {hasRole('encargado', 'dueno', 'cajero', 'vendedor') && user?.branch_id && (
            <NavLink to="/sales" className={navClass}>Ventas</NavLink>
          )}
          {hasRole('encargado', 'dueno') && (
            <NavLink to="/employees" className={navClass}>Empleados</NavLink>
          )}
          {hasRole('dueno') && (
            <NavLink to="/branches" className={navClass}>Sucursales</NavLink>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold text-sm select-none">
            {initial}
          </div>
          <div className="text-sm leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-white">{user?.name}</span>
              <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full font-medium">
                {ROLE_LABELS[user?.role] ?? user?.role}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-slate-400">Saldo:</span>
              <span className="text-xs font-semibold text-emerald-400">
                ${(user?.commission_balance ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-700 transition-colors font-medium"
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
