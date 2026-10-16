# PENDIENTES — loft-calculator

Última limpieza: 2026-10-15 (v1.14.0). Espejo en Trello: tablero "Desarrollo", tarjetas `[CALC]`.

## 🔴 Antes de considerar el presupuesto "de obra" (validar con el herrero)
- [ ] Llevarle la hoja "Preguntas para el herrero" (Claude Docs, enlazada en la tarjeta de Trello) — antes,
      Leandro actualiza su plano y se regenera con los valores de SU proyecto.
- [ ] Supuestos de `constantes.js` y del modelo: ubicación de columnas, empalmes, perfil de cada renglón
      y separación de transversales.
- [ ] Horizontales de pared: hoy NO se cortan en las aberturas (cálculo conservador: sobra material). ¿Se cortan en obra?
- [ ] Reglas de vanos: columna dentro del vano se corta (tramo bajo el antepecho y sobre el dintel);
      jamba a menos de 10 cm de una columna no se agrega.
- [ ] Escalera: perfil de zanca (caño 120x60), ángulos de apoyo, espesor de piso 2 (8 cm para la altura
      automática) y cantidad de columnas.
- [ ] Excedente de las barras: depende del proveedor. El herrero tiene que cargar el % de SU proveedor
      (viene en 1 %; avisado en la pantalla y en el manual).

## Pruebas de Leandro (16/10) — a ordenar
- 🔴 [ ] Paneles por medida: cargar ancho × largo del panel (y espesor) y contar PANELES enteros por pared/techo,
      no solo m² (hoy "no calcula bien" para comprar).
- 🟡 [ ] Tarjeta **Materiales**: el herrero carga cada material (tipo, medida, espesor, largo de barra, color).
      La tarjeta **Presupuesto** queda solo con cantidades y precios.
- 🟡 [ ] En cada pared: elegir el perfil de sus columnas y horizontales (no solo el panel / revestimiento).
- 🟡 [ ] Patrón de perfiles en una pared: "cada N columnas, una de otro perfil" o dos capas de perfiles.
- 🟡 [ ] Elegir color en todos los materiales (como en los tipos de panel).
- 🟡 [ ] Medir distancias en el 3D (ej. entre dos columnas).
- 🟡 [ ] Duplicar una pieza seleccionada; seleccionar y editar aberturas desde el 3D (y duplicarlas).
- 🟡 [ ] Acortar piezas más intuitivo (ej. "arranca a X m / termina a Y m", o arrastrando en el 3D).
- ✅ Hecho en v1.14.1: marcos de aberturas con renglón propio; paredes plegables (aria-expanded); "Eliminar
      pieza" menos llamativo que "Cerrar"; textos del editor ("Perfil de esta pieza", "Acortar la punta de…");
      nombre de archivo sin "pollo-pollo".

## 🟡 Funcionalidad

### Estructura
- [ ] Entrepiso parcial — confirmar con el herrero (hoja de preguntas, sección 4): si el borde libre necesita
      columnas y cada cuánto (hoy 2,50 m), sentido de los tirantes, perfil de la viga de cierre.
- [ ] Escalera que llegue a un borde LATERAL del entrepiso parcial (hoy solo al borde de enfrente de la pared).
- [ ] Aleros del techo (voladizo de vigas y chapa más allá de las paredes).

### Escalera
- [ ] Baranda (en la escalera y en el borde del entrepiso).
- [ ] Escalera atravesando el entrepiso (hueco en la estructura de piso 2 con su marco; descontar OSB).
- [ ] Escalones compensados (en abanico) en los giros, como alternativa al descanso plano.

### Grada
- [ ] Baranda trasera y lateral (aviso cuando pasa de 1 m de alto).
- [ ] Peso por módulo (para saber si lo levantan dos personas): necesita kg/m de cada caño.
- [ ] Planchuelas o placas de unión entre módulos (hoy solo se cuentan los bulones).
- [ ] Escalera o pasillo de acceso entre filas; riostras también en el sentido de adelante hacia atrás.
- [ ] Validar con el herrero los perfiles de la grada y la carga por pórtico.

### Montaje industrial
- [ ] Cinta transportadora (estructura, rodillos de carga y retorno, tambores, largo de banda).
- [ ] Cilindro / cono / tolva sueltos de chapa, con su desarrollo.
- [ ] Croquis en la tablet (dibujar o calcar una foto, acotar líneas, repetir el bastidor a lo largo).
- [ ] Chapa por espesor: hoy hay un solo renglón para tanques y uno para tapas; si hay tanques de distinto espesor,
      separar renglones. Tamaño de chapa comercial editable (hoy 2,44 x 1,22).
- [ ] Anclajes, bridas, bocas y accesorios de tanques; giro libre (no solo 0° / 90°).
- [ ] Más adelante: que la IA lea la foto de un croquis (necesita servidor, Construcción Modular).

