# PENDIENTES — loft-calculator

Última limpieza: **2026-11-19 (v1.78.0)**; actualizado 2026-11-20 (v1.80.0). Acá queda solo lo abierto, por tema y prioridad (🔴 importante ·
🟡 conviene · 🟢 detalle). Lo resuelto y el detalle de cada pedido viejo: `HISTORIAL-PENDIENTES.md`; lo hecho en cada
versión: `CHANGELOG.md`. Espejo en Trello: tablero "Desarrollo", tarjetas `[CALC]`.

**En GitHub: hasta v1.78.0 (19/11)**; el deploy a https://pollolopez.github.io/micasa/ es automático al pushear.
Manual: `MANUAL.md` y el doc "Pollo Calculator — Manual de usuario" (Claude Docs).

## 📌 Lo que sigue (orden sugerido)
1. 🟡 **Lint de dependencias de los `useMemo`** (react-hooks en `.oxlintrc.json`): así se coló el error de la comparación.
2. 🟡 **Partir `App.jsx`** (1.800 líneas) en pocos hooks por tema (`useObra`, `useCompras`…), con su test.

## 🙋 De tu lado (Leandro)
- 🔴 [ ] Borrar `C:\Users\LLopez\loft-calculator\.git-token.txt` y revocar el token `claude-micasa` en GitHub
  (Settings → Developer settings).
- 🔴 [ ] Llevar la hoja **"Preguntas para el herrero y el durlero — Loft amueblado"** (Claude Docs, 18/11) y cargar las
  respuestas en la app: es lo que más mueve el total.
- 🔴 [ ] En centrosider.com.ar, **borrar los 7 precios de ejemplo** ("Borrar los de ejemplo" en su ficha) y cargar los
  reales; cargar también los 12 materiales "sin precio" (el aviso del Presupuesto lleva a cada uno).
- 🟡 [ ] Datos: el caño 40x40x1.6 tiene $ 11.111.111.111.111 en centrosider (sale ⚠); Vastek tiene 2 de 30 precios
  (descartarlo si ya no se usa).
- 🟡 [ ] Decidir: en el Frente (A) la faja de 2,40 m queda a 10 cm del borde del entrepiso (2,30 m): ¿se unifican?
- 🟡 [ ] Decidir el empalme de fábrica: sobre apoyo (78 barras) o donde rinda más (77).
- 🟡 [ ] Probar en vivo los links de la nube (crear, guardar con el de editar desde otro navegador, que el de ver no
  guarde) y restringir la API key de Firebase a `pollolopez.github.io` y Firestore.
- 🟢 [ ] La carpeta `C:\Users\LLopez\loft-calculator` es una copia vieja del proyecto (septiembre) con ~100 bundles:
  dejar solo los bundles o moverla, para no confundirla con `C:\Users\LLopez\micasa`.

## 🔨 Validar en obra (herrero, durlero, albañil) — todo va en la hoja de preguntas
- 🔴 [ ] Perfiles de cada parte, ubicación de columnas, separaciones y uniones (red soldada, jerarquía, "medida vista").
- 🔴 [ ] Horizontales de pared: hoy NO se cortan en las aberturas (sobra material). Reglas de vanos: columna dentro del
  vano se corta; jamba a menos de 10 cm de una columna no se agrega.
- 🔴 [ ] Rendimientos de obra civil (`RENDIMIENTOS` en obraCivil.js): ladrillos, secciones, panal del pozo, empalmes.
- 🔴 [ ] v1.80 tapial: ø y profundidad de los pilotines, cuántos tramos encofra a la vez, tirante por m², la mezcla que usa
  (1:2:3…) y los ladrillos por m² del que elijas; el portón: caño del bastidor, montantes cada 1 m, riel y herrajes.
- 🟡 [ ] Excedente de las barras de SU proveedor (1 % de fábrica), disco, retazo y cómo empalma.
- 🟡 [ ] Consumibles (electrodos, autoperforantes, sellador, antióxido) y Durlock (T1, T2, cinta, masilla).
- 🟡 [ ] Escalera: zanca, ángulos de apoyo, espesor del piso 2 (8 cm), columnas; tirantes de madera (2" x 5" / 2" x 6").
- 🟡 [ ] Mesada (fondo al piso, patas del zócalo, travesaños; esquina de la L/U) y tabiques (montantes cortos sobre la
  puerta, dintel, barras de 2,60 m).

