# Changelog

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
