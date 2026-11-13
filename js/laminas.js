/* ==========================================================================
   Constructores de las 7 láminas como listas de elementos editables
   ========================================================================== */

/* Ambiente fijo de cocina para refrigeradoras (la IA no siempre respeta la categoría) */
const COCINAS = [
  "cocina equipada con gabinetes, encimera de mármol, estufa y fregadero, sin muebles de sala",
  "cocina residencial con fregadero, estufa y gabinetes de cocina, no es un baño; interior de cocina moderna de noche, encimera de mármol oscuro, gabinetes de madera oscura y luz LED cálida bajo los gabinetes",
  "cocina residencial con fregadero, estufa y gabinetes de cocina, no es un baño; interior de cocina moderna de noche con encimera de mármol oscuro, grifo de bronce y estantes iluminados con plantas",
  "cocina equipada con isla de madera oscura, luz LED cálida y repisas con utensilios de cocina"
];
const LAVANDERIAS = [
  "interior de lavandería moderna, gabinetes claros, piso de cerámica y luz cálida",
  "interior de lavandería moderna con repisas de madera y luz natural cálida",
  "interior de lavandería moderna con encimera blanca y plantas"
];
function ambienteSeguro(ficha, descripcion, indice) {
  const cat = ((ficha.categoria || "") + " " + (ficha.modelo || "")).toLowerCase();
  if (/refri|congela|nevera|frigor|rf\d/.test(cat)) return COCINAS[indice] + ", vista frontal de la pared de la cocina, espacio libre y piso despejado frente al producto, sin isla ni mesa, iluminación luminosa";
  if (/lavad|secad/.test(cat)) return LAVANDERIAS[indice];
  return descripcion;
}

/* Encabezado: tipo del producto en mayúsculas + código SMC */
function encabezadoFicha(D) {
  return (D.tipo || "producto").toUpperCase() + " " + D.modelo;
}

function laminaPortada(D, fi) {
  const E = [imagenEl(D.ambientes.portada, { fondo: true })];
  const tamT = Math.min(
    ajustarLinea(MEDIR, D.modelo, 800, 1150, 150, 60),
    ajustarLinea(MEDIR, D.portada.titulo, 800, 1150, 150, 60)
  );
  const desc = fit(D.portada.texto, 400, 1150, 200, 44, 26, 1.3);
  const altoDesc = desc.lineas.length * desc.tam * desc.lh;
  const yDesc = H - 60 - altoDesc;
  const yTit2 = yDesc - 26;
  E.push(productoEl(fi, 860, 1480, 1010));
  E.push(elem("rect", { x: 0, y: 0, w: W, h: H, fondo: true, relleno: { lineal: [0, 1, 0, 0.3], stops: [[0, "rgba(10,8,6,.85)"], [1, "rgba(10,8,6,0)"]] } }));
  E.push(elem("rect", { x: -100, y: 70, w: 530, h: 200, radio: 100, relleno: AZUL }));
  const lw = 290, lh = lw * D.logo.height / D.logo.width;
  E.push(imagenEl(D.logo, { x: 50, y: 70 + (200 - lh) / 2, w: lw, h: lh }));
  E.push(txt({ texto: D.modelo, x: 110, y: yTit2 - 1.02 * tamT - 0.95 * tamT, w: 1150, tam: tamT, lh: 1, sombra: true }));
  E.push(txt({ texto: D.portada.titulo, x: 110, y: yTit2 - 0.95 * tamT, w: 1150, tam: tamT, lh: 1, sombra: true }));
  E.push(txt({ texto: D.portada.texto, x: 110, y: yDesc, w: 1150, tam: desc.tam, lh: 1.3, sombra: true, peso: 400 }));
  return { nombre: NOMBRES_LAMINA[0], fondo: BLANCO, elementos: E };
}

/* Corta un texto en oraciones completas sin pasar del máximo de palabras */
function capPalabras(texto, max) {
  const oraciones = String(texto || "").match(/[^.!?]+[.!?]*/g) || [String(texto || "")];
  let salida = "", n = 0;
  for (const o of oraciones) {
    const t = o.trim(); if (!t) continue;
    const k = t.split(/\s+/).length;
    if (n + k > max && salida) break;
    salida += (salida ? " " : "") + t; n += k;
  }
  return salida;
}

/* Los datos de cada lámina: el espacio del refrigerador va con el del congelador, y la eficiencia
   (Clase A) solo aparece en la lámina del motor inverter / ahorro de energía */
