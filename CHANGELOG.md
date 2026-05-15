# Changelog — sesión de hoy

## Paleta de colores "Ocean Blue"
- Todos los headers de página usan `from-blue-700 to-cyan-500` con círculos decorativos.
- Botones de acción primaria: `from-blue-600 to-cyan-400`.
- Reemplazados todos los `indigo` / `violet` que quedaban en StockList, CashierQueue y EmployeesDashboard.

## Corrección fondo blanco en modales
- Se identificó que el elemento `<html>` tenía fondo blanco por defecto del navegador.
- Fix: `<html style="background-color:#f3f4f6">` en `index.html` + `html, body { background-color: #f3f4f6 }` en `styles.css`.

## Rediseño de modales
- Overlay: `fixed top-0 left-0 w-screen h-screen bg-black/75 z-[9999]` (antes `inset-0 z-50`).
- Header con gradiente `from-blue-600 to-cyan-500`, título blanco, botón × blanco.
- Aplicado en todos los modales de EmployeesDashboard, StockList y TablesBoard.

## StockList — formulario → modal
- El formulario inline "Nuevo producto" se convirtió en modal con el mismo patrón de header gradiente.

## CashierQueue — rediseño header
- Header de página y cabeceras de tarjetas de ticket pasaron a ocean blue.

## TablesBoard — grilla de tickets
- 4 estados visuales: Libre (blanco), En uso (azul gradiente), Confirmado (ámbar), Bloqueado (naranja).
- Leyenda actualizada con los 4 estados.
- **Auto-save**: al hacer click en otro ticket se guarda el actual antes de cambiar.

## Protección de rutas
- El rol `dueno` no puede acceder a `/tables`, `/tables/:id/edit`, ni `/cashier` (ProtectedRoute).

## Nueva sección: Gastos
- **Base de datos**: tabla `expenses` (`database/add_expenses.sql`) con `category`, `description`, `amount`, `expense_date`, `company_id`, `created_by`.
- **Backend**: ruta `/api/expenses` — GET (filtro por fecha), POST, DELETE (solo dueño).
- **Frontend**: nueva pestaña "Gastos" en EmployeesDashboard (visible solo para dueño).
  - Selector de fecha para ver gastos del día.
  - Tabla con categoría, descripción, monto, hora + total del día.
  - Modal para agregar gasto (categorías: Alquiler, Distribuidores, Servicios, Sueldos, Otros).
  - Botón eliminar por fila.
