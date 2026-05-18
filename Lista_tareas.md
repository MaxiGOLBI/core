Lista de Tareas. (No pases a la siguiente tarea hasta terminar con una y que no queden errores por resolver de esa tarea)

Necesito que generes una vista llamada "Ganancia Neta por Medios de Pago" en el sistema de ventas, accesible únicamente para el rol Dueño.

📌 Requerimientos:

1. **Acceso restringido:**
   - Solo el rol Dueño puede ver esta vista.

2. **Configuración de comisiones:**
   - El Dueño debe poder definir y guardar el porcentaje de comisión que retiene cada medio de pago:
     - TARJETA (ejemplo: 5%).
     - VIRTUAL (ejemplo: 3%).
   - Estos porcentajes deben almacenarse en la base de datos y aplicarse automáticamente en los cálculos.

3. **Contenido de la vista:**
   - Mostrar un resumen de ingresos por cada medio de pago:
     - EFECTIVO (sin descuentos).
     - TARJETA.
     - VIRTUAL.
   - Para TARJETA y VIRTUAL, calcular automáticamente:
     - Monto bruto ingresado.
     - Comisión retenida (según porcentaje configurado).
     - Ganancia neta (monto bruto - comisión).

4. **Visualización:**
   - Presentar los datos en una tabla con columnas:
     - Medio de pago.
     - Monto bruto.
     - Comisión aplicada (% y valor).
     - Ganancia neta.
   - Incluir un recuadro superior con el **total neto general** sumando todos los medios de pago.

5. **Filtros:**
   - Permitir filtrar por:
     - Fecha (día, mes, rango).
     - Sucursal.
     - Tipo de operación (venta, devolución).
   - Botón **Consultar** para actualizar resultados.

6. **Consideraciones técnicas:**
   - Implementar función `calcularGananciaNetaPorMedio()` que:
     - Obtenga los ingresos brutos por medio de pago.
     - Aplique el porcentaje de comisión configurado por el Dueño.
     - Devuelva el neto.
   - Implementar función `configurarComisionMedioPago()` para que el Dueño pueda modificar los porcentajes desde la interfaz.
   - Guardar cada cálculo con referencia a fecha y sucursal.
   - Permitir exportar la tabla a Excel/PDF.

🎯 Objetivo final:  
Que el Dueño pueda ver claramente cuánto dinero ingresó por cada medio de pago y cuál fue la **ganancia neta real**, descontando las comisiones configuradas por él mismo.
---

## 📝 NOTAS:
- Siempre leer Global_rules.md y Vibe-coding_rules.md antes de empezar a trabajar
- Seguir reglas [AC], [DRY], [REH] en todo momento
- Commits frecuentes [CD]
- Verificar errores antes de siguiente tarea
- Mantener arquitectura limpia [CA]
- Crear rama por cada tarea: `feature/nombre-tarea` o `task/nombre-tarea`
- No pasar a la siguiente tarea hasta que la actual no tenga errores