const ENERGIA_RE = /inverter|energ|compresor|motor|consumo|eficien/i;
function datosDeLamina(D, idx) {
  const esEnergia = (i) => D.beneficios.slice(i * 2, i * 2 + 2).some((b) => ENERGIA_RE.test(b.titulo + " " + b.texto));
  const eficiencia = D.datos.filter((d) => /eficien|clase/i.test(d.etiqueta || ""));
  const pareja = D.datos.filter((d) => /refrigerad|congelad/i.test(d.etiqueta || "") && !/eficien|clase/i.test(d.etiqueta || ""));
  const otros = D.datos.filter((d) => !/eficien|clase|refrigerad|congelad/i.test(d.etiqueta || ""));
  const energiaIdx = [0, 1].find(esEnergia);
  if (energiaIdx === undefined) {
    const lista = [...pareja, ...otros];
    return [lista[idx * 2], lista[idx * 2 + 1]];
  }
  // La eficiencia va en la lámina del motor inverter; el par del refrigerador y congelador va en la otra
  if (idx === energiaIdx) return [eficiencia[0], otros[0]];
  return [...pareja, ...otros.slice(1)].slice(0, 2);
}

function laminaBeneficios(D, idx, fi) {
  const amb = idx === 0 ? D.ambientes.b1 : D.ambientes.b2;
  const E = [panelChevron(amb)];
  E.push(productoEl(fi, 860, 1540, 1010));

  const enc = encabezadoFicha(D);
  const e = fit(enc, 800, 680, 60, 40, 24, 1.2);
  E.push(txt({ texto: enc, x: 90, y: 110 - e.tam * 0.95, w: 680, tam: e.tam, peso: 800, color: AZUL, lh: 1.2 }));
  // Subtítulo propio de estas dos características, que llena el espacio superior
  const subT = (D.subtitulos && D.subtitulos[idx]) || D.subtitulo || "Tecnología, frescura y comodidad en un solo lugar.";
  const sub = fit(subT, 600, 680, 70, 30, 20, 1.2);
  E.push(txt({ texto: subT, x: 90, y: 140, w: 680, tam: sub.tam, peso: 600, color: AZUL, lh: 1.2 }));
  E.push(txt({ texto: "BENEFICIOS:", x: 90, y: 262 - 28 * 0.95, w: 640, tam: 28, peso: 800, color: AZUL, alin: "center" }));

  // Detalle técnico de cada característica (aquí sí cabe más texto)
  const X = 90, CW = 640, CH = 300, ys = [350, 720];
  D.beneficios.slice(idx * 2, idx * 2 + 2).forEach((b, i) => {
    const y = ys[i], cx = X + CW / 2;
    E.push(elem("rect", { x: X, y, w: CW, h: CH, radio: 46, relleno: BLANCO, borde: { color: AZUL, ancho: 3 } }));
    E.push(elem("circulo", { x: cx - 62, y: y - 62, w: 124, h: 124, relleno: AZUL }));
    E.push(elem("icono", { x: cx - 44, y: y - 44, w: 88, h: 88, clave: D.iconos[idx * 2 + i], color: BLANCO }));
    // Título y texto centrados en el espacio bajo el icono, con la misma separación arriba y abajo
    const topA = y + 62 + 16, AH = CH - 62 - 32;
    const tit = fit(b.titulo, 800, CW - 60, 90, 40, 26, 1.1);
    const hT = tit.lineas.length * tit.tam * tit.lh;
    const tx = capPalabras(b.texto, 30);
    const cu = fit(tx, 400, CW - 60, AH - hT - 14, 26, 22, 1.3);
    const hC = cu.lineas.length * cu.tam * cu.lh;
    const yT = topA + (AH - hT - 14 - hC) / 2;
    E.push(txt({ texto: b.titulo, x: X + 30, y: yT, w: CW - 60, tam: tit.tam, peso: 800, color: AZUL, alin: "center", lh: tit.lh }));
    E.push(txt({ texto: tx, x: X + 30, y: yT + hT + 14, w: CW - 60, tam: cu.tam, peso: 400, color: AZUL, alin: "center", lh: cu.lh }));
  });

  // Cifras de características adicionales (no son las 4 principales), dos por lámina
  const datosLamina = datosDeLamina(D, idx);
  [0, 1].forEach((i) => {
    const dato = datosLamina[i];
    if (!dato || !dato.valor) return;
    const bx = 1760, by = i === 0 ? 250 : 800;
    E.push(elem("circulo", { x: bx - 125, y: by - 125, w: 250, h: 250, relleno: AZUL, sombra: true }));
    E.push(elem("circulo", { x: bx - 103, y: by - 103, w: 206, h: 206, relleno: BLANCO }));
    const tv = ajustarLinea(MEDIR, dato.valor, 800, 150, 56, 30);
    E.push(txt({ texto: dato.valor, x: bx - 75, y: by + 4 - tv * 0.95, w: 150, tam: tv, peso: 800, color: AZUL, alin: "center", lh: 1.1 }));
    const te = fit(dato.etiqueta || "", 400, 150, 50, 22, 16, 1.1);
    E.push(txt({ texto: dato.etiqueta || "", x: bx - 75, y: (by + 26 + tv * 0.35) - te.tam * 0.95, w: 150, tam: te.tam, peso: 400, color: AZUL, alin: "center", lh: te.lh }));
  });
  return { nombre: NOMBRES_LAMINA[idx + 1], fondo: BLANCO, elementos: E };
}

