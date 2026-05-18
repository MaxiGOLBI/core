import { useState } from 'react';
import CashFlowPage from './CashFlowPage';
import SalesByCategoryPage from './SalesByCategoryPage';
import NetProfitByPaymentPage from './NetProfitByPaymentPage';

const TABS = [
  {
    key: 'flujo',
    label: 'Flujo de Caja',
    desc: 'Ingresos, egresos y saldo acumulado',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    component: <CashFlowPage />,
  },
  {
    key: 'rubro',
    label: 'Ventas por Rubro',
    desc: 'Distribución de ventas por categoría',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
      </svg>
    ),
    component: <SalesByCategoryPage />,
  },
  {
    key: 'ganancia',
    label: 'Ganancia Neta',
    desc: 'Resultado neto por método de cobro',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    component: <NetProfitByPaymentPage />,
  },
];

export default function MetricasPage() {
  const [active, setActive] = useState('flujo');

  const current = TABS.find(t => t.key === active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {TABS.map(tab => {
              const isActive = tab.key === active;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActive(tab.key)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-1 justify-center ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Breadcrumb / descripción activa */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-600">Métricas</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-blue-600 font-medium">{current?.label}</span>
          <span className="text-slate-300">·</span>
          <span>{current?.desc}</span>
        </div>
      </div>

      {/* Content — only the active tab is rendered */}
      <div key={active}>
        {current?.component}
      </div>
    </div>
  );
}
