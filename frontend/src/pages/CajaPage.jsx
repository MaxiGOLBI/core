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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 shadow">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <svg className="w-6 h-6 text-white opacity-80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a4 4 0 00-8 0v2M5 21h14a2 2 0 002-2v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z" />
          </svg>
          <h1 className="text-xl font-bold text-white">Caja</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
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
