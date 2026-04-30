# CoreReal — Sistema de Gestión de Ventas

Aplicación web para gestionar ventas, stock, comisiones, clientes y comprobantes de compra en una tienda de celulares. Incluye sistema de mesas/cola de caja y acceso por roles.

**Stack:**
- **Frontend:** React 19 + Vite + TailwindCSS v4
- **Backend:** Node.js + Express 5
- **Base de datos, Auth y Realtime:** Supabase (PostgreSQL)

---

## Estructura del proyecto

```
corereal/
├── frontend/                   # SPA React (Vite)
│   └── src/
│       ├── assets/             # Imágenes y recursos estáticos
│       ├── components/         # Componentes reutilizables
│       │   ├── ComprobanteModal.jsx   # Modal para ver/imprimir comprobantes
│       │   ├── Navbar.jsx             # Barra de navegación principal
│       │   └── ProtectedRoute.jsx     # Guard de rutas por rol
│       ├── context/
│       │   └── AuthContext.jsx        # Estado global de autenticación
│       ├── lib/
│       │   ├── api.js                 # Helper centralizado de fetch al backend
│       │   └── supabaseClient.js      # Instancia del cliente Supabase
│       └── pages/
│           ├── LoginPage.jsx          # Inicio de sesión
│           ├── RegisterPage.jsx       # Registro de usuarios
│           ├── TablesBoard.jsx        # Tablero de mesas (vista principal)
│           ├── TableEditor.jsx        # Editor de layout de mesas
│           ├── CashierQueue.jsx       # Cola de caja para cajeros
│           ├── SalesHistory.jsx       # Historial de ventas y comprobantes
│           ├── StockList.jsx          # Gestión de stock y productos
│           ├── BranchesPage.jsx       # Listado de sucursales
│           ├── BranchDetailPage.jsx   # Detalle y config de una sucursal
│           ├── EmployeesDashboard.jsx # Panel de empleados y comisiones
│
├── backend/                    # API REST Node.js + Express
│   ├── index.js                # Punto de entrada, registro de rutas y cron jobs
│   └── src/
│       ├── config/
│       │   └── supabase.js           # Cliente Supabase (service role)
│       ├── jobs/
│       │   └── commissionReset.js    # Cron job: reset semanal de comisiones (domingos)
│       ├── middleware/
│       │   └── auth.js               # Middleware de verificación JWT (Supabase)
│       ├── routes/
│       │   ├── auth.js               # Autenticación (login, register)
│       │   ├── users.js              # Gestión de usuarios y roles
│       │   ├── branches.js           # Sucursales
│       │   ├── clients.js            # Clientes
│       │   ├── products.js           # Productos
│       │   ├── stock.js              # Stock
│       │   ├── sales.js              # Ventas y cierre de mesa
│       │   ├── commissions.js        # Comisiones de vendedores
│       │   ├── discounts.js          # Descuentos por mesa
│       │   └── tables.js             # Mesas y estados
│       └── services/
│           └── ticket.js             # Generación de tickets PDF (comprobantes de compra)
│
└── database/                   # Scripts SQL para ejecutar en Supabase
    ├── add_branches.sql          # Tabla de sucursales y multi-empresa
    ├── add_multi_company.sql     # Soporte multi-empresa
    ├── add_faulty_column.sql     # Columna de productos defectuosos
    ├── add_table_discount.sql    # Descuentos por mesa
    └── add_table_discount_name.sql  # Nombre de descuentos
```

---

## Roles de usuario

| Rol        | Permisos                                              |
|------------|-------------------------------------------------------|
| `vendedor` | Gestionar mesas, agregar productos, cerrar ventas     |
| `cajero`   | Cola de caja, cobrar y emitir comprobantes            |
| `encargado`| Todo lo anterior + stock, clientes y empleados        |
| `dueño`    | Acceso completo, configuración de sucursales          |

---

## Cómo ejecutar el proyecto

### Prerrequisitos

- Node.js 18+
- Una cuenta en [Supabase](https://supabase.com)

### 1. Configurar la base de datos (Supabase)

1. Pedir acceso a la bd hecha
   ```

### 2. Backend

```bash
cd backend
```

Crear el archivo de variables de entorno:

```bash
# Copiar el ejemplo (si existe) o crear .env manualmente
cp .env.example .env
```

Contenido del `.env`:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
PORT=3001
```

Instalar dependencias e iniciar:

```bash
npm install
npm start          # producción
npm run dev        # desarrollo con hot-reload (node --watch)
```

El servidor queda disponible en `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
```

Crear el archivo de variables de entorno:

```bash
cp .env.example .env
```

Contenido del `.env`:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_public_key>
VITE_API_URL=http://localhost:3001
```

Instalar dependencias e iniciar:

```bash
npm install
npm run dev        # desarrollo → http://localhost:5173
npm run build      # build de producción → dist/
npm run preview    # previsualizar build
```

> El proxy de Vite redirige `/api` al backend en puerto 3001 automáticamente en desarrollo.

---

## Variables de entorno

Las claves se obtienen desde el dashboard de Supabase en **Settings → API**.

| Variable                  | Dónde         | Descripción                        |
|---------------------------|---------------|------------------------------------|
| `SUPABASE_URL`            | backend/.env  | URL del proyecto Supabase          |
| `SUPABASE_SERVICE_KEY`    | backend/.env  | Clave service_role (secreta)       |
| `VITE_SUPABASE_URL`       | frontend/.env | URL del proyecto Supabase          |
| `VITE_SUPABASE_ANON_KEY`  | frontend/.env | Clave anon/public                  |
| `VITE_API_URL`            | frontend/.env | URL del backend (default: 3001)    |

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
