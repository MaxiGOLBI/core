# CoreReal — Sales Management App

## Overview
Web application for managing sales with a table/queue system for a cell phone store. Features: tables, stock, commissions, discounts, clients, and role-based access.

**Stack:**
- Frontend: React + Vite + TailwindCSS
- Backend: Node.js + Express
- Database & Auth: Supabase (Postgres + Auth + Realtime)

---

## Project Structure

```
corereal/
  frontend/          # React SPA (Vite)
  backend/           # Node.js Express API
  database/          # SQL functions (run in Supabase SQL editor)
  Lista_tareas.md    # Task list
  README.md
```

---

## Setup

### 1. Supabase
1. Create a Supabase project at https://supabase.com
2. The database tables are already defined (see `Lista_tareas.md` for schema)
3. Run `database/complete_sale.sql` in the Supabase SQL editor

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_KEY from Supabase dashboard > Settings > API
npm start
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase dashboard > Settings > API
npm run dev
```

---

## Roles & Permissions

| Feature              | vendedor | cajero | encargado | dueño |
|---------------------|----------|--------|-----------|-------|
| Create/edit tables  | ✓        |        | ✓         | ✓     |
| Confirm tables      | ✓        |        | ✓         | ✓     |
| Cashier queue       |          | ✓      | ✓         | ✓     |
| Complete/cancel sale|          | ✓      | ✓         | ✓     |
| View stock          | ✓        | ✓      | ✓         | ✓     |
| Edit products       |          |        | ✓         | ✓     |
| View sales          | own only | ✓      | ✓         | ✓     |
| Export sales        |          |        | ✓         | ✓     |
| Manage employees    |          |        | ✓         | ✓     |
| Manage discounts    |          |        | ✓         | ✓     |
| Manage clients      |          | ✓      | ✓         | ✓     |

---

## API Endpoints

| Method | Path                         | Description                    |
|--------|------------------------------|--------------------------------|
| POST   | /api/auth/login              | Login                          |
| POST   | /api/auth/logout             | Logout                         |
| GET    | /api/products                | List products                  |
| POST   | /api/products                | Create product                 |
| PUT    | /api/products/:id            | Update product                 |
| DELETE | /api/products/:id            | Delete product                 |
| GET    | /api/stock                   | List stock with color levels   |
| PATCH  | /api/stock/:id               | Update stock quantity          |
| GET    | /api/tables                  | List active tables             |
| POST   | /api/tables                  | Create table                   |
| GET    | /api/tables/:id              | Get table detail               |
| PUT    | /api/tables/:id              | Update table items             |
| POST   | /api/tables/:id/confirm      | Confirm table (→ cashier queue)|
| POST   | /api/tables/:id/complete     | Complete sale (cashier)        |
| POST   | /api/tables/:id/cancel       | Cancel table                   |
| DELETE | /api/tables/:id              | Delete open table              |
| GET    | /api/sales                   | Sales history with filters     |
| GET    | /api/sales/export            | Export CSV/XLSX                |
| GET    | /api/clients                 | List clients                   |
| POST   | /api/clients                 | Create client                  |
| PUT    | /api/clients/:id             | Update client                  |
| DELETE | /api/clients/:id             | Delete client                  |
| GET    | /api/discounts               | List discounts                 |
| POST   | /api/discounts               | Create discount                |
| PUT    | /api/discounts/:id           | Update discount                |
| DELETE | /api/discounts/:id           | Delete discount                |
| GET    | /api/commissions             | List commissions               |
| POST   | /api/commissions             | Create commission rule         |
| PUT    | /api/commissions/:id         | Update commission rule         |
| DELETE | /api/commissions/:id         | Delete commission rule         |
| GET    | /api/commissions/balances    | Seller commission balances     |

---

## Key Features

- **Realtime cashier queue**: Uses Supabase Realtime to push confirmed tables to cashier instantly
- **Stock color thresholds**: >50 green, 15–50 yellow, ≤15 red
- **Weekly commission reset**: Cron job every Sunday at midnight resets seller balances
- **complete_sale SQL function**: Atomic transaction — creates sale, decrements stock, accumulates commissions, updates audit log
- **Role-based routing**: Frontend redirects based on user role; backend enforces permissions on every endpoint

---

## Maintenance

- **Add new users**: Create in Supabase Auth, then insert a row in the `users` table with the matching `id` and desired `role`
- **Supabase service key**: Never expose `SUPABASE_SERVICE_KEY` to the frontend
- **Commission reset**: Runs automatically; can also be triggered manually via the Supabase SQL editor
