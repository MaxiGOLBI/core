Reglas globales de codificación de IA

Estas reglas establecen estándares y preferencias universales que se aplican en todos los proyectos desarrollados con la asistencia de AI.
Principios Básicos

    Simplicidad Primero (SF): Elija siempre la solución viable más simple. Los patrones complejos o arquitecturas requieren una justificación explícita.
    Prioridad de legibilidad (RP): El código debe ser inmediatamente comprensible tanto por los seres humanos como por la IA durante futuras modificaciones.
    Minimalismo de dependencia (DM): No hay nuevas bibliotecas o marcos sin solicitud explícita o justificación convincente.
    Adherencia a los estándares de la industria (ISA): Siga las convenciones establecidas para el lenguaje y la pila de tecnología relevantes.
    Documentación estratégica (SD): Comente solo la lógica compleja o las funciones críticas. Evite documentar lo obvio. Escribir nuevos documentos en inglés. Si encuentras documentos en otros idiomas, reescríbelos en inglés.
    Pensamiento basado en pruebas (TDT): Diseña todo el código para que sea fácilmente comprobable desde el inicio.

Normas de Flujo de Trabajo
Cambios atómicos (AC): Realice pequeñas modificaciones autónomas para mejorar la trazabilidad y la capacidad de reversión.
Disciplina de compromiso (CD): Recordar al usuario hacer commits regulares con mensajes semánticos usando el formato de commit convencional:

type(scope): concise description

[optional body with details]

[optional footer with breaking changes/issue references]

    Tipos: hazaña, arreglo, documentos, estilo, refactor, perf, test, quehacer
    Razonamiento transparente (TR): Al generar código, haga referencia explícita a qué reglas globales influyeron en las decisiones.
    Administración de ventanas de contexto (CWM): Tenga en cuenta las limitaciones del contexto de IA. Sugiera nuevas sesiones cuando sea necesario.
    Conservar el código existente (PEC): Windsurf no debe sobrescribir o romper el código funcional a menos que se indique explícitamente lo contrario. Proponer cambios de forma conservadora para mantener la integridad de la base de código [AC, CA]

Garantías de calidad de código

    Principio DRY (DRY): Sin código duplicado. Reutilizar o ampliar la funcionalidad existente.
    Clear Architecture (CA): Genera código de formato limpio y estructurado lógicamente con patrones consistentes.
    Manejo de errores robustos (REH): Integrar el manejo de errores apropiado para todos los casos de borde e interacciones externas.
    Detección de olor de código (CSD): Identificar y sugerir proactivamente la refactorización para:
        Funciones superiores a 30 líneas
        Archivos que superan las 300 líneas
        Condicionales anidados más allá de 2 niveles
        Clases con más de 5 métodos públicos

Consideraciones de seguridad y rendimiento

    Validación de entrada (IV): Todos los datos externos deben ser validados antes del procesamiento.
    Gestión de recursos (RM): Cerrar conexiones y recursos gratuitos de manera adecuada.
    Constantes sobre valores mágicos (CMV): Sin cadenas o números mágicos. Utilice las constantes con nombre.
    Security-First Thinking (SFT): Implemente la autenticación, la autorización y la protección de datos adecuadas.
    Conciencia de rendimiento (PA): Considere la complejidad computacional y el uso de recursos.

Directrices de comunicación de la IA

    Seguimiento de la aplicación de reglas (RAT): Al aplicar reglas, etiqueta con la abreviatura entre paréntesis (por ejemplo, [SF], [DRY]).
    Control de profundidad de explicación (EDC): detalle de la explicación de la escala basada en la complejidad, desde breve hasta completo.
    Sugerencias alternativas (AS): Cuando sea relevante, ofrezca enfoques alternativos con pros/contras.
    Knowledge Boundary Transparency (KBT): Comunícate claramente cuando una solicitud excede las capacidades de IA o el contexto del proyecto.

Documentación continua durante el proceso de desarrollo (CDiP)

    * Mantenga todos los archivos .md actualizados, que se utilizan para realizar un seguimiento del progreso, todos y ayudar a obtener información (p. ej. TASK_LIST.md, README.md, LEARNING_FROM_JAVA.md, VAU_IMPLEMENTATION_PLAN.md, etc.)

    Genere memorias para cada nuevo archivo md creado o nuevo solicitado, lo que ayudará a la IA o al desarrollador a realizar un seguimiento del contexto y el progreso del proyecto.
    actualice los archivos md, cuando se agreguen, completen o completen nuevas tareas.
    Pero no toque archivos *.md en la carpeta de documentos!

Flujo de trabajo de desarrollo basado en características

    Crear rama de características:
        Para cada nueva función o tarea, cree una rama de características dedicada a partir de master.
        Utilice nombres de ramas descriptivos con formato convencional: feature/feature-nameo task/task-name[CD].

    Proceso de desarrollo:
        Completar todo el trabajo de desarrollo en la rama de características [AC].
        Asegúrese de que todas las pruebas pasen correctamente antes de considerar la tarea completa [CTC].
        Siga los principios de arquitectura limpia y los estándares de codificación [CA].

    Finalización de tareas en la rama de características:
        Marque las tareas como completadas en TASK_LIST.mdDentro de la rama de características [CDiP].
        Comprometa estos cambios en la rama de características [CD].
        Esto debe hacerse antes de crear la solicitud de extracción.

    Proceso de solicitud de extracción:
        Crear una solicitud de extracción a la rama maestra cuando la función está completa [AC].
        Incluir la actualización TASK_LIST.mdEn la solicitud de extracción [CDiP].
        Espere el reconocimiento del revisor antes de proceder.

    Proceso de fusión:
        Después de la aprobación, fusione la rama de características en master.
        Borrar la rama de características después de la fusión exitosa [AC].

    Seguimiento de tareas:
        La actualización TASK_LIST.mdYa forma parte de los cambios fusionados [CDiP].
        No hay actualizaciones adicionales a TASK_LIST.mdDebería ser necesario después de que se apruebe el PR.

Este flujo de trabajo asegura que:

    Cada característica se puede revertir de forma independiente si es necesario [AC].
    La calidad del código se mantiene a través del proceso de revisión [CA].
    La rama maestra siempre contiene una versión de trabajo de la aplicación [PEC].
    El progreso se sigue y documenta claramente [CDiP].
    La finalización de la tarea es parte del trabajo de características e incluido en el proceso de revisión [CD].
