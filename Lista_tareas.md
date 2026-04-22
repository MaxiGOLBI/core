Lista de Tareas. (No pases a la siguiente tarea hasta terminar con una y que no queden errores por resolver de esa tarea)

## TAREAS

## Solucion de errores:

## A agregar

La idea es que la aplicación soporte múltiples empresas de manera aislada.

🔹 Requerimientos:
1. Cada empresa debe tener su propia vista y datos separados.
   - Ejemplo: Dueño 1 (empresa "Mundo Celular") solo ve stock, empleados, ventas y gastos de su empresa.
   - Dueño 2 (empresa "Vaypol Casa de Deportes") solo ve lo suyo.
2. Implementar control de acceso por empresa:
   - Los usuarios deben estar asociados a una empresa en la base de datos.
   - Al iniciar sesión, el sistema filtra automáticamente todos los datos por empresa.
3. Roles:
   - Dueño: acceso completo a su empresa.
   - Gerente, cajero, vendedor: acceso limitado según permisos, pero siempre dentro de su empresa.
4. Base de datos:
   - Tablas deben incluir `empresa_id` para separar datos.
   - Ejemplo: `productos`, `empleados`, `ventas`, `gastos` → todos con campo `empresa_id`.
5. Modularizar funciones:
   - `obtenerDatosEmpresa(empresa_id)`
   - `validarAccesoUsuario(usuario_id, empresa_id)`
   - `filtrarDatosPorEmpresa(empresa_id)`

Objetivo final: que cada dueño y sus empleados vean únicamente la información de su propia empresa, sin posibilidad de acceder a datos de otra.


## 📝 NOTAS:
- Siempre leer Global_rules.md y Vibe-coding_rules.md antes de empezar a trabajar
- Seguir reglas [AC], [DRY], [REH] en todo momento
- Commits frecuentes [CD]
- Verificar errores antes de siguiente tarea
- Mantener arquitectura limpia [CA]


