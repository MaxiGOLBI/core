require('dotenv').config();

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
