import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TablesBoard from './pages/TablesBoard';
import VendorSalesPage from './pages/VendorSalesPage';
import TableEditor from './pages/TableEditor';
import CashierQueue from './pages/CashierQueue';
import CajaPage from './pages/CajaPage';
import StockList from './pages/StockList';
import SalesHistory from './pages/SalesHistory';
import EmployeesDashboard from './pages/EmployeesDashboard';
import BranchesPage from './pages/BranchesPage';
import BranchDetailPage from './pages/BranchDetailPage';
import GastosPage from './pages/GastosPage';
import CommissionHistory from './pages/CommissionHistory';
import PriceList from './pages/PriceList';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import ServicePage from './pages/ServicePage';
import CashRegisterPage from './pages/CashRegisterPage';
import CashMovementsPage from './pages/CashMovementsPage';
import CashFlowPage from './pages/CashFlowPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import IncomeStatementPage from './pages/IncomeStatementPage';
import SalesByCategoryPage from './pages/SalesByCategoryPage';
import NetProfitByPaymentPage from './pages/NetProfitByPaymentPage';
import ClientBalancePage from './pages/ClientBalancePage';
import CreditNotesPage from './pages/CreditNotesPage';
import ExportHistoryPage from './pages/ExportHistoryPage';
import FiscalReceiptsPage from './pages/FiscalReceiptsPage';
import TaxWithholdingsPage from './pages/TaxWithholdingsPage';
import MySalesHistoryPage from './pages/MySalesHistoryPage';
import { ToastContainer } from './components/Toast';
import './styles.css';

function DefaultPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'cajero') return <Navigate to="/caja" replace />;
  if (user.role === 'dueno') return <Navigate to="/employees" replace />;
  if (user.role === 'vendedor') return <Navigate to="/mis-ventas" replace />;
  if (user.role === 'encargado') return <Navigate to="/mis-ventas" replace />;
  return <Navigate to="/tables" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-100">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<DefaultPage />} />
        <Route path="/mis-ventas" element={<ProtectedRoute roles={['vendedor', 'cajero', 'encargado']}><VendorSalesPage /></ProtectedRoute>} />
        <Route path="/my-sales-history" element={<ProtectedRoute roles={['vendedor', 'cajero', 'encargado', 'dueno']}><MySalesHistoryPage /></ProtectedRoute>} />
        <Route path="/tables" element={<ProtectedRoute roles={['vendedor', 'cajero', 'encargado']} viewKey="tables"><TablesBoard /></ProtectedRoute>} />
        <Route path="/tables/:id/edit" element={<ProtectedRoute roles={['vendedor', 'cajero', 'encargado']} viewKey="tables"><TableEditor /></ProtectedRoute>} />
        <Route path="/cashier" element={<ProtectedRoute roles={['cajero', 'encargado']} viewKey="cashier"><CashierQueue /></ProtectedRoute>} />
        <Route path="/caja" element={<ProtectedRoute roles={['cajero', 'encargado', 'dueno']}><CajaPage /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute viewKey="stock"><StockList /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute viewKey="sales"><SalesHistory /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute roles={['encargado', 'dueno']} viewKey="employees"><EmployeesDashboard /></ProtectedRoute>} />
        <Route path="/branches" element={<ProtectedRoute roles={['dueno']}><BranchesPage /></ProtectedRoute>} />
        <Route path="/branches/:id" element={<ProtectedRoute roles={['dueno']}><BranchDetailPage /></ProtectedRoute>} />
        <Route path="/gastos" element={<ProtectedRoute roles={['dueno']}><GastosPage /></ProtectedRoute>} />
        <Route path="/payment-methods" element={<ProtectedRoute roles={['dueno']}><PaymentMethodsPage /></ProtectedRoute>} />
        <Route path="/service" element={<ProtectedRoute roles={['encargado', 'dueno']}><ServicePage /></ProtectedRoute>} />
        <Route path="/cash" element={<ProtectedRoute roles={['cajero', 'encargado', 'dueno']} viewKey="cash"><CashRegisterPage /></ProtectedRoute>} />
        <Route path="/cash/movements" element={<ProtectedRoute roles={['dueno']}><CashMovementsPage /></ProtectedRoute>} />
        <Route path="/cash/flow" element={<ProtectedRoute roles={['dueno']}><CashFlowPage /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute roles={['encargado', 'dueno']}><SuppliersPage /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute roles={['encargado', 'dueno']}><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="/reports/income-statement" element={<ProtectedRoute roles={['dueno']}><IncomeStatementPage /></ProtectedRoute>} />
        <Route path="/reports/sales-by-category" element={<ProtectedRoute roles={['dueno']}><SalesByCategoryPage /></ProtectedRoute>} />
        <Route path="/reports/net-profit-by-payment" element={<ProtectedRoute roles={['dueno']}><NetProfitByPaymentPage /></ProtectedRoute>} />
        <Route path="/clients/balance" element={<ProtectedRoute roles={['dueno']}><ClientBalancePage /></ProtectedRoute>} />
        <Route path="/credit-notes" element={<ProtectedRoute roles={['cajero', 'encargado', 'dueno']}><CreditNotesPage /></ProtectedRoute>} />
        <Route path="/export-history" element={<ProtectedRoute roles={['dueno']}><ExportHistoryPage /></ProtectedRoute>} />
        <Route path="/fiscal/receipts" element={<ProtectedRoute roles={['cajero', 'encargado', 'dueno']}><FiscalReceiptsPage /></ProtectedRoute>} />
        <Route path="/tax-withholdings" element={<ProtectedRoute roles={['dueno']}><TaxWithholdingsPage /></ProtectedRoute>} />
        <Route path="/my-commissions" element={<ProtectedRoute roles={['vendedor', 'encargado']} viewKey="commissions"><CommissionHistory /></ProtectedRoute>} />
        <Route path="/prices" element={<ProtectedRoute viewKey="prices"><PriceList /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}

// --- OLD SCAFFOLD BELOW (kept to avoid breaking build) ---
function _OldScaffold() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}