function laminaCuatro(D, fi) {
  const E = [panelChevron(D.ambientes.c4)];
  E.push(productoEl(fi, 820, 1600, 1020));
  const tit = "CARACTERÍSTICAS PRINCIPALES";
  const t = fit(tit, 800, 700, 80, 64, 40, 1.1);
  E.push(txt({ texto: tit, x: 90, y: 90, w: 700, tam: t.tam, peso: 800, color: AZUL, lh: 1.1 }));
  const s = fit(D.modelo, 600, 700, 40, 28, 20, 1.2);
  E.push(txt({ texto: D.modelo, x: 90, y: 90 + t.tam * 1.1 + 6, w: 700, tam: s.tam, peso: 600, color: AZUL, lh: 1.2 }));

  const cols = [90, 460], filas = [290, 650], CW = 340, CH = 280;
  D.beneficios.slice(0, 4).forEach((b, i) => {
    const x = cols[i % 2], y = filas[Math.floor(i / 2)], cx = x + CW / 2;
    E.push(elem("rect", { x, y, w: CW, h: CH, radio: 40, relleno: BLANCO, borde: { color: AZUL, ancho: 3 } }));
    E.push(elem("circulo", { x: cx - 56, y: y - 56, w: 112, h: 112, relleno: AZUL }));
    E.push(elem("icono", { x: cx - 36, y: y - 36, w: 72, h: 72, clave: D.iconos[i], color: BLANCO }));
    // Título y explicación centrados en la tarjeta
    const topA = y + 56 + 12, AH = CH - 56 - 24;
    const tt = fit(b.titulo, 800, 280, 90, 34, 20, 1.1);
    const hT = tt.lineas.length * tt.tam * tt.lh;
    const tx = b.corto || b.texto;
    const cu = fit(tx, 400, 280, AH - hT - 12, 26, 18, 1.3);
    const hC = cu.lineas.length * cu.tam * cu.lh;
    const yT = topA + (AH - hT - 12 - hC) / 2;
    E.push(txt({ texto: b.titulo, x: x + 30, y: yT, w: 280, tam: tt.tam, peso: 800, color: AZUL, alin: "center", lh: tt.lh }));
    E.push(txt({ texto: tx, x: x + 30, y: yT + hT + 12, w: 280, tam: cu.tam, peso: 400, color: AZUL, alin: "center", lh: cu.lh }));
  });
  return { nombre: NOMBRES_LAMINA[3], fondo: BLANCO, elementos: E };
}

