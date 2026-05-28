# Changelog — Sesión de desarrollo Facundo
**Fecha**: 14-15/05/2026  
**Rama**: rama de Nacho (descargada por Facundo)   
**Método de coordinación**: `API_CONTRACT.md` como interfaz de seguimiento

---

## Contexto

Se tomaron 17 tareas asignadas por el compañero Nacho y se implementaron en su totalidad en una sola sesión. El sistema es un CRM de ventas para un comercio de tecnología (celulares, fundas, arreglos). Stack: React+Vite / Node+Express / Supabase.

---

## BLOQUE 1 — Caja

### Tarea 1 — Arqueo / Apertura / Cierre de Caja

**Por qué**: El sistema no tenía forma de registrar la apertura y cierre diario de caja ni hacer un arqueo. Era necesario como base para el flujo de caja y los movimientos.

**Backend**
- `database/add_cash_sessions.sql` — Tablas `cash_sessions` (una sesión abierta por sucursal a la vez) y `cash_movements` (cada ingreso/egreso vinculado a la sesión). RLS con service_role + SELECT para authenticated.
- `backend/src/routes/cash.js` — 7 endpoints: `POST /open`, `POST /close`, `GET /status`, `GET /arqueo`, `GET /sessions`, `GET /sessions/:id`, `POST /movements`. El cierre calcula automáticamente el monto esperado y la diferencia. El arqueo devuelve el detalle de todos los movimientos en tiempo real.
- `backend/index.js` — registrado `app.use('/api/cash', cashRoutes)`.

**Frontend**
- `frontend/src/pages/CashRegisterPage.jsx` — Página completa: formulario de apertura, panel de caja abierta con KPIs (inicial/esperado/diferencia), botones de ingreso/egreso manual, arqueo desplegable, cierre de caja con input de monto contado.
- `frontend/src/App.jsx` — ruta `/cash` con ProtectedRoute para cajero/encargado/dueño.
- `frontend/src/components/Navbar.jsx` — NavLink "Apertura" con ícono billetera.

---

### Tarea 2 — Movimientos de Caja

**Por qué**: El encargado y dueño necesitaban una vista de todos los movimientos de caja con filtros, separado del arqueo en tiempo real.

**Backend**
- `backend/src/routes/cash.js` — 2 endpoints adicionales: `GET /movements` (listado filtrable por fecha/tipo/sucursal/sesión) y `GET /movements/summary` (totales agrupados: ventas, gastos, manuales).

**Frontend**
- `frontend/src/pages/CashMovementsPage.jsx` — Filtros de período, tipo y sucursal. 4 tarjetas de resumen. Tabla con badges de color por tipo.
- `App.jsx` y `Navbar.jsx` actualizados con ruta `/cash/movements`.

---

### Tarea 3 — Flujo de Caja

**Por qué**: El dueño necesitaba ver ingresos vs egresos por período con saldo acumulado para tomar decisiones financieras.

**Backend**
- `backend/src/routes/reports.js` — Archivo nuevo (base para todos los reportes). `GET /api/reports/cash-flow`: cruza 3 fuentes de datos (ventas completadas + gastos + movimientos manuales), construye bucket diario con `in`, `out`, `net` y `cumulative_balance` acumulado.
- `backend/index.js` — registrado `app.use('/api/reports', reportsRoutes)`.

**Frontend**
- `frontend/src/pages/CashFlowPage.jsx` — Tabla por día con KPIs in/out/neto/saldo acumulado. Filtros de período y sucursal.
- `App.jsx` y `Navbar.jsx` actualizados.

---

## BLOQUE 2 — Proveedores y Stock

### Tarea 4 — Proveedores con Saldo

**Por qué**: No había forma de registrar proveedores ni llevar un saldo de lo que se les debe. Era necesario como base para los pedidos (Tarea 6).

