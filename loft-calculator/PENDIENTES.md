# PENDIENTES — loft-calculator

Última limpieza: 2026-10-14 (v1.8.0 en producción). Espejo en Trello: tablero "Desarrollo", tarjetas `[CALC]`.

## 🔴 Antes de considerar el presupuesto "de obra" (validar con el herrero)
- [ ] Supuestos de `constantes.js` y del modelo: ubicación de columnas, empalmes, perfil de cada renglón
      y separación de transversales.
- [ ] Horizontales de pared: hoy NO se cortan en las aberturas (cálculo conservador: sobra material). ¿Se cortan en obra?
- [ ] Reglas de vanos: columna dentro del vano se corta (tramo bajo el antepecho y sobre el dintel);
      jamba a menos de 10 cm de una columna no se agrega.
- [ ] Escalera: perfil de zanca (caño 120x60), ángulos de apoyo, espesor de piso 2 (8 cm para la altura
      automática) y cantidad de columnas.
- [ ] Excedente de las barras: depende del proveedor. El herrero tiene que cargar el % de SU proveedor
      (viene en 1 %; avisado en la pantalla y en el manual).

## 🟡 Funcionalidad

### Estructura
- [ ] Entrepiso parcial: que el piso 2 cubra solo una parte del lado donde se apoya (ej. altillo sobre la
      mitad). Definir: medida (largo × profundidad) o "hasta X m desde la esquina"; viga de cierre en el borde libre.
- [ ] Aleros del techo (voladizo de vigas y chapa más allá de las paredes).

### Escalera
- [ ] Baranda (en la escalera y en el borde del entrepiso).
- [ ] Escalera atravesando el entrepiso (hueco en la estructura de piso 2 con su marco; descontar OSB).
- [ ] Escalones compensados (en abanico) en los giros, como alternativa al descanso plano.

### Presupuesto
- [ ] Bulonería, soldadura, pintura, fijaciones de paneles, babetas/zinguería y mano de obra.
- [ ] Exportar PDF propio (hoy es "Imprimir → Guardar como PDF" del navegador).

### Uso
- [ ] Botón "aplicar a todas las paredes" para no cargar 4 veces la misma separación.
- [ ] Largo de barra y precios se editan siempre en metros/pesos, aunque la unidad global sea cm/mm.
- [ ] Seleccionar varias piezas a la vez (ej. Shift + clic) para eliminarlas o editarlas juntas.
- [ ] Pieza editada con otro perfil: dibujarla con la sección/color de ese perfil en el 3D (hoy solo cambia el presupuesto).
- [ ] Orientación real (norte) en el 3D para estudiar asoleamiento de aberturas.

### Requiere backend (Construcción Modular / Django o Firebase)
- [ ] Proyectos en la nube: verlos desde cualquier compu/celular y compartirlos con el herrero por link.
- [ ] Catálogo compartido: el herrero carga sus precios una sola vez ("plantilla de catálogo").

## 🟢 Técnico
- [ ] En el celular el encabezado ocupa ~3 renglones: evaluar un menú compacto.
- [ ] Ayuda (tooltip) en campos poco obvios: "Dist. a esquina", "Sep. verticales" (glosario en CONTEXT.md).
- [ ] Bundle de ~800 KB (Three.js completo): evaluar carga diferida del visor.
- [ ] Tests de componentes (testing-library) para CampoNumero, SelectorLado, PanelAberturas y EditorPieza.
- [ ] Piezas eliminadas/editadas se reconocen por su posición: si una medida las mueve, el cambio deja de
      aplicarse (se avisa en la lista). Evaluar si hace falta algo más robusto.
- [ ] Migrar el motor a Django cuando arranque Construcción Modular (los tests sirven de especificación).

## ✅ Resuelto en v1.8.0 (2026-10-14)
- [x] Escalera con más de un descanso (U y 3/4 de vuelta) y aviso de paso libre.
- [x] Editar piezas sueltas: recortar, mover y cambiar el perfil (ej. columna del altillo hasta el piso 2).
- [x] Etiquetas de las paredes en el 3D: nombre propio y mostrar/ocultar.

## ✅ Resuelto en v1.7.0 (2026-10-13)
- [x] Diseño de escaleras: recta o en L con descanso, al borde del entrepiso; ancho, huella, contrahuella,
      altura total; zanca central, apoyos de ángulo o recorte de caño, columnas de soporte; presupuesto y 3D.
- [x] Tarjetas del panel y leyenda de capas plegables; ocultar el 3D para cargar datos (sobre todo en celular).

Versiones anteriores (v1.0 a v1.6): ver `CHANGELOG.md`.
