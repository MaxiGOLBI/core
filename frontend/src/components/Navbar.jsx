import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

const ROLE_LABELS = {
  vendedor: 'Vendedor',
  cajero: 'Cajero',
  encargado: 'Encargado',
  dueno: 'Dueño',
};

function navClass({ isActive }) {
  return `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
    isActive
      ? 'bg-white text-blue-900 shadow-md'
      : 'text-slate-300 hover:bg-white/15 hover:text-white hover:shadow-sm'
  }`;
}

function mobileNavClass({ isActive }) {
  return `flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
    isActive
      ? 'bg-white text-blue-900 shadow-md'
      : 'text-slate-300 hover:bg-white/15 hover:text-white'
  }`;
}

// ── Nav icons ─────────────────────────────────────────────────
function IconTickets({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function IconCaja({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}
function IconStock({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
    </svg>
  );
}
function IconVentas({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconEmpleados({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconSucursales({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function IconGastos({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function IconPrecios({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}
function IconPaymentMethods({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}
function IconPedidos({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}
function IconProveedores({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
function IconFlujoCaja({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  );
}
function IconMovimientos({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
    </svg>
  );
}
function IconApertura({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}
function IconService({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}
function IconEstadoResultados({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function IconVentasPorRubro({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    </svg>
  );
}
function IconGananciaNet({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}
function IconCuentasCorrientes({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
function IconNotasCD({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
function IconExportHistory({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
function IconFiscal({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function IconRetenciones({ active }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout, hasRole, canSeeView, periodBalance } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [queueCount, setQueueCount]   = useState(0);
  const profileRef = useRef(null);

  const canSeeCaja = hasRole('cajero', 'encargado', 'dueno') && !!user?.branch_id && canSeeView('cashier');

  // Live queue count for Caja badge
  useEffect(() => {
    if (!canSeeCaja) return;
    const refresh = () =>
      api.get('/api/tables')
        .then(data => setQueueCount(data.filter(t => t.status === 'confirmed').length))
        .catch(() => {});
    refresh();
    const ch = supabase
      .channel('navbar_queue_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables_queue' }, refresh)
      .subscribe();
    return () => supabase.removeChannel(ch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeCaja]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';

  const NavLinks = ({ mobile = false }) => {
    const cls = mobile ? mobileNavClass : navClass;
    const close = mobile ? () => setMenuOpen(false) : undefined;
    return (
      <>
        {hasRole('vendedor', 'cajero', 'encargado') && (
          <NavLink to="/mis-ventas" className={cls} onClick={close}>
            {({ isActive }) => (<><IconVentas active={isActive} />Ventas</>)}
          </NavLink>
        )}
        {(canSeeCaja || hasRole('encargado', 'dueno')) && (
          <NavLink to="/caja" className={cls} onClick={close}>
            {({ isActive }) => (
              <>
                <IconCaja active={isActive} />
                Caja
                {queueCount > 0 && (
                  <span className={`text-xs font-bold min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full flex items-center justify-center leading-none ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-amber-400 text-amber-900'
                  }`}>
                    {queueCount > 9 ? '9+' : queueCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        )}
        {canSeeView('stock') && user?.branch_id && (
          <NavLink to="/stock" className={cls} onClick={close}>
            {({ isActive }) => (<><IconStock active={isActive} />Stock</>)}
          </NavLink>
        )}
        {canSeeView('sales') && user?.branch_id && !hasRole('vendedor') && (
          <NavLink to="/sales" className={cls} onClick={close}>
            {({ isActive }) => (<><IconVentas active={isActive} />Ventas</>)}
          </NavLink>
        )}
        {canSeeView('prices') && !hasRole('dueno') && (
          <NavLink to="/prices" className={cls} onClick={close}>
            {({ isActive }) => (<><IconPrecios active={isActive} />Precios</>)}
          </NavLink>
        )}
        {hasRole('encargado', 'dueno') && canSeeView('employees') && (
          <NavLink to="/employees" className={cls} onClick={close}>
            {({ isActive }) => (<><IconEmpleados active={isActive} />Empleados</>)}
          </NavLink>
        )}
        {hasRole('encargado') && (
          <NavLink to="/service" className={cls} onClick={close}>
            {({ isActive }) => (<><IconService active={isActive} />Servicio</>)}
          </NavLink>
        )}
        {hasRole('encargado', 'dueno') && (
          <NavLink to="/purchase-orders" className={cls} onClick={close}>
            {({ isActive }) => (<><IconPedidos active={isActive} />Pedidos</>)}
          </NavLink>
        )}
        {hasRole('encargado', 'dueno') && (
          <NavLink to="/suppliers" className={cls} onClick={close}>
            {({ isActive }) => (<><IconProveedores active={isActive} />Proveedores</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/cash/flow" className={cls} onClick={close}>
            {({ isActive }) => (<><IconFlujoCaja active={isActive} />Flujo Caja</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/branches" className={cls} onClick={close}>
            {({ isActive }) => (<><IconSucursales active={isActive} />Sucursales</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/gastos" className={cls} onClick={close}>
            {({ isActive }) => (<><IconGastos active={isActive} />Gastos</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/reports/income-statement" className={cls} onClick={close}>
            {({ isActive }) => (<><IconEstadoResultados active={isActive} />Resultados</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/reports/sales-by-category" className={cls} onClick={close}>
            {({ isActive }) => (<><IconVentasPorRubro active={isActive} />Ventas Rubro</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/reports/net-profit-by-payment" className={cls} onClick={close}>
            {({ isActive }) => (<><IconGananciaNet active={isActive} />Ganancia Neta</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/payment-methods" className={cls} onClick={close}>
            {({ isActive }) => (<><IconPaymentMethods active={isActive} />Métodos de pago</>)}
          </NavLink>
        )}
        {hasRole('cajero', 'encargado', 'dueno') && (
          <NavLink to="/credit-notes" className={cls} onClick={close}>
            {({ isActive }) => (<><IconNotasCD active={isActive} />N. Crédito</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/export-history" className={cls} onClick={close}>
            {({ isActive }) => (<><IconExportHistory active={isActive} />Exportaciones</>)}
          </NavLink>
        )}
        {hasRole('cajero', 'encargado', 'dueno') && (
          <NavLink to="/fiscal/receipts" className={cls} onClick={close}>
            {({ isActive }) => (<><IconFiscal active={isActive} />Fiscal</>)}
          </NavLink>
        )}
        {hasRole('dueno') && (
          <NavLink to="/tax-withholdings" className={cls} onClick={close}>
            {({ isActive }) => (<><IconRetenciones active={isActive} />Retenciones</>)}
          </NavLink>
        )}
      </>
    );
  };

  return (
    <nav className="bg-gradient-to-r from-blue-900 to-blue-700 border-b border-blue-800 sticky top-0 z-10 shadow-md">
      <div className="px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <span className="font-bold text-cyan-300 text-xl tracking-tight">Core</span>
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLinks />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop user info with profile dropdown */}
          <div className="hidden sm:block relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-white/10 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm select-none">
                {initial}
              </div>
              <div className="text-sm leading-tight text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-white">{user?.name}</span>
                  <span className="text-xs text-indigo-200 bg-white/20 px-2 py-0.5 rounded-full font-medium">
                    {ROLE_LABELS[user?.role] ?? user?.role}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-indigo-300">Saldo:</span>
                  <span className="text-xs font-semibold text-emerald-300">
                    {user?.role === 'dueno'
                      ? `$${(user?.commission_balance ?? 0).toFixed(2)}`
                      : periodBalance !== null
                        ? `$${periodBalance.toFixed(2)}`
                        : '···'}
                  </span>
                </div>
              </div>
              <svg className={`w-3.5 h-3.5 text-indigo-300 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                {hasRole('vendedor', 'encargado') && (
                  <NavLink
                    to="/my-commissions"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
                    </svg>
                    Historial de comisiones
                  </NavLink>
                )}
                <NavLink
                  to="/my-sales-history"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Historial de ventas
                </NavLink>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
                    </svg>
                    Salir
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors gap-1.5"
            aria-label="Menú"
          >
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-blue-800 bg-blue-900/95 px-4 py-3 space-y-1">
          <NavLinks mobile />
          <div className="border-t border-blue-800 mt-3 pt-3">
            {hasRole('vendedor', 'encargado') && (
              <NavLink
                to="/my-commissions"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
                </svg>
                Mis comisiones
              </NavLink>
            )}
            <NavLink
              to="/my-sales-history"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Historial de ventas
            </NavLink>
          </div>
          <div className="border-t border-blue-800 mt-2 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-xs select-none">
                {initial}
              </div>
              <div className="text-sm leading-tight">
                <div className="font-medium text-white">{user?.name}</div>
                <div className="text-xs text-indigo-300">
                  Saldo: <span className="font-semibold text-emerald-300">
                    {user?.role === 'dueno'
                      ? `$${(user?.commission_balance ?? 0).toFixed(2)}`
                      : periodBalance !== null
                        ? `$${periodBalance.toFixed(2)}`
                        : '···'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-indigo-200 hover:text-white border border-indigo-400/50 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
