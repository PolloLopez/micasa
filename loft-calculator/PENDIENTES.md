# PENDIENTES — loft-calculator

## 🔴 Antes de considerar el presupuesto "de obra"
- [ ] Validar con el herrero los supuestos de `constantes.js` y del modelo estructural: ubicación de
      columnas, empalmes, perfiles de cada renglón y separación de transversales.
- [ ] Las horizontales de pared no se interrumpen en las aberturas (cálculo conservador: sobra material).
- [ ] Validar con el herrero las reglas de vanos: columna dentro del vano se corta (tramo bajo el antepecho
      y sobre el dintel); jamba a menos de 10 cm de una columna no se agrega.
- [ ] Validar con el herrero la escalera: perfil de zanca (caño 120x60), ángulos de apoyo, espesor de
      piso 2 (8 cm para la altura automática) y cantidad de columnas.

## 🟡 Funcionalidad
- [ ] Aleros del techo (voladizo de vigas y chapa más allá de las paredes).
- [ ] Bulonería, soldadura, pintura, fijaciones de paneles, babetas/zinguería y mano de obra no están en el presupuesto.
- [ ] Exportar PDF propio (hoy es "Imprimir → Guardar como PDF" del navegador).
- [ ] Botón "aplicar a todas las paredes" para no cargar 4 veces la misma separación.
- [ ] El largo de barra y precios se editan siempre en metros/pesos, aunque la unidad global sea cm/mm.
- [ ] Orientación real (norte) en el 3D para estudiar asoleamiento de aberturas.

- [ ] Proyectos en la nube (verlos desde cualquier compu/celular, compartir con el herrero por link) y que el
      herrero cargue sus precios una sola vez para todos los proyectos: requiere backend → Construcción Modular
      (Django) o Firebase. Hoy "Mis proyectos" vive en cada navegador.
- [ ] "Plantilla de catálogo": guardar/abrir solo perfiles y precios, para reutilizarlos entre proyectos.

- [ ] Seleccionar varias piezas a la vez (ej. Shift + clic) para eliminarlas o editarlas juntas.
- [ ] Pieza editada con otro perfil: dibujarla con la sección/color de ese perfil en el 3D (hoy solo cambia el presupuesto).
- [ ] Las piezas eliminadas se reconocen por su posición: si se cambia una medida y la pieza se mueve,
      la eliminación deja de aplicarse (se avisa en la lista). Evaluar si hace falta algo más robusto.

- [ ] Escalera: baranda (en la escalera y en el borde del entrepiso).
- [ ] Escalera atravesando el entrepiso (hueco en la estructura de piso 2 con su marco).
- [ ] Escalones compensados (en abanico) en los giros, como alternativa al descanso plano.

## 🟢 Técnico
- [ ] En el celular el encabezado ocupa ~3 renglones: evaluar un menú compacto.
- [ ] Ayuda (tooltip) en campos poco obvios: "Dist. a esquina", "Sep. verticales" (glosario en CONTEXT.md).
- [ ] Bundle de ~800 KB (Three.js completo): evaluar carga diferida del visor.
- [ ] Tests de componentes (testing-library) para CampoNumero, SelectorLado y PanelAberturas.
- [ ] Migrar el motor a Django cuando arranque Construcción Modular (los tests sirven de especificación).

## ✅ Resuelto en v1.8.0 (2026-10-14)
- [x] Escalera con más de un descanso (U y 3/4 de vuelta) y aviso de paso libre.
- [x] Editar piezas sueltas: recortar, mover y cambiar el perfil (ej. columna del altillo hasta el piso 2).
- [x] Etiquetas de las paredes en el 3D: nombre propio y mostrar/ocultar.

## ✅ Resuelto en v1.7.0 (2026-10-13)
- [x] Diseño de escaleras: recta o en L con descanso, al borde del entrepiso; ancho, huella, contrahuella,
      altura total; zanca central, apoyos de ángulo o recorte de caño, columnas de soporte; presupuesto y 3D.
- [x] Tarjetas del panel y leyenda de capas plegables; ocultar el 3D para cargar datos (sobre todo en celular).

## ✅ Resuelto en v1.6.0 (2026-10-09)
- [x] "Mis proyectos": lista de proyectos guardados en el navegador con Guardar, Guardar como… (con nombre),
      Abrir, Duplicar, Renombrar y Borrar; aviso de cambios sin guardar.
- [x] Respaldo de todos los proyectos en un archivo e importación en otro navegador (sin pisar los existentes).

## ✅ Resuelto en v1.5.0 (2026-10-09)
- [x] Ocultar una pared, el techo o un piso oculta también sus hierros ("Mostrar:" en la leyenda).
- [x] Seleccionar un hierro con un clic en el 3D y eliminarlo; lista de piezas eliminadas con "Restaurar".
- [x] Columna dentro de un vano: se corta (ya no se cuenta entera dentro de la ventana).
- [x] Jamba sobre una columna: no se duplica.
- [x] Refuerzos de aberturas (dintel, jambas, alféizar) dibujados en el 3D.
- [x] Test que verifica que no hay piezas superpuestas en el modelo.

## ✅ Resuelto en v1.4.0 (2026-10-02)
- [x] "Nuevo" borra todo: caja mínima 3 x 3 x 2,40 sin aberturas, sin entrepiso ni transversales, techo plano,
      precios en $0, perfiles vacíos y un solo tipo de panel. El loft queda en el botón "Ejemplo".
- [x] Capa "Paneles": interruptor general + uno por pared (frente, laterales, fondo) y techo.

## ✅ Resuelto en v1.3.0 (2026-10-02)
- [x] Transversales con separación propia para cada piso (planta baja y piso 2) y renglón propio en el presupuesto.
- [x] Tipos de panel: cada pared y el techo eligen el suyo; m² por tipo en el presupuesto y color por tipo en el 3D.
- [x] Barras con excedente (1-2 % más largas): parámetro "Excedente de las barras" (1 % por defecto).
      Resuelve el 50 % de desperdicio de la estructura de piso 2 (11 → 6 barras).
- [x] Datos de la v1.2 (navegador y archivos .json) se convierten solos al formato nuevo.

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
