# Resumen de cambios — Mayo 2026

Este documento describe todos los archivos modificados y creados en esta sesión, para facilitar el merge.

---

## Base de datos — Migraciones nuevas (ejecutar en Supabase SQL Editor)

### `database/add_created_by.sql` *(nuevo)*
- Agrega columna `created_by UUID` a las tablas `tables_queue` y `sales`
- Referencia a `users(id)`
- Agrega índices sobre esa columna

### `database/add_product_sku.sql` *(nuevo)*
- Agrega columna `sku VARCHAR(100)` a la tabla `products` (nullable)
- Agrega índice parcial sobre `sku`

### `database/add_role_labels.sql` *(nuevo)*
- Agrega columna `role_labels JSONB` a `company_settings`
- Default: `{"vendedor":"Vendedor","cajero":"Cajero","encargado":"Encargado"}`

---

## Backend

### `backend/src/routes/tables.js` *(modificado)*
- Al crear un ticket, guarda `created_by: req.user.id`
- El SELECT incluye `creator:users!created_by(name)` para traer el nombre del creador
- Al completar un ticket y crear la venta, propaga el `created_by`

### `backend/src/routes/sales.js` *(modificado)*
- El SELECT del GET incluye `creator:users!created_by(name)`
- El SELECT del export también incluye el creador

### `backend/src/routes/products.js` *(modificado)*
- `POST /api/products`: acepta campo `sku` opcional en el body y lo guarda
- `PUT /api/products/:id`: acepta `sku` y lo actualiza (null si vacío)

### `backend/src/routes/stock.js` *(modificado)*
- El SELECT del GET incluye el campo `sku`

### `backend/src/routes/settings.js` *(modificado)*
- `PUT /api/settings`: acepta `role_labels` (objeto JSON) y lo guarda en `company_settings`

---

## Frontend — Componentes nuevos

### `frontend/src/components/ConfirmModal.jsx` *(nuevo)*
Componente reutilizable de confirmación que reemplaza todos los `window.confirm()`.

**Props:**
- `open` — boolean para mostrar/ocultar
- `title` — título del modal
- `message` — mensaje de confirmación
- `confirmLabel` — texto del botón de acción (default: "Confirmar")
- `cancelLabel` — texto del botón cancelar (default: "Cancelar")
- `variant` — `"danger"` (rojo) o `"warning"` (amarillo)
- `onConfirm` — callback al confirmar
- `onCancel` — callback al cancelar

**Patrón de uso en todos los componentes:**
```jsx
const [deleteXxxId, setDeleteXxxId] = useState(null);

// Botón de eliminar:
onClick={() => setDeleteXxxId(item.id)}

// Modal al final del return:
<ConfirmModal
  open={!!deleteXxxId}
  title="Eliminar X"
  message="¿Estás seguro?"
  confirmLabel="Eliminar"
  onConfirm={() => handleDelete(deleteXxxId)}
  onCancel={() => setDeleteXxxId(null)}
/>
```

---

## Frontend — Páginas modificadas

### `frontend/src/components/Navbar.jsx` *(modificado)*
1. **Balance sin parpadeo**: para el rol `dueno` muestra `commission_balance`; para otros roles espera a `periodBalance` y muestra `···` mientras carga (evita el parpadeo del valor anterior)
2. **Métodos de pago reubicado**: el link "Métodos de pago" ahora aparece después de "Gastos" en la barra de navegación del dueño

### `frontend/src/components/SaleDetailModal.jsx` *(modificado)*
- Muestra una tarjeta "Ticket creado por" con el nombre del creador (`currentSale.creator?.name`) en color índigo

### `frontend/src/pages/BranchesPage.jsx` *(modificado)*
- Reemplazó `window.confirm()` con `<ConfirmModal>` para eliminar sucursales

### `frontend/src/pages/EmployeesDashboard.jsx` *(modificado)*
- Reemplazó **5 llamadas** a `window.confirm()` con `<ConfirmModal>` en:
  - `ClientsDiscountsTab` (clientes y descuentos)
  - `ClientsTab`
  - `UsersTab`
  - `PaymentMethodsTab`
- **Nueva sección "Nombres de roles"** en `ConfigTab`:
  - Permite renombrar los roles Vendedor / Cajero / Encargado con un nombre personalizado
  - Se guarda en `company_settings.role_labels` vía `PUT /api/settings`
  - UI: tarjeta por rol con botón de edición inline

### `frontend/src/pages/GastosPage.jsx` *(modificado)*
- Reemplazó `window.confirm()` en `ExpenseCategoriesTab` y en el listado principal de gastos
- Se agregó `<ConfirmModal>` en ambas secciones del componente

### `frontend/src/pages/PaymentMethodsPage.jsx` *(modificado)*
- Reemplazó `window.confirm()` con `<ConfirmModal>` para eliminar métodos de pago

### `frontend/src/pages/StockList.jsx` *(modificado)*
- Reemplazó los 2 `confirm()` (categorías y productos) con `<ConfirmModal>`
- `CategoriesTab` es ahora un **export nombrado** (`export function CategoriesTab`)
- Se **eliminó** el botón "Categorias" del header de Stock (ya que tiene su propio tab)
- Se **eliminó** el bloque de vista `tab === 'categories'` interno
- **Campo SKU** agregado al formulario de producto (creación y edición):
  - Campo opcional "SKU / Código"
  - Se muestra en la tabla debajo del código auto-generado
- Fix visual: `CategoriesTab` usa `space-y-5` sin `max-w-2xl` para ocupar el ancho disponible

### `frontend/src/pages/BranchDetailPage.jsx` *(modificado)*
- Importa `{ CategoriesTab }` desde `StockList`
- Agrega tab **"Categorías"** al array `TABS`
- Agrega componente `CategoriesTabWrapper` que carga las categorías y renderiza `<CategoriesTab>`
- Se eliminó `overflow-x-auto` de los tabs (quitó la scrollbar horizontal)

---

## Conflictos probables al hacer merge

| Archivo | Riesgo | Qué revisar |
|---|---|---|
| `Navbar.jsx` | Medio | Lógica del balance y orden de links |
| `EmployeesDashboard.jsx` | Alto | ConfigTab tiene nueva sección de roles; múltiples componentes con nuevos estados |
| `StockList.jsx` | Alto | CategoriesTab exportada, botón removido, campo SKU en formulario |
| `BranchDetailPage.jsx` | Bajo | Nuevo tab Categorías al final |
| `GastosPage.jsx` | Medio | Dos secciones separadas con modal |
| `products.js` (backend) | Bajo | Campo `sku` en POST y PUT |

---

## Checklist para tu amigo

- [ ] Ejecutar `database/add_created_by.sql` en Supabase
- [ ] Ejecutar `database/add_product_sku.sql` en Supabase
- [ ] Ejecutar `database/add_role_labels.sql` en Supabase
- [ ] Verificar que `ConfirmModal.jsx` existe en `frontend/src/components/`
- [ ] Verificar que `CategoriesTab` está exportada en `StockList.jsx`
- [ ] En caso de conflicto en `EmployeesDashboard.jsx`: los modales de confirmación deben estar **dentro** de un fragment `<>...</>` en el return de `ClientsDiscountsTab`
