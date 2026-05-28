require('dotenv').config();

// Prevent silent crashes from unhandled async errors — log them instead
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled promise rejection:', reason);
});

const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const stockRoutes = require('./src/routes/stock');
const tableRoutes = require('./src/routes/tables');
const salesRoutes = require('./src/routes/sales');
const clientRoutes = require('./src/routes/clients');
const discountRoutes = require('./src/routes/discounts');
const commissionRoutes = require('./src/routes/commissions');
const userRoutes = require('./src/routes/users');
const branchRoutes  = require('./src/routes/branches');
const expenseRoutes = require('./src/routes/expenses');
const categoryRoutes = require('./src/routes/categories');
const settingsRoutes = require('./src/routes/settings');
const pricesRoutes   = require('./src/routes/prices');
const expenseCategoryRoutes = require('./src/routes/expense_categories');
const paymentMethodRoutes   = require('./src/routes/payment_methods');
const serviceRoutes         = require('./src/routes/service');
const cashRoutes            = require('./src/routes/cash');
const reportsRoutes         = require('./src/routes/reports');
const supplierRoutes        = require('./src/routes/suppliers');
const purchaseOrderRoutes   = require('./src/routes/purchase_orders');
const creditNoteRoutes      = require('./src/routes/credit_notes');
const remitoRoutes          = require('./src/routes/remitos');
const exportLogRoutes       = require('./src/routes/export_logs');
const fiscalRoutes          = require('./src/routes/fiscal');
const taxWithholdingRoutes  = require('./src/routes/tax_withholdings');
const { startCommissionReset } = require('./src/jobs/commissionReset');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware [REH, IV]
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/service-orders', serviceRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/remitos', remitoRoutes);
app.use('/api/export-logs', exportLogRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/tax-withholdings', taxWithholdingRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Global error handler [REH]
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start scheduled jobs
startCommissionReset();

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
