# PENDIENTES — loft-calculator

## 🔴 Antes de considerar el presupuesto "de obra"
- [ ] Validar con el herrero los supuestos de `constantes.js` y del modelo estructural: ubicación de
      columnas, empalmes, perfiles de cada renglón y separación de transversales.
- [ ] **Largo real de tirantes y vigas**: hoy cada pieza mide la luz completa (ej. 3,00 m). Al cortar
      con merma de 3 mm, dos piezas de 3,00 no entran en una barra de 6 m y el optimizador pide el doble
      (estructura de piso 2: 11 barras con 50 % de desperdicio). En obra la pieza va entre marcos y es
      un poco más corta: descontar el espesor del perfil del marco (definirlo con el herrero).
- [ ] Las columnas y horizontales de pared no se interrumpen en las aberturas (cálculo conservador:
      sobra material; además una columna puede caer dentro de un vano).

## 🟡 Funcionalidad
- [ ] Aleros del techo (voladizo de vigas y chapa más allá de las paredes).
- [ ] Bulonería, soldadura, pintura, fijaciones de paneles, babetas/zinguería y mano de obra no están en el presupuesto.
- [ ] Exportar PDF propio (hoy es "Imprimir → Guardar como PDF" del navegador).
- [ ] Botón "aplicar a todas las paredes" para no cargar 4 veces la misma separación.
- [ ] El largo de barra y precios se editan siempre en metros/pesos, aunque la unidad global sea cm/mm.
- [ ] Orientación real (norte) en el 3D para estudiar asoleamiento de aberturas.

- [ ] Compartir el proyecto online (link en vez de archivo) y que el herrero cargue sus precios una sola vez
      para todos los proyectos: requiere backend → se resuelve en Construcción Modular (Django).
- [ ] "Plantilla de catálogo": guardar/abrir solo perfiles y precios, para reutilizarlos entre proyectos.

## 🟢 Técnico
- [ ] Ayuda (tooltip) en campos poco obvios: "Dist. a esquina", "Sep. verticales" (glosario en CONTEXT.md).
- [ ] Bundle de ~800 KB (Three.js completo): evaluar carga diferida del visor.
- [ ] Tests de componentes (testing-library) para CampoNumero, SelectorLado y PanelAberturas.
- [ ] Migrar el motor a Django cuando arranque Construcción Modular (los tests sirven de especificación).

## ✅ Resuelto en v1.2.0 (2026-10-01)
- [x] Transversales no se veían: quedaban tapadas por el OSB → OSB semitransparente y transversales más gruesas.
- [x] Color editable por capa (fierros, aberturas, paneles, etc.) desde la leyenda del 3D.
- [x] Guardar / abrir proyecto como archivo `.json` con nombre; botón "Nuevo".

## ✅ Resuelto en v1.1.0 (2026-10-01)
- [x] Frente seleccionable entre los 4 lados (A, B, C, D); nombres, aberturas y cámara se reacomodan.
- [x] Paredes por panel: separación de verticales (eje X) y horizontales (eje Y) por cada lado.
- [x] Entrepiso: se elige contra qué lado se apoya.
- [x] Estructura de techo a una agua: vigas y correas de techo, pendiente y lado de caída editables.
- [x] Transversales con separación editable (0 = sin), definida por el herrero.
- [x] "Tirantes" renombrado a "Estructura de piso" y "Estructura de piso 2", en renglones y capas separadas.
- [x] Aberturas editables directo en la lista.
- [x] Perfil/material de cada renglón del presupuesto editable.

## ✅ Resuelto en v1.0.0 (2026-09-30)
- [x] App en blanco en producción del código (commit 94696eb).
- [x] Barras subestimadas (metros/6) → optimizador de cortes.
- [x] Paso 0 colgaba el navegador → validación con mínimos.
- [x] 3D y cálculo contaban distinto → fuente única de piezas.
- [x] Fuga de memoria WebGL.
- [x] Inputs que se reformateaban al tipear; coma decimal.
- [x] Aberturas que no entraban en la pared.
- [x] Script lint roto, jspdf sin uso, CSS y assets de plantilla, zoom bloqueado en celular.