## 👀 Para mirar en pantalla (probado con tests, no visto)
- 🟡 [ ] v1.80: cargar el tapial (lados, ladrillo, portón en su lugar) y mirar el 3D y el plano de implantación.
- 🟡 [ ] v1.79: cargar los 2 albañiles del Tapial y los ladrillos con precio de cada corralón; elegir uno y ver que el
  precio de la obra y el seguimiento cambian (probado con tu archivo en el Pozo absorbente).
- 🟡 [ ] El sol con "Ver adentro" entra solo por las aberturas; personas sentadas y acostadas; puertas de tabiques que
  se abren al pasar; bisagra y riel del lado elegido.
- 🟡 [ ] Con "al ras", el OSB apoya parejo; con tirantes apoyados, subir también el OSB del 3D.
- 🟡 [ ] Baño de tu proyecto: si las personas siguen sin poder entrar, mirar el aviso "puerta tapada".
- 🟢 [ ] La leyenda "Por perfil" sigue listando los montantes PGC con "Ver estructura de hierro" prendido.

## Presupuesto, precios y compras
- 🟡 [ ] Empalmes: contar la unión (soldadura o cubrejunta) y mostrar cuántos hay; opcional, renglón de refuerzos.
- 🟡 [ ] Desperdicio que no se arregla compartiendo (columnas de ~4,70 m en barras de 6 m): sugerir largo de barra o
  usar los sobrantes en otro perfil compatible; retazos del taller y de otras obras.
- 🟡 [ ] Instalaciones: precios de ejemplo solo en caños y cables; precios por proveedor (hoy una lista propia).
- 🟢 [ ] PDF del presupuesto con número y "válido por N días"; hoja de corte imprimible aparte; PDF propio sin el navegador.
- 🟢 [ ] Largos de la madera configurables (hoy 3,05 / 3,66 / 4,27 / 4,88 m); separación de tirantes según la luz.
- 🟢 [ ] Una compra de hierro de un perfil que no está en la lista va como ticket; los accesorios generales no son de
  ninguna parte de la obra.
- 🟢 [ ] Flete por viaje (cada N barras o kg); proveedores compartidos entre proyectos; comparar "lo más barato" y el
  plan cuando dan igual (sobra una fila).
- 🟢 [ ] Bulonería, soldadura, pintura final, babetas y zinguería (hoy no se calculan).

## Estructura, cortes y planos
- 🟡 [ ] Escalera que atraviesa el entrepiso: el hueco con su marco en la estructura del piso 2 y dibujado en el 3D y el
  plano (el OSB ya lo descuenta, v1.76); que llegue a un borde lateral; baranda (escalera y borde del entrepiso);
  escalones compensados.
- 🟡 [ ] Perfil por pared de columnas y horizontales; patrón "cada N columnas, una de otro perfil"; acortar horizontales
  "desde / hasta" de la esquina; pegar una abertura en OTRA pared; "aplicar a todas las paredes".
- 🟡 [ ] Comparar perfiles (100x100 contra 80x80) y el techo; escenarios completos guardados.
- 🟢 [ ] Planos: escalera, pilotines y zapatas, mesadas y tabiques en la planta; cotas de interiores; escalonar cotas
  juntas; interiores en la hoja "Plantas" del Excel; DXF para CAD.
- 🟢 [ ] Riostras cortadas contra columnas (inglete); columnas del entrepiso contra las de pared; varias filas del medio
  en el entrepiso; columnas del borde libre por borde.
- 🟢 [ ] El 3D dibuja todo con el grosor de la lista; peso con tablas del fabricante; pieza editada con otro perfil
  dibujada con ese perfil.
- 🟢 [ ] Piezas eliminadas o editadas se reconocen por su posición: si una medida las mueve, el cambio deja de aplicarse.

## Paneles y revestimientos
- 🟡 [ ] Placas fijas (OSB, durlock): despiece de cada placa y aprovechar recortes.
- 🟡 [ ] Paneles por caras (chapa/chapa, chapa/madera, SIP), cielorraso (revestimiento interior del techo), precio por
  metro lineal para chapas a medida; colores por capa o por material.
- 🟢 [ ] Tocar un panel del techo en el 3D (hoy solo las paredes).

## Interiores (mesadas, tabiques, muebles)
- 🟢 [ ] Mesada: bacha bajo mesada o apoyada; anafe y horno empotrados como huecos.
- 🟢 [ ] Tabiques: unirlos en L; cerramiento de ducha de vidrio; puertas de abrir dibujadas entreabiertas con su barrido.
- 🟢 [ ] Mover y girar mesadas y tabiques desde el 3D; elegirlos por sus placas; frenar la escalera en la pared al moverla.
- 🟢 [ ] Muebles: foto del frente; muebles en el plano; apoyar un electrodoméstico chico sobre una mesada; más equipos
  (microondas, lavavajillas, termotanque, estufa); puertas de muebles que se abren.

