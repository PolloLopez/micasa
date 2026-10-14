# Changelog

## [1.7.0] - 2026-10-13
### Agregado
- Escaleras (panel "Escalera"): llegan al borde libre del entrepiso y bajan hacia la pared elegida
  (paralela al borde o perpendicular). Forma recta o en L con descanso (contrahuellas hasta el descanso y
  hacia dónde baja el 2º tramo).
- Medidas: ancho, huella, contrahuella objetivo y altura total (0 = automática, piso 2 + espesor del piso).
  Todas las contrahuellas salen iguales; resumen con cantidad y medida de escalones y regla de comodidad
  (2 contrahuellas + huella entre 60 y 65 cm). Avisos si es incómoda, empinada o se sale de la planta.
- Estructura: zanca central por tramo, apoyos de escalón (2 ángulos o 1 recorte de caño central, editables),
  columnas bajo la zanca y 1/2/4 columnas en el descanso. Todo se puede seleccionar y eliminar en el 3D.
- Presupuesto: zanca y marco de descanso, apoyos, columnas de escalera, escalones de madera (u) y piso del descanso (m²).
- Capas "Escalera" y "Escalones" con color propio y "Mostrar: Escalera".
### Cambiado
- Los proyectos y datos guardados con versiones anteriores se abren sin escalera.
- Los colores guardados se conservan al agregar capas nuevas (antes se hubieran reseteado).

## [1.6.0] - 2026-10-09
### Agregado
- "Mis proyectos": lista de proyectos guardados en el navegador. Guardar, Guardar como… (con el nombre que se
  quiera), Abrir, Duplicar, Renombrar y Borrar. Indicador "✓ Guardado / ● Cambios sin guardar" al lado del nombre
  y aviso antes de perder cambios.
- Exportar un respaldo de todos los proyectos e importarlo en otro navegador (no pisa los existentes y saltea
  proyectos rotos avisando cuáles).
### Cambiado
- El encabezado queda con "Mis proyectos", "Guardar" y "Guardar como…". Nuevo, Ejemplo y los archivos .json
  (descargar / abrir) pasan a la ventana "Mis proyectos".

## [1.5.0] - 2026-10-09
### Agregado
- Seleccionar un hierro con un clic en el 3D (se resalta en amarillo) y eliminarlo. Las piezas eliminadas
  salen del dibujo y del presupuesto, se guardan con el proyecto y se pueden restaurar desde una lista.
- "Mostrar:" en la leyenda del 3D: ocultar una pared, el techo, el piso o el piso 2 oculta su panel y sus hierros.
- Los refuerzos de las aberturas (dintel, jambas y alféizar) se dibujan en el 3D.
### Corregido
- Una columna que caía dentro de un vano se contaba entera: ahora se corta (tramo bajo el antepecho y sobre el dintel).
- Una jamba que coincidía con una columna se contaba dos veces: ahora la columna hace de jamba.

## [1.4.0] - 2026-10-02
### Cambiado
- "Nuevo" borra todos los datos: caja mínima de 3 x 3 x 2,40 m, sin aberturas, sin entrepiso ni transversales,
  techo plano, precios en $0, perfiles vacíos y un solo tipo de panel genérico.
### Agregado
- Botón "Ejemplo" que carga el loft de referencia.
- Capa "Paneles" del 3D: interruptor general y uno por cada pared (frente, laterales, fondo) y el techo.

## [1.3.0] - 2026-10-02
### Agregado
- Tipos de panel (nombre, descripción, precio por m², color): cada pared y el techo eligen el suyo.
  El presupuesto suma los m² por tipo y el 3D pinta cada superficie con el color de su panel.
- Separación de transversales por piso (planta baja y piso 2), con renglones separados en el presupuesto.
- "Excedente de las barras" (%): el optimizador corta sobre el largo real de la barra (nominal + excedente).
### Cambiado
- Archivo de proyecto: formato versión 3. Los archivos de la v1.2 (versión 2) se siguen abriendo y se convierten solos.
- Los datos guardados en el navegador con la v1.2 se convierten solos (no se resetean).
### Corregido
- Estructura de piso 2 con 50 % de desperdicio: dos piezas de 3,00 m ahora entran en una barra (6,06 m reales).

## [1.2.0] - 2026-10-01
### Agregado
- Guardar proyecto como archivo `.json` (con nombre) y abrirlo después; botón "Nuevo".
  Al abrir se valida todo y un archivo roto no reemplaza el proyecto actual.
- Color editable por capa desde la leyenda del 3D (columnas, marcos, pisos, aberturas, paneles, etc.).
- Capa "Aberturas" que se puede ocultar.
### Corregido
- Las transversales no se veían: quedaban tapadas por la placa OSB. Ahora el OSB es semitransparente
  y las transversales son un poco más gruesas que la estructura de piso.

## [1.1.0] - 2026-10-01
### Agregado
- Frente seleccionable entre los 4 lados (A, B, C, D): nombres de paredes, carteles en el 3D y cámara se reacomodan.
- Configuración por pared: separación de verticales (eje X) y horizontales (eje Y).
- Entrepiso apoyado contra el lado que se elija.
- Techo a una agua: lado de caída, pendiente %, vigas y correas de techo (cálculo, presupuesto y 3D).
- Transversales entre la estructura de los pisos, con separación editable (0 = sin).
- Aberturas editables directamente en la lista; perfil/material editable en cada renglón del presupuesto.
- Botón "Ver frente" y capas nuevas en el 3D (piso, piso 2, transversales, techo).
### Cambiado
- "Tirantes" pasa a "Estructura de piso" y "Estructura de piso 2", en renglones separados.
- La estructura de cada piso cruza la luz más corta.
- Paneles: renglón separado para muros y techo; el techo se mide sobre la pendiente.
- Datos guardados en el navegador: prefijo `micasa.v2.` (los de v1 se descartan una vez).

## [1.0.0] - 2026-09-30
### Recuperado
- UI completa desde el commit `273301f` (el `94696eb` la había borrado).
### Agregado
- Motor de cálculo en `src/motor/` con 25 tests (Vitest).
- Optimizador de cortes con merma y empalmes; diagrama de cortes por perfil.
- Validación de parámetros y aberturas.
- Capas visibles en el 3D, guardado en el navegador, botón Restablecer.
### Corregido
- Barras subestimadas ~22 %; cuelgue con paso 0; 3D y presupuesto desalineados;
  fuga de contextos WebGL; inputs que se reformateaban al tipear; scroll horizontal en celular.
### Quitado
- `jspdf` (sin uso), alta de insumos libres, CSS y assets de plantilla.