**Backend**
- `database/add_suppliers.sql` — Tablas `suppliers` (con campo `balance` para saldo acumulado) y `supplier_transactions` (historial de deudas y pagos). Decisión de diseño: una sola tabla de transacciones con tipo `deuda`/`pago` en lugar de dos tablas separadas, para evitar duplicación [DRY].
- `backend/src/routes/suppliers.js` — CRUD completo + `POST /:id/transactions` (registra deuda o pago y actualiza balance atómicamente) + `GET /:id/transactions` (historial). Protección: no se puede eliminar un proveedor con saldo pendiente (409).
- `backend/index.js` — registrado.

**Frontend**
- `frontend/src/pages/SuppliersPage.jsx` — Lista con filtro "Solo con saldo". Panel lateral de detalle con historial. Modales de nueva deuda/pago. Badges de tipo.
- `App.jsx` y `Navbar.jsx` actualizados.

---

### Tarea 5 — Transferencia de Stock entre Sucursales

**Por qué**: Con múltiples sucursales, era necesario poder mover stock entre ellas con un flujo de aprobación.

**Backend**
- `database/add_stock_transfers.sql` — Tabla `stock_transfers` con estados `pending → approved | rejected`.
- `backend/src/routes/stock.js` — 4 endpoints nuevos agregados antes del `PATCH /:id` existente: `POST /transfers`, `GET /transfers`, `POST /transfers/:id/approve`, `POST /transfers/:id/reject`. La aprobación descuenta stock de la sucursal origen y lo suma en destino. Si el producto no existe en destino (mismo `code`), se clona automáticamente. El encargado solo ve transferencias de su sucursal; el dueño las ve todas.

**Frontend**
- `frontend/src/pages/StockList.jsx` — Botón "Transferir" en cada fila + panel "Transferencias" con tabs Pendientes/Aprobadas/Rechazadas y botones Aprobar/Rechazar.

---

### Tarea 6 — Gestión de Pedidos a Proveedor

**Por qué**: Necesitaban registrar pedidos a proveedores, sucursales o depósito, y que al recepcionar mercadería se actualizara el stock y se generara la deuda automáticamente al proveedor.

**Backend**
- `database/add_purchase_orders.sql` — Tabla `purchase_orders` con ciclo `draft → sent → received | cancelled`, ítems en JSONB.
- `backend/src/routes/purchase_orders.js` — CRUD + `POST /:id/receive` (sube stock + crea transacción de deuda al proveedor automáticamente) + `POST /:id/cancel`. Integración con Tarea 4: el endpoint `/receive` conecta directo con `supplier_transactions` [DRY].
- `backend/index.js` — registrado.

**Frontend**
- `frontend/src/pages/PurchaseOrdersPage.jsx` — Tabs por estado. Formulario de ítems dinámico. Acciones por estado (editar/enviar/recepcionar/cancelar). Toast de advertencia si algún producto no se encuentra en stock.

---

## BLOQUE 3 — Reportes Financieros (Dueño)

### Tarea 7 — Otros Ingresos / Egresos

**Por qué**: Los gastos solo soportaban egresos. Se necesitaba registrar ingresos no relacionados a ventas (devoluciones, subsidios, cobros varios).

**Backend**
- `database/add_expense_type.sql` — Agrega columna `type TEXT DEFAULT 'gasto' CHECK (IN 'gasto','ingreso')` a la tabla `expenses` existente. Back-fill de todos los registros existentes como `'gasto'`. Retrocompatible: si no se envía type, default es 'gasto'.
- `backend/src/routes/expenses.js` — GET acepta `?type=`, POST y PUT aceptan campo `type` en body.

**Frontend***
- `frontend/src/pages/GastosPage.jsx` — Tabs "Gastos / Ingresos" en el header. Al cambiar de tab, refetch con `?type=` correspondiente. El formulario hereda el tipo del tab activo.

---

### Tarea 8 — Estado de Resultados

**Por qué**: El dueño necesitaba una vista contable de P&L: ingresos, costo de mercadería vendida (CMV), gastos y resultado neto.

**Backend**
- `backend/src/routes/reports.js` — `GET /api/reports/income-statement`. Fórmula: `Ventas - CMV - Gastos + Otros Ingresos = Resultado`. CMV calculado cruzando `sales.details_json` con `products.cost_price` en memoria para evitar N+1 queries. Devuelve márgenes bruto y neto en %.