## Instalaciones, equipos, terreno y sol
- 🟡 [ ] Tes y derivaciones (hoy cada tramo es punto a punto); cálculo de la correa que aguanta el solar.
- 🟡 [ ] Probar el terreno con un lote real (medidas, orientación, retiros de Mercedes).
- 🟢 [ ] Mover puntos de instalación desde el 3D; pendiente de los desagües; ambientes con nombre (para los aires).
- 🟢 [ ] Lugar del sol editable (hoy Mercedes); sombras en el PDF; vereda municipal y ochava.

## 3D y personas
- 🟡 [ ] Barra del 3D: agrupar en menús (fue creciendo); textos de ayuda largos → uno corto y un "?".
- 🟡 [ ] Seleccionar en el 3D con el dedo (margen de toque más grande o lista de piezas por pared); varias piezas a la vez.
- 🟢 [ ] Personas: subir y bajar la escalera, salir al terreno, esquivarse y darse paso en una puerta, usar sillas;
  que el perro siga a alguien.
- 🟢 [ ] Elegir qué vistas por partes van al PDF; ocultar los carteles en las vistas fijas; texturas en el modo realista;
  guardar las medidas fijadas en el proyecto; "perfiles de exportación" con nombre (Panelero, Herrero, Cliente).

## Obra, seguimiento y finanzas
- 🟢 [ ] Crédito con interés y sistema francés (hoy cuotas fijas); revoque e hidrófugo de la cámara; mano de obra del
  tapial por m²; medidas propias del tapial y el pozo; precios de mano de obra por contratista.
- 🟢 [ ] Comprobantes (foto o PDF del recibo): necesita dónde guardarlos (Firebase Storage o Django).

## Pantalla (UX / UI)
- 🟡 [ ] En el celular las sub-pestañas ocupan 2 o 3 renglones: nombres más cortos o un renglón deslizable.
- 🟡 [ ] Modo claro para usar a pleno sol; largo de barra y precios siempre en m y $ aunque la unidad sea cm/mm.
- 🟢 [ ] Pestañas cortadas en el celular ("Estruc…", "$ 90…"); nombre del proyecto cortado; el aviso verde de "archivo
  abierto" queda fijo hasta cerrarlo; el mismo estilo de botón para la misma acción; tooltips en campos poco obvios.

## Código, rendimiento y pruebas
- 🟡 [ ] Lint de hooks · partir `App.jsx` (ver "Lo que sigue"); partir `LoftCanvas.jsx` (2.500 líneas) por tema.
- 🟡 [ ] El panel entero se vuelve a dibujar en cada cambio (12.300 elementos): `memo` en los paneles pesados (con
  `cambiar` estable) y montar las hojas del PDF solo al imprimir.
- 🟡 [ ] Guardar en el repo (`e2e/`) los flujos de Playwright que se usan para probar y correrlos antes de cada deploy.
- 🟡 [ ] Respaldo: avisar si hace más de N días que el proyecto no se guarda en archivo o en la nube.
- 🟢 [ ] Un JS de 1,5 MB (420 KB comprimido): cargar Three.js y los planos aparte; geometrías compartidas en el 3D.
- 🟢 [ ] `pesos()` copiado en 16 archivos: un `formato.js` común; tests de componentes (testing-library).

## Seguridad
- 🟢 [ ] Limitar el tamaño al descomprimir un link (uno armado a propósito podría colgar la pestaña).
- 🟢 [ ] Historial de versiones del link de la nube (para volver atrás).

## Grada y montaje industrial (proyectos aparte)
- 🟢 [ ] Grada: baranda trasera y lateral, peso por módulo, planchuelas de unión, pasillo entre filas, riostras de
  adelante hacia atrás; validar perfiles y carga por pórtico.
- 🟢 [ ] Montaje: cinta transportadora, cilindro/cono/tolva de chapa, chapa por espesor, anclajes y bridas, giro libre,
  croquis en la tablet.

## A futuro (con servidor: Construcción Modular / Django)
- 🟢 [ ] Cuentas por herrero, catálogo compartido, varias obras y comprobantes; migrar el motor a Django (los tests
  sirven de especificación) y escribir el ADR "seguimiento en Pollo Calculator, Django cuando crezca".
- 🟢 [ ] Usuarios con login y módulos por usuario (Grada, Montaje y Nube como módulos); IA que lea la foto de un croquis.
