# PENDIENTES — loft-calculator

## 🔴 Antes de considerar el presupuesto "de obra"
- [ ] Validar con un herrero/ingeniero los supuestos de `constantes.js` y del modelo estructural
      (cantidad y ubicación de columnas, empalmes de correas y marcos, perfiles elegidos).
- [ ] Las correas no se interrumpen en las aberturas (cálculo conservador: sobra material).
- [ ] **Agregar "Estructura de techo"**: hoy se cotizan los m² de panel PUR del techo, pero no la
      estructura que lo sostiene (vigas/correas de techo con su pendiente). Falta en el cálculo y en el 3D.
- [ ] **Agregar transversales (riostras/bloqueos) entre tirantes** para que no arqueen
      (pandeo lateral). Definir cada cuántos metros van (ej. a mitad de la luz, o cada X m) y con qué perfil.
      Afecta a: estructura de piso, estructura de piso 2 y estructura de techo.

## 🟡 Funcionalidad
- [ ] **Renombrar "Tirantes"** según dónde van:
      - "Estructura de piso" → los de la planta baja.
      - "Estructura de piso 2" → los del altillo.
      Hoy las dos van juntas en un solo renglón del presupuesto y una sola capa del 3D: hay que separarlas
      (dos ítems en `presupuesto.js`, dos capas en `LoftCanvas.jsx`). Revisar el nombre "Ancho altillo"
      y "Paso tirantes piso/altillo" para que usen el mismo vocabulario.
- [ ] **Aberturas editables desde la lista** (`.opening-list`): tocar una abertura para cargarla en el
      formulario, modificarla y guardar (hoy solo hay alta y baja). Debe pasar por `validarAbertura`.
- [ ] Bulonería, soldadura, pintura, fijaciones de PUR y mano de obra no están en el presupuesto.
- [ ] Exportar PDF propio (hoy es "Imprimir → Guardar como PDF" del navegador).
- [ ] El catálogo tiene un solo perfil por función; permitir elegir alternativas (caño 80x80, etc.).
- [ ] El largo de barra y precios se editan siempre en metros/pesos, aunque la unidad global sea cm/mm.

## 🟢 Técnico
- [ ] Agregar ayuda (tooltip) en los campos menos obvios: "Antepecho", "Dist. a esquina", "Paso" (ver glosario en CONTEXT.md).
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