**Frontend***
- `frontend/src/pages/IncomeStatementPage.jsx` — Tabla P&L vertical. Resultado en verde/rojo según signo. Filtros período + sucursal.

---

### Tarea 9 — Valorización de Stock

**Por qué**: El dueño necesitaba saber cuánto capital está inmovilizado en stock, desglosado por sucursal y categoría.

**Backend**
- `backend/src/routes/reports.js` — `GET /api/reports/stock-valuation`. `SUM(stock × cost_price)` agrupado por sucursal y luego por categoría dentro de cada sucursal.

**Frontend**
- `frontend/src/pages/StockList.jsx` — Tab "Valorización" visible solo para dueño. Total general + desglose por sucursal + desglose por categoría.

---

### Tarea 10 — Ventas por Rubro / Categoría

**Por qué**: El dueño necesitaba saber qué rubros generan más ventas para tomar decisiones de compra y precios.

**Backend**
- `backend/src/routes/reports.js` — `GET /api/reports/sales-by-category`. Agrupa ítems de `sales.details_json` por `category_id` del producto. Devuelve total, unidades y `share_pct` (% del total), ordenado por total descendente.

**Frontend**
- `frontend/src/pages/SalesByCategoryPage.jsx` — Tarjetas de resumen + tabla con barra de progreso visual en la columna %.

---

### Tarea 11 — Clientes con Saldo / Deuda

**Por qué**: Algunos clientes compran en cuenta corriente. Se necesitaba registrar sus deudas y cobros y tener una vista de quién debe plata.

**Backend**
- `database/add_client_balance.sql` — Agrega `balance NUMERIC DEFAULT 0` a `clients`. Tabla `client_transactions` (tipos: `deuda`/`pago`/`nota_credito`, links opcionales a sales y credit_notes).
- `backend/src/routes/clients.js` — GET acepta `?with_balance=true`. Nuevos endpoints: `GET /:id/transactions` y `POST /:id/transactions` (registra transacción y actualiza balance).

**Frontend**
- `frontend/src/pages/ClientBalancePage.jsx` — Lista con toggle "Solo con deuda". Panel lateral con historial, badges por tipo, botones "Registrar cobro" y "Registrar deuda".

---

## BLOQUE 4 — Documentos Comerciales

### Tarea 12 — Notas de Crédito / Débito

**Por qué**: La tabla `credit_notes` solo existía para cancelaciones de venta. Se necesitaba un CRUD completo y soporte para notas de débito.

**Backend**
- `database/add_credit_note_type.sql` — Agrega `type ('credito'|'debito')`, `number` y `notes` a `credit_notes` existente.
- `backend/src/routes/credit_notes.js` — CRUD completo: GET (con filtros), GET /:id, POST (crear manual), PATCH (actualizar status/datos), DELETE (solo si `pending`).
- `backend/index.js` — registrado.

**Frontend**
- `frontend/src/pages/CreditNotesPage.jsx` — Tabs crédito/débito. Botón "Generar NC" en SalesHistory pre-carga datos de la venta. Badge de estado con colores.

---

### Tarea 13 — Remitos de Venta

**Por qué**: Las entregas de mercadería necesitaban un documento que el cliente pueda firmar. AFIP también lo requiere para ciertos comprobantes.

**Backend**
- `database/add_remitos.sql` — Tabla `remitos` (sale_id, items JSONB, client_name, delivered_at, signed_by).
- `backend/src/services/remito.js` — Generador PDF A4 con tabla de ítems, área de firmas (emisor + receptor), total. Usa pdfkit ya instalado.
- `backend/src/routes/remitos.js` — GET, POST, PATCH (marcar como entregado), `GET /:id/pdf` (genera y devuelve PDF), `POST /from-sale/:saleId` (crea remito pre-cargado desde venta existente).
- `backend/index.js` — registrado.

**Frontend**
- `frontend/src/pages/SalesHistory.jsx` — Botón "Remito" en cada fila: llama `POST /from-sale/:saleId` y abre el PDF en nueva pestaña.

