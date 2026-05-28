Lista de Tareas. (No pases a la siguiente tarea hasta terminar con una y que no queden errores por resolver de esa tarea)

Necesito que desarrolles la funcionalidad para la gestión de gastos e ingresos de stock en mi sistema:

Formulario de gasto o ingreso de stock

Al tocar el boton nuevo gasto, debe aparecer un pop up donde decidas si es un gasto o gasto por ingreso de stock.

En el formulario donde se ingrese stock:

Costo total del gasto.

Costo unitario por producto.

Listado de productos incluidos en el gasto.

Al confirmar el gasto, todos los productos cargados deben ingresarse automáticamente al stock.

Actualización de costos

Si el costo de un producto está desactualizado, debe actualizarse al valor más reciente.

Ejemplo: si antes el costo de un Samsung era 1000 y ahora se carga a 1300, el sistema debe reemplazar el costo anterior por el nuevo.

Datos de factura

El formulario debe permitir cargar datos de la factura asociados al gasto:

Impuestos

IVA

Vista de percepciones y retenciones (rol Dueño)

En la vista del Dueño, se deben mostrar las percepciones y retenciones asociadas a los gastos/facturas cargadas.

Esta vista es exclusiva del rol Dueño y no debe estar disponible para cajeros ni encargados.
## 📝 NOTAS:
- Siempre leer Global_rules.md y Vibe-coding_rules.md antes de empezar a trabajar
- Seguir reglas [AC], [DRY], [REH] en todo momento
- Commits frecuentes [CD]
- Verificar errores antes de siguiente tarea
- Mantener arquitectura limpia [CA]
- Crear rama por cada tarea: `feature/nombre-tarea` o `task/nombre-tarea`
- No pasar a la siguiente tarea hasta que la actual no tenga errores


