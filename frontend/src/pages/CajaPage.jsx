import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CashierQueue from './CashierQueue';
import CashMovementsPage from './CashMovementsPage';
import CashRegisterPage from './CashRegisterPage';
import RecuentosPage from './RecuentosPage';

export default function CajaPage() {
  const { hasRole, canSeeView, user } = useAuth();

  const canCola        = hasRole('cajero', 'encargado') && canSeeView('cashier');
  const canMovimientos = hasRole('dueno');
  const canArqueo      = hasRole('cajero', 'encargado', 'dueno') && !!user?.branch_id;
  const canRecuentos   = hasRole('dueno');

  const TABS = [
    canCola        && { key: 'cola',       label: 'Cola de Caja'     },
    canMovimientos && { key: 'movimientos', label: 'Movimientos'      },
    canArqueo      && { key: 'caja',        label: 'Apertura y Cierre' },
    canRecuentos   && { key: 'recuentos',   label: 'Recuentos'        },
  ].filter(Boolean);

  const [activeTab, setActiveTab] = useState(TABS[0]?.key ?? 'cola');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl px-5 py-5 sm:px-8 sm:py-6 mb-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full bg-cyan-300/20 pointer-events-none" />
        <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Caja</h1>
            <p className="text-blue-100 text-sm mt-1">Gestión de apertura, cierre y movimientos de caja</p>
          </div>
          {/* Tabs inside header */}
          <div className="flex gap-1 bg-white/20 rounded-xl p-1 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? 'bg-white text-blue-700' : 'text-white/80 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'cola'        && canCola        && <CashierQueue hideHeader />}
        {activeTab === 'movimientos' && canMovimientos && <CashMovementsPage hideHeader />}
        {activeTab === 'caja'        && canArqueo      && <CashRegisterPage hideHeader />}
        {activeTab === 'recuentos'   && canRecuentos   && <RecuentosPage hideHeader />}
      </div>
    </div>
  );
}