---

### Tarea 14 — Historial de Exportaciones CSV

**Por qué**: El dueño necesitaba auditar qué exportaciones se hacen, quién las hace y con qué filtros.

**Backend**
- `database/add_export_logs.sql` — Tabla `export_logs` (user_id, type, filters JSONB, row_count, exported_at).
- `backend/src/routes/export_logs.js` — `GET /` (solo dueño, con filtros) + `POST /` (cualquier rol autenticado registra un export).
- `backend/index.js` — registrado.

**Frontend**
- `frontend/src/pages/ExportHistoryPage.jsx` — Tabla con fecha, usuario, tipo, filtros aplicados, nº registros.
- Todos los botones "Exportar CSV" existentes (SalesHistory, GastosPage) llaman `POST /api/export-logs` después de generar el CSV.

---

## BLOQUE 5 — Integración AFIP/ARCA

### Tarea 15 — Comprobantes Fiscales

**Por qué**: Base necesaria para la facturación electrónica. Define la estructura de los comprobantes, numeración correlativa y estado del CAE.

**Backend**
- `database/add_fiscal_receipts.sql` — Tabla `fiscal_receipts` (tipo FA/FB/FC/NC/ND, punto de venta, número auto-secuencial por tipo, cae, cae_expiry, status: pending/authorized/rejected, afip_error). Restricción UNIQUE para evitar duplicados de numeración. Tabla `fiscal_config` (CUIT, PdV, tipo de integración).
- `backend/src/routes/fiscal.js` — CRUD de comprobantes + `GET /config` + `PUT /config`. El número se auto-calcula como `MAX(number) + 1` por tipo y punto de venta.
- `backend/index.js` — registrado.

**Frontend**
- `frontend/src/pages/FiscalReceiptsPage.jsx` — Listado con filtros. Botón "Nuevo comprobante". Tab "Configuración" con form de CUIT/PdV. Badge de estado con colores.

---

### Tarea 16 — Facturación en ARCA (WS Propio)

**Por qué**: Decisión: implementar WS propio (sin servicio tercero) usando los paquetes `node-forge` y `xml2js` ya instalados, evitando dependencias nuevas y costo por comprobante.

**Backend**
- `database/add_fiscal_cert.sql` — Agrega `cert_pem`, `key_pem`, `afip_environment ('homologacion'|'produccion')` a `fiscal_config`.
- `backend/src/services/wsaa.js` — Autenticación WSAA: construye `LoginTicketRequest` XML, lo firma con PKCS#7/CMS usando `node-forge` (SHA256+RSA), llama endpoint SOAP de WSAA (homologación o producción), cachea el Ticket de Acceso en memoria por 12 horas para no llamar WSAA en cada factura.
- `backend/src/services/wsfe.js` — Facturación WSFE: `getLastVoucher` (FECompUltimoAutorizado — verifica numeración correlativa) y `requestCae` (FECAESolicitar — obtiene el CAE). Mapeo de tipos: FA=1, FB=6, FC=11, NCA=2, NCB=7, NCC=12, NDA=3, NDB=8, NDC=13.
- `backend/src/services/factura.js` — PDF A4 AFIP-compliant: encabezado con nombre/CUIT/letra grande en caja (A/B/C), datos del receptor, tabla de ítems (tomados de la venta vinculada), totales (neto + IVA 21% + total), sección CAE con número + vencimiento + URL QR AFIP (Res. 1702/2018). Banner amarillo si no tiene CAE aún.
- `backend/src/routes/fiscal.js` — Reemplazado el placeholder 503 con la integración real: `POST /receipts/:id/authorize` llama WSAA → WSFE → guarda CAE en DB o guarda el error si AFIP rechaza. `GET /receipts/:id/pdf` genera el PDF. `PUT /config` actualizado para guardar cert/key sin exponerlos en la respuesta (devuelve `has_cert`/`has_key`).