### Presupuesto
- [ ] Bulonería, soldadura, pintura, fijaciones de paneles, babetas/zinguería y mano de obra.
- [ ] Exportar PDF propio (hoy es "Imprimir → Guardar como PDF" del navegador; ya incluye la vista 3D). Sumar
      vistas fijas (frente, lateral, planta) además de la vista actual.

### Uso
- [ ] Botón "aplicar a todas las paredes" para no cargar 4 veces la misma separación.
- [ ] Largo de barra y precios se editan siempre en metros/pesos, aunque la unidad global sea cm/mm.
- [ ] Seleccionar varias piezas a la vez (ej. Shift + clic) para eliminarlas o editarlas juntas.
- [ ] Pieza editada con otro perfil: dibujarla con la sección/color de ese perfil en el 3D (hoy solo cambia el presupuesto).
- [ ] Orientación real (norte) en el 3D para estudiar asoleamiento de aberturas.

### Requiere backend (Construcción Modular / Django o Firebase) — a futuro
- [ ] Cuentas por herrero (usuario y contraseña): cada uno ve sus planos desde cualquier compu o celular.
- [ ] Proyectos en la nube: verlos desde cualquier compu/celular y compartirlos con el herrero por link.
- [ ] Catálogo compartido: el herrero carga sus precios una sola vez ("plantilla de catálogo").

## 🟢 Técnico
- [ ] En el celular el encabezado ocupa ~3 renglones: evaluar un menú compacto.
- [ ] Ayuda (tooltip) en campos poco obvios: "Dist. a esquina", "Sep. verticales" (glosario en CONTEXT.md).
- [ ] Bundle de ~906 KB (Three.js completo; Vite avisa al deployar): evaluar carga diferida del visor.
- [ ] Tests de componentes (testing-library) para CampoNumero, SelectorLado, PanelAberturas y EditorPieza.
- [ ] Piezas eliminadas/editadas se reconocen por su posición: si una medida las mueve, el cambio deja de
      aplicarse (se avisa en la lista). Evaluar si hace falta algo más robusto.
- [ ] Migrar el motor a Django cuando arranque Construcción Modular (los tests sirven de especificación).

## ✅ Resuelto en v1.14.1 (2026-10-16)
- [x] Dintel, jambas y alféizar en su propio renglón "Marcos de aberturas" (antes con las columnas).
- [x] Cada pared se pliega desde su título; "Eliminar pieza" aparte y con borde; textos del editor más claros.
- [x] Archivo "Pollo casa" => pollo-casa-fecha.json (antes pollo-pollo-casa-…).

## ✅ Resuelto en v1.14.0 (2026-10-15)
- [x] Entrepiso parcial (largo × profundidad, desde una esquina) con viga de cierre en los bordes libres (renglón
      propio) y columnas del borde libre cada X m.
- [x] Encabezado "🐤 Pollo Calculator".

## ✅ Resuelto en v1.13.1 (2026-10-14)
- [x] La app se llama Pollo Calculator.

## ✅ Resuelto en v1.13.0 (2026-10-14)
- [x] Grada: caño que une los parantes, tabla de respaldo, elegir el caño de cada parte, módulos y filas atornillables.

## ✅ Resuelto en v1.12.0 (2026-10-14)
- [x] Opacidad de paneles, OSB y hierros; color interior y exterior de los paneles.
- [x] Compartir un proyecto por link (con las medidas, no el ejemplo).
- [x] El PDF incluye la imagen de la estructura.

## ✅ Resuelto en v1.11.0 (2026-10-14)
- [x] Montaje industrial con varios componentes: mesa / bastidor y tanque cilíndrico (chapas, soldadura, peso, litros).

## ✅ Resuelto en v1.10.0 (2026-10-14)
- [x] Grada: asiento y pie pueden ser el mismo tablón, o un solo tipo de tablón por fila.

## ✅ Resuelto en v1.9.0 (2026-10-14)
- [x] Grada para espectadores como proyecto propio, con parantes, vigas longitudinales y riostras en cruz.
- [x] Escalera: parantes (hasta 12 por tramo) y riostras en cruz entre parantes.

## ✅ Resuelto en v1.8.0 (2026-10-14)
- [x] Escalera con más de un descanso (U y 3/4 de vuelta) y aviso de paso libre.
- [x] Editar piezas sueltas: recortar, mover y cambiar el perfil (ej. columna del altillo hasta el piso 2).
- [x] Etiquetas de las paredes en el 3D: nombre propio y mostrar/ocultar.

## ✅ Resuelto en v1.7.0 (2026-10-13)
- [x] Diseño de escaleras: recta o en L con descanso, al borde del entrepiso; ancho, huella, contrahuella,
      altura total; zanca central, apoyos de ángulo o recorte de caño, columnas de soporte; presupuesto y 3D.
- [x] Tarjetas del panel y leyenda de capas plegables; ocultar el 3D para cargar datos (sobre todo en celular).

Versiones anteriores (v1.0 a v1.6): ver `CHANGELOG.md`.