function laminaDespacho(D, fi) {
  const E = [];
  E.push(elem("poli", { x: 1130, y: 0, w: 790, h: H, pts: [[0.1519, 0], [1, 0], [1, 1], [0.405, 1], [0, 0.5]], relleno: AZUL }));

  // Título: "Ficha para" regular + "PEDIDOS Y DESPACHOS" en negrita
  const p1 = "Ficha para ", p2 = "PEDIDOS Y DESPACHOS";
  let tam = 84;
  for (; tam > 40; tam -= 2) {
    fuente(MEDIR, 400, tam); const a = MEDIR.measureText(p1).width;
    fuente(MEDIR, 800, tam); const b = MEDIR.measureText(p2).width;
    if (a + b <= 1080) break;
  }
  fuente(MEDIR, 400, tam); const anchoA = MEDIR.measureText(p1).width;
  fuente(MEDIR, 800, tam); const anchoB = MEDIR.measureText(p2).width;
  E.push(txt({ texto: p1, x: 90, y: 170 - tam * 0.95, w: anchoA + 10, tam, peso: 400, color: AZUL }));
  E.push(txt({ texto: p2, x: 90 + anchoA, y: 170 - tam * 0.95, w: anchoB + 10, tam, peso: 800, color: AZUL }));

  // Especificaciones en 3 columnas, con el mismo tamaño de letra y centradas verticalmente
  const items = D.despacho.slice(0, 15);
  const porCol = Math.max(1, Math.ceil(items.length / 3));
  const columnasX = [60, 395, 730];
  const yIni = 290, yFin = 1010, alto = (yFin - yIni) / porCol;
  // Tamaño fijo para que todas las fichas se vean igual de ordenadas, sin importar cuántos datos haya
  const escala = 1;
  const ic = Math.round(62 * escala), anchoT = 320 - ic - 20;
  items.forEach((item, i) => {
    const x = columnasX[Math.floor(i / porCol)], yFila = yIni + (i % porCol) * alto;
    const et = fit(item.etiqueta, 800, anchoT, alto * 0.45, Math.round(28 * escala), 18, 1.12);
    const va = fit(item.valor, 400, anchoT, alto * 0.45, Math.round(24 * escala), 16, 1.2);
    const altoE = et.lineas.length * et.tam * et.lh, altoV = va.lineas.length * va.tam * va.lh;
    const bloque = Math.max(ic, altoE + 6 + altoV);
    const y0 = yFila + (alto - bloque) / 2;
    E.push(elem("icono", { x, y: y0 + (bloque - ic) / 2, w: ic, h: ic, clave: ICONO_DESPACHO[item.icono] || claveIcono(item.etiqueta), color: AZUL }));
    const yT = y0 + (bloque - (altoE + 6 + altoV)) / 2;
    E.push(txt({ texto: item.etiqueta, x: x + ic + 20, y: yT, w: anchoT, tam: et.tam, peso: 800, color: AZUL, lh: et.lh }));
    E.push(txt({ texto: item.valor, x: x + ic + 20, y: yT + altoE + 6, w: anchoT, tam: va.tam, peso: 400, color: AZUL, lh: va.lh }));
  });

  E.push(productoEl(fi, 760, 1630, 1000));

  // Píldoras de garantía, más pequeñas para no tapar el producto. La de 10 años solo si es inverter
  const pastillas = [{ y: 420, n: "1 AÑO", t: ["de garantía en todo el producto", "Repuestos + mano de obra."] }];
  if (D.inverter) pastillas.push({ y: 680, n: "10 AÑOS", t: ["de garantía total", "en el compresor."] });
  pastillas.forEach((p) => {
    const px = 1130, pw = 480, ph = 124;
    E.push(elem("rect", { x: px, y: p.y, w: pw, h: ph, radio: ph / 2, sombra: true, relleno: { lineal: [0, 0, 1, 0], stops: [[0, MARINO], [1, "#3F5FB8"]] } }));
    let tamN = 56;
    fuente(MEDIR, 800, tamN);
    while (MEDIR.measureText(p.n).width > 190 && tamN > 36) { tamN -= 2; fuente(MEDIR, 800, tamN); }
    const anchoN = MEDIR.measureText(p.n).width;
    E.push(txt({ texto: p.n, x: px + 26, y: p.y + ph / 2 - tamN * 0.6, w: anchoN + 20, tam: tamN, peso: 800, color: BLANCO, lh: 1.1 }));
    const xT = px + 26 + anchoN + 20, maxT = px + pw - 26 - xT;
    const det = fit(p.t.join("\n"), 400, maxT, ph - 20, 22, 16, 1.15);
    const altoT = det.lineas.length * det.tam * det.lh;
    E.push(txt({ texto: p.t.join("\n"), x: xT, y: p.y + (ph - altoT) / 2, w: maxT, tam: det.tam, peso: 400, color: BLANCO, lh: det.lh }));
  });
  return { nombre: NOMBRES_LAMINA[4], fondo: BLANCO, elementos: E };
}

function laminaFija(indice, img) {
  return { nombre: NOMBRES_LAMINA[indice], fondo: BLANCO, elementos: [imagenEl(img, { fondo: true })] };
}

function construirLaminas(D) {
  const n = estado.productos.length;
  const f = (i) => i % n;
  // Un icono distinto para cada una de las 4 características principales
  D.iconos = asignarIconos(D.beneficios.map((b) => b.titulo));
  return [
    laminaPortada(D, f(0)),
    laminaCuatro(D, f(0)),
    laminaBeneficios(D, 0, f(0)),
    laminaBeneficios(D, 1, f(1)),
    laminaDespacho(D, f(0)),
    laminaFija(5, estado.fijas.respaldo),
    laminaFija(6, estado.fijas.cierre)
  ];
}