**Frontend**
- `FiscalReceiptsPage.jsx` — Form de configuración con campos cert/key/ambiente. Badge "Autorizado" muestra CAE + vencimiento. Botón "Autorizar" con estado loading + manejo de errores AFIP. Botón "Descargar PDF".
- `frontend/src/pages/SalesHistory.jsx` — Botón "Facturar" en cada venta. Modal pre-cargado con tipo, cliente, CUIT, neto/IVA/total. Dos acciones: "Solo crear" y "Crear y Autorizar" (muestra CAE en pantalla de éxito).

---

### Tarea 17 — Retenciones / Percepciones

**Por qué**: Las empresas que operan con clientes o proveedores inscriptos deben aplicar retenciones (descuentos sobre pagos a proveedores) o percepciones (cobros adicionales a clientes) según AFIP e IIBB.

**Backend**
- `database/add_tax_withholdings.sql` — Tabla `tax_withholdings` (tipo: retencion/percepcion, agency, base_amount, rate, amount, certificate_number).
- `backend/src/routes/tax_withholdings.js` — GET con filtros + POST + DELETE.
- `backend/index.js` — registrado.

**Frontend**
- `frontend/src/pages/TaxWithholdingsPage.jsx` — Tabs Retenciones/Percepciones. Filtros por organismo (AFIP, IIBB_*). KPIs del período. Botón "+ Registrar".

---
### TESTING_PLAN.md
**Por qué**: Con 17 tareas y ~40 páginas/endpoints, se necesitaba un plan de testing sistemático con casos concretos y usuarios de prueba.
- Tests por bloque con checkboxes
- Tests de seguridad (roles, 401/403, cross-branch isolation)
- Registro de bugs encontrados con síntoma, impacto y fix aplicado

### ALL_MIGRATIONS.sql
**Por qué**: Las 11 migraciones individuales se crearon a lo largo de la sesión. Para aplicarlas en Supabase de una sola vez, se consolidaron en un único archivo idempotente (todo con `IF NOT EXISTS`).

### fix_rls_insert_policies.sql
**Por qué**: Todas las tablas nuevas tenían políticas RLS `FOR SELECT` pero no `FOR INSERT/UPDATE/DELETE` para usuarios autenticados. El backend usa la clave JWT del usuario (no service_role para escrituras), por lo que RLS bloqueaba todos los inserts con "new row violates row-level security policy". Fix aplicado a las 12 tablas nuevas.

---

## Bugs Corregidos

### Bugs de seguridad (detectados en revisión de código)

| Archivo | Bug | Fix | Por qué importa |
|---------|-----|-----|-----------------|
| `suppliers.js` | Query de transactions sin `company_id` | Agregado `.eq('company_id', ...)` | Data leak cross-company |
| `clients.js` | Query de transactions sin `company_id` | Agregado `.eq('company_id', ...)` | Data leak cross-company |
| `credit_notes.js` | DELETE sin `company_id` | Agregado al DELETE query | Empresa A podía borrar NC de empresa B |
| `credit_notes.js` | PATCH sin `company_id` + `.single()` explosivo | Agregado `company_id` + cambiado a `.maybeSingle()` | Idem + error si no existe |
| `purchase_orders.js` | Lookup por `product_id` sin `company_id` | Agregado `.eq('company_id', ...)` | Podía leer/modificar productos de otra empresa |
| `fiscal.js` | `.single()` en authorize podía explotar | Cambiado a `.maybeSingle()` | Error 500 si comprobante no existe |

### Bugs de RLS (detectados en testing)

| Tabla | Síntoma | Fix |
|-------|---------|-----|
| `cash_sessions` | INSERT bloqueado → caja no abría | Policies INSERT/UPDATE/DELETE para authenticated |
| `cash_movements` | ídem | ídem |
| `suppliers` | INSERT bloqueado → no se podía crear proveedor | ídem |
| `supplier_transactions` | INSERT bloqueado → no se podía registrar deuda | ídem |
| `stock_transfers` | INSERT bloqueado | ídem |
| `purchase_orders` | INSERT bloqueado | ídem |
| `client_transactions` | INSERT bloqueado | ídem |
| `remitos` | INSERT bloqueado | ídem |
| `export_logs` | INSERT bloqueado → historial siempre vacío | ídem |
| `fiscal_receipts` | INSERT bloqueado | ídem |
| `tax_withholdings` | INSERT bloqueado | ídem |

