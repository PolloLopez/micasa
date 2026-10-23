// ==========================================================
// XLSX mínimo, sin librerías (v1.26)
// ----------------------------------------------------------
// Un archivo .xlsx es un .zip con unos XML adentro:
//   [Content_Types].xml        qué tipo es cada archivo
//   _rels/.rels                dónde está el libro
//   xl/workbook.xml            la lista de hojas
//   xl/_rels/workbook.xml.rels dónde está cada hoja
//   xl/styles.xml              formatos (negrita y números con 2 decimales)
//   xl/worksheets/sheetN.xml   las celdas de cada hoja
// Los textos van "inline" (dentro de la celda), así no hace falta la tabla
// de textos compartidos. El zip va SIN comprimir (método "stored"):
// el archivo queda un poco más grande, pero el código es simple.
//
// Uso:
//   crearXlsx([{ nombre: 'Presupuesto', anchos: [30, 12], filas: [
//     { negrita: true, celdas: ['Insumo', 'Cantidad'] },
//     ['Columnas', 12],
//   ] }])  -> Uint8Array con el archivo
// ==========================================================

const codificar = (texto) => new TextEncoder().encode(texto);

/** Escapa los caracteres especiales de XML (&, <, >, comillas). */
const escapar = (texto) => String(texto)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Caracteres de control no permitidos en XML (salvo tab y saltos de línea).
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** Columna 0 -> "A", 25 -> "Z", 26 -> "AA". */
function letraDeColumna(n) {
  let letras = '';
  let resto = n + 1;
  while (resto > 0) {
    const m = (resto - 1) % 26;
    letras = String.fromCharCode(65 + m) + letras;
    resto = Math.floor((resto - 1) / 26);
  }
  return letras;
}

/** Nombre de hoja válido para Excel: hasta 31 letras, sin \ / ? * [ ] : y sin repetir. */
function nombresDeHoja(nombres) {
  const usados = new Set();
  return nombres.map((n) => {
    const base = (String(n).replace(/[\\/?*[\]:]/g, '-').trim() || 'Hoja').slice(0, 31);
    let nombre = base;
    for (let i = 2; usados.has(nombre.toLowerCase()); i++) nombre = `${base.slice(0, 28)} (${i})`;
    usados.add(nombre.toLowerCase());
    return nombre;
  });
}

/**
 * Estilos: 0 = normal, 1 = negrita, 2 = número con 2 decimales, 3 = pesos sin decimales.
 */
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot; #,##0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/**
 * Una celda. Un número va como número (con 2 decimales si no es entero);
 * { pesos: n } va con formato de pesos; lo demás, como texto.
 */
function celda(valor, ref, negrita) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'object' && Number.isFinite(valor.pesos)) {
    return `<c r="${ref}" s="3"><v>${Math.round(valor.pesos)}</v></c>`;
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const estilo = negrita ? 1 : Number.isInteger(valor) ? 0 : 2;
    return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${negrita ? ' s="1"' : ''}><is><t xml:space="preserve">${escapar(valor)}</t></is></c>`;
}

function hojaXml({ filas, anchos = [] }) {
  const columnas = anchos.length
    ? `<cols>${anchos.map((a, i) => `<col min="${i + 1}" max="${i + 1}" width="${a}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const cuerpo = filas.map((fila, i) => {
    const { celdas, negrita } = Array.isArray(fila) ? { celdas: fila, negrita: false } : fila;
    const r = i + 1;
    return `<row r="${r}">${celdas.map((v, j) => celda(v, `${letraDeColumna(j)}${r}`, negrita)).join('')}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${columnas}<sheetData>${cuerpo}</sheetData></worksheet>`;
}

// ---------------- ZIP (sin comprimir) ----------------

/** Tabla del CRC-32 (el "dígito verificador" que pide el formato zip para cada archivo). */
const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Arma un .zip con los archivos { nombre, contenido (Uint8Array) }, sin comprimir. */
export function crearZip(archivos) {
  const partes = [];
  const central = [];
  let desplazamiento = 0;
  const encabezado = (largo, completar) => {
    const b = new Uint8Array(largo);
    completar(new DataView(b.buffer));
    return b;
  };
  archivos.forEach(({ nombre, contenido }) => {
    const nombreBytes = codificar(nombre);
    const crc = crc32(contenido);
    const local = encabezado(30, (v) => {
      v.setUint32(0, 0x04034b50, true); // firma "archivo local"
      v.setUint16(4, 20, true); // versión necesaria
      v.setUint16(6, 0x0800, true); // nombres en UTF-8
      v.setUint16(8, 0, true); // método 0 = sin comprimir
      v.setUint32(14, crc, true);
      v.setUint32(18, contenido.length, true);
      v.setUint32(22, contenido.length, true);
      v.setUint16(26, nombreBytes.length, true);
    });
    partes.push(local, nombreBytes, contenido);
    central.push({ nombreBytes, crc, largo: contenido.length, desplazamiento });
    desplazamiento += local.length + nombreBytes.length + contenido.length;
  });
  const inicioCentral = desplazamiento;
  central.forEach(({ nombreBytes, crc, largo, desplazamiento: d }) => {
    const c = encabezado(46, (v) => {
      v.setUint32(0, 0x02014b50, true); // firma "directorio central"
      v.setUint16(4, 20, true);
      v.setUint16(6, 20, true);
      v.setUint16(8, 0x0800, true);
      v.setUint16(10, 0, true);
      v.setUint32(16, crc, true);
      v.setUint32(20, largo, true);
      v.setUint32(24, largo, true);
      v.setUint16(28, nombreBytes.length, true);
      v.setUint32(42, d, true);
    });
    partes.push(c, nombreBytes);
    desplazamiento += c.length + nombreBytes.length;
  });
  partes.push(encabezado(22, (v) => {
    v.setUint32(0, 0x06054b50, true); // fin del directorio central
    v.setUint16(8, central.length, true);
    v.setUint16(10, central.length, true);
    v.setUint32(12, desplazamiento - inicioCentral, true);
    v.setUint32(16, inicioCentral, true);
  }));
  const total = partes.reduce((a, p) => a + p.length, 0);
  const salida = new Uint8Array(total);
  let pos = 0;
  partes.forEach((p) => { salida.set(p, pos); pos += p.length; });
  return salida;
}

/**
 * Libro de Excel con varias hojas.
 * @param {{ nombre: string, filas: Array, anchos?: number[] }[]} hojas
 * @returns {Uint8Array} el archivo .xlsx
 */
export function crearXlsx(hojas) {
  const nombres = nombresDeHoja(hojas.map((h) => h.nombre));
  const archivos = [
    { nombre: '[Content_Types].xml', contenido: codificar(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`) },
    { nombre: '_rels/.rels', contenido: codificar(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`) },
    { nombre: 'xl/workbook.xml', contenido: codificar(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${nombres.map((n, i) => `<sheet name="${escapar(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`) },
    { nombre: 'xl/_rels/workbook.xml.rels', contenido: codificar(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`) },
    { nombre: 'xl/styles.xml', contenido: codificar(ESTILOS) },
    ...hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, contenido: codificar(hojaXml(h)) })),
  ];
  return crearZip(archivos);
}
