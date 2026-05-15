Lista de Tareas. (No pases a la siguiente tarea hasta terminar con una y que no queden errores por resolver de esa tarea)

---

## 🟥 BLOQUE 1 — Caja (base para flujo de caja y movimientos)
> Roles: Cajero, Encargado, Dueño

- [x] **1. Arqueo / Apertura / Cierre de caja**
  - DB: tabla `cash_sessions` (apertura, cierre, monto inicial, monto final, diferencia, branch_id)
  - DB: tabla `cash_movements` (ventas, gastos, ingresos manuales vinculados a sesión)
  - Backend: `/api/cash/open`, `/api/cash/close`, `/api/cash/arqueo`, `/api/cash/sessions`
  - Frontend: página `CashRegisterPage.jsx` (apertura, cierre, arqueo, consulta histórico)
  - Roles: Cajero (operar), Encargado (operar + ver), Dueño (todo)

- [x] **2. Movimientos de Caja** (Encargado, Dueño)
  - Depende de: tarea 1
  - Frontend: página `CashMovementsPage.jsx` — listado con filtros por fecha, sucursal, tipo
  - Backend: filtros en `/api/cash/movements`

- [x] **3. Flujo de Caja** (Dueño)
  - Depende de: tareas 1 y 2
  - Frontend: página `CashFlowPage.jsx` — ingresos vs egresos por período, gráfico de saldo acumulado
  - Backend: endpoint `/api/reports/cash-flow`

---

## 🟧 BLOQUE 2 — Proveedores y Stock

- [x] **4. Proveedores con saldo**
  - DB: tabla `suppliers` (name, cuit, contact, balance, company_id)
  - DB: tabla `supplier_payments` (supplier_id, amount, date, payment_method)
  - Backend: `/api/suppliers` CRUD + saldo
  - Frontend: página `SuppliersPage.jsx`

- [x] **5. Transferencia de stock entre sucursales** (Encargado, Dueño)
  - DB: tabla `stock_transfers` (from_branch_id, to_branch_id, product_id, qty, status, notes)
  - Backend: `/api/stock/transfers` — crear, aprobar, rechazar
  - Frontend: modal/página en `StockList.jsx`

- [x] **6. Gestión de Pedidos (proveedor / sucursal / depósito)**
  - Depende de: tarea 4 (proveedores)
  - DB: tabla `purchase_orders` (supplier_id, items JSONB, status, branch_id, total)
  - Backend: `/api/purchase-orders` CRUD + recepcionar mercadería (actualiza stock)
  - Frontend: página `PurchaseOrdersPage.jsx`

---

## 🟨 BLOQUE 3 — Reportes financieros (Dueño)

- [x] **7. Otros ingresos / Egresos** (Dueño)
  - Extensión de `expenses`: agregar tipo `ingreso` además de `egreso`
  - O nueva tabla `other_income` — a definir con compañero
  - Frontend: sección en `GastosPage.jsx` o nueva página

- [x] **8. Estado de Resultados** (Dueño)
  - Depende de: ventas + gastos + costo de productos (cost_price ya existe)
  - Backend: endpoint `/api/reports/income-statement`  
    `Ingresos (ventas) - CMV (costo productos vendidos) - Gastos = Resultado`
  - Frontend: página `IncomeStatementPage.jsx`

- [x] **9. Valorización de Stock** (Dueño)
  - Backend: endpoint `/api/reports/stock-valuation`  
    `SUM(stock * cost_price)` agrupado por sucursal/categoría
  - Frontend: página o sección en `StockList.jsx`

- [x] **10. Ventas por rubro / categoría**
  - Backend: endpoint `/api/reports/sales-by-category`
  - Frontend: página `SalesByCategoryPage.jsx` con filtros y totales por categoría

- [x] **11. Clientes con Saldo / Deuda**
  - DB: columna `balance` en `clients` o tabla `client_ledger`
  - Actualizar saldo al registrar venta en cuenta corriente y al usar nota de crédito
  - Frontend: tab en `EmployeesDashboard.jsx` o página `ClientBalancePage.jsx`

---

## 🟦 BLOQUE 4 — Documentos comerciales

- [x] **12. Gestión de Nota de Crédito / Débito**
  - Tabla `credit_notes` ya existe en la BD
  - Backend: endpoints CRUD `/api/credit-notes` (falta completar)
  - Frontend: modal de emisión desde `SalesHistory.jsx` + página de gestión

- [x] **13. Remitos de venta**
  - DB: tabla `remitos` (sale_id, items JSONB, delivered_at, signed_by)
  - Backend: `/api/remitos` + generación PDF (similar a ticket.js)
  - Frontend: botón en historial de ventas → genera PDF remito

- [x] **14. Historial de Exportaciones CSV** (Dueño)
  - DB: tabla `export_logs` (user_id, type, filters JSONB, exported_at)
  - Backend: middleware que registra cada export + `/api/export-logs`
  - Frontend: página `ExportHistoryPage.jsx`

---

## 🟥 BLOQUE 5 — Integración AFIP/ARCA (alta complejidad)
> Requiere CUIT, certificado digital AFIP, y definir si se usa WS propio o servicio tercero (ej. Facturador.ar, Afip SDK)

- [x] **15. Comprobantes Fiscales**
  - Definir tipo de comprobante: Factura A, B, C / Ticket / Nota de crédito fiscal
  - DB: tabla `fiscal_receipts` vinculada a `sales`

- [x] **16. Facturación en ARCA (AFIP)**
  - Depende de: tarea 15
  - Integración con WS de AFIP (WSFE) o servicio tercero
  - Backend: servicio `afip.js` — autorización CAE
  - Frontend: botón "Facturar" en `CashierQueue.jsx` / `SalesHistory.jsx`

- [x] **17. Retenciones / Percepciones**
  - Depende de: tareas 15 y 16
  - DB: tabla `tax_withholdings` (sale_id, type, amount, agency)
  - Backend: cálculo según tipo de cliente/proveedor

---

## ✅ COMPLETADAS

- [x] **1. Arqueo / Apertura / Cierre de caja**
- [x] **16b. PDF de Factura con CAE** — `GET /api/fiscal/receipts/:id/pdf`, layout A4 AFIP-compliant, QR URL incluido — DB: `cash_sessions` + `cash_movements`, Backend: `/api/cash/*`, Frontend: `CashRegisterPage.jsx` + ruta `/cash` + NavLink "Apertura"

---

## Solucion de errores:


---

## 📝 NOTAS:
- Siempre leer Global_rules.md y Vibe-coding_rules.md antes de empezar a trabajar
- Seguir reglas [AC], [DRY], [REH] en todo momento
- Commits frecuentes [CD]
- Verificar errores antes de siguiente tarea
- Mantener arquitectura limpia [CA]
- Crear rama por cada tarea: `feature/nombre-tarea` o `task/nombre-tarea`
- No pasar a la siguiente tarea hasta que la actual no tenga errores


