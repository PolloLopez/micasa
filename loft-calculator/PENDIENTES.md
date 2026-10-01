# PENDIENTES — loft-calculator

## 🔴 Antes de considerar el presupuesto "de obra"
- [ ] Validar con un herrero/ingeniero los supuestos de `constantes.js` y del modelo estructural
      (cantidad y ubicación de columnas, empalmes de correas y marcos, perfiles elegidos).
- [ ] Las correas no se interrumpen en las aberturas (cálculo conservador: sobra material).

## 🟡 Funcionalidad
- [ ] Bulonería, soldadura, pintura, fijaciones de PUR y mano de obra no están en el presupuesto.
- [ ] Exportar PDF propio (hoy es "Imprimir → Guardar como PDF" del navegador).
- [ ] El catálogo tiene un solo perfil por función; permitir elegir alternativas (caño 80x80, etc.).
- [ ] Editar una abertura existente (hoy solo alta y baja).
- [ ] El largo de barra y precios se editan siempre en metros/pesos, aunque la unidad global sea cm/mm.

## 🟢 Técnico
- [ ] Bundle de ~800 KB (Three.js completo): evaluar carga diferida del visor.
- [ ] Tests de componentes (testing-library) para CampoNumero y validaciones de la UI.
- [ ] Migrar el motor a Django cuando arranque Construcción Modular (los tests sirven de especificación).

## ✅ Resuelto en v1.0.0 (2026-09-30)
- [x] App en blanco en producción del código (commit 94696eb).
- [x] Barras subestimadas (metros/6) → optimizador de cortes.
- [x] Paso 0 colgaba el navegador → validación con mínimos.
- [x] 3D y cálculo contaban distinto → fuente única de piezas.
- [x] Fuga de memoria WebGL.
- [x] Inputs que se reformateaban al tipear; coma decimal.
- [x] Aberturas que no entraban en la pared.
- [x] Script lint roto, jspdf sin uso, CSS y assets de plantilla, zoom bloqueado en celular.