**Causa raíz**: Las tablas antiguas (expenses, credit_notes) usan `FOR ALL` sin especificar operación, cubriendo INSERT/UPDATE/DELETE. Las tablas nuevas usaban `FOR SELECT` explícito, dejando las escrituras sin política → bloqueadas por RLS.

### Bugs de lógica (detectados en testing)

| Archivo | Bug | Fix |
|---------|-----|-----|
| `AuthContext.jsx` (Copilot) | `'cash'` faltaba en `DEFAULT_VIEWS.cajero` y `DEFAULT_VIEWS.encargado` | Agregado en ambos roles |
| `PurchaseOrdersPage.jsx` (Copilot) | Dueño sin `branch_id` recibía 400 al crear pedido | Selector de sucursal obligatorio para dueño |
| `stock.js` | `POST /transfers` no aceptaba `from_branch_id` del body, rompía para dueño | Acepta `from_branch_id` cuando role es 'dueno' |
| `purchase_orders.js` | Mismo patrón — error 400 sin hint para dueño sin branch | Mensaje de error mejorado con `hint` descriptivo |

---

## Archivos Creados (resumen)

### Database (SQL)
- `add_cash_sessions.sql`
- `add_suppliers.sql`
- `add_stock_transfers.sql`
- `add_purchase_orders.sql`
- `add_expense_type.sql`
- `add_client_balance.sql`
- `add_credit_note_type.sql`
- `add_remitos.sql`
- `add_export_logs.sql`
- `add_fiscal_receipts.sql`
- `add_fiscal_cert.sql`
- `add_tax_withholdings.sql`
- `ALL_MIGRATIONS.sql` ← consolidación de todas las migraciones
- `fix_rls_insert_policies.sql` ← fix de RLS INSERT/UPDATE/DELETE

### Backend — Routes nuevas
- `backend/src/routes/cash.js`
- `backend/src/routes/suppliers.js`
- `backend/src/routes/purchase_orders.js`
- `backend/src/routes/credit_notes.js`
- `backend/src/routes/remitos.js`
- `backend/src/routes/export_logs.js`
- `backend/src/routes/fiscal.js`
- `backend/src/routes/tax_withholdings.js`
- `backend/src/routes/reports.js`

### Backend — Services nuevos
- `backend/src/services/wsaa.js` ← autenticación AFIP
- `backend/src/services/wsfe.js` ← facturación AFIP
- `backend/src/services/factura.js` ← PDF factura A4
- `backend/src/services/remito.js` ← PDF remito A4

### Backend — Archivos modificados
- `backend/index.js` ← 9 routes nuevas registradas
- `backend/src/routes/expenses.js` ← soporte para campo `type`
- `backend/src/routes/clients.js` ← endpoints de balance y transactions
- `backend/src/routes/stock.js` ← 4 endpoints de transfers + fix `from_branch_id`

### Frontend — Páginas nuevas 
- `CashRegisterPage.jsx`
- `CashMovementsPage.jsx`
- `CashFlowPage.jsx`
- `SuppliersPage.jsx`
- `PurchaseOrdersPage.jsx`
- `IncomeStatementPage.jsx`
- `SalesByCategoryPage.jsx`
- `ClientBalancePage.jsx`
- `CreditNotesPage.jsx`
- `ExportHistoryPage.jsx`
- `FiscalReceiptsPage.jsx`
- `TaxWithholdingsPage.jsx`

### Frontend — Archivos modificados 
- `App.jsx` ← 12 rutas nuevas
- `Navbar.jsx` ← 12 NavLinks nuevos con íconos
- `GastosPage.jsx` ← tabs Gastos/Ingresos
- `StockList.jsx` ← transferencias + valorización
- `SalesHistory.jsx` ← botón Remito + botón Generar NC + botón Facturar
- `AuthContext.jsx` ← fix DEFAULT_VIEWS para cajero y encargado
