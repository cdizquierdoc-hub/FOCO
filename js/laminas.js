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
  if (/refri|congela|nevera|frigor|rf\d/.test(cat)) return COCINAS[indice];
  if (/lavad|secad/.test(cat)) return LAVANDERIAS[indice];
  return descripcion;
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

function laminaBeneficios(D, idx, fi) {
  const amb = idx === 0 ? D.ambientes.b1 : D.ambientes.b2;
  const E = [panelChevron(amb)];
  E.push(productoEl(fi, 860, 1600, 1010));

  const enc = fit("REFRIGERADORA SMC " + D.modelo, 800, 680, 60, 40, 24, 1.2);
  E.push(txt({ texto: "REFRIGERADORA SMC " + D.modelo, x: 90, y: 110 - enc.tam * 0.95, w: 680, tam: enc.tam, peso: 800, color: AZUL, lh: 1.2 }));
  const subT = D.subtitulo || "Tecnología, frescura y comodidad en un solo lugar.";
  const sub = fit(subT, 600, 680, 40, 26, 18, 1.2);
  E.push(txt({ texto: subT, x: 90, y: 150 - sub.tam * 0.95, w: 680, tam: sub.tam, peso: 600, color: AZUL, lh: 1.2 }));
  E.push(txt({ texto: "BENEFICIOS:", x: 90, y: 262 - 28 * 0.95, w: 640, tam: 28, peso: 800, color: AZUL, alin: "center" }));

  const X = 90, CW = 640, CH = 270, ys = [360, 720];
  D.beneficios.slice(idx * 2, idx * 2 + 2).forEach((b, i) => {
    const y = ys[i], cx = X + CW / 2;
    E.push(elem("rect", { x: X, y, w: CW, h: CH, radio: 46, relleno: BLANCO, borde: { color: AZUL, ancho: 3 } }));
    E.push(elem("circulo", { x: cx - 62, y: y - 62, w: 124, h: 124, relleno: AZUL }));
    E.push(elem("icono", { x: cx - 44, y: y - 44, w: 88, h: 88, clave: claveIcono(b.titulo), color: BLANCO }));
    const tit = fit(b.titulo, 800, CW - 110, 100, 40, 26, 1.1);
    const yT = y + 62 + 30;
    E.push(txt({ texto: b.titulo, x: X + 55, y: yT, w: CW - 110, tam: tit.tam, peso: 800, color: AZUL, alin: "center", lh: tit.lh }));
    const hT = tit.lineas.length * tit.tam * tit.lh;
    const cu = fit(b.texto, 400, CW - 110, CH - (62 + 30 + hT + 40), 30, 20, 1.3);
    E.push(txt({ texto: b.texto, x: X + 55, y: yT + hT + 14, w: CW - 110, tam: cu.tam, peso: 400, color: AZUL, alin: "center", lh: cu.lh }));
  });

  // Burbujas con cifra clave (una por beneficio, si el spec sheet la trae)
  [0, 1].forEach((i) => {
    const dato = D.datos[idx * 2 + i];
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
  const E = [panelChevron(D.ambientes.b1)];
  E.push(productoEl(fi, 820, 1600, 1020));
  const tit = "CARACTERÍSTICAS PRINCIPALES";
  const t = fit(tit, 800, 700, 80, 64, 40, 1.1);
  E.push(txt({ texto: tit, x: 90, y: 90, w: 700, tam: t.tam, peso: 800, color: AZUL, lh: 1.1 }));
  const s = fit("SMC " + D.modelo, 600, 700, 40, 28, 20, 1.2);
  E.push(txt({ texto: "SMC " + D.modelo, x: 90, y: 90 + t.tam * 1.1 + 6, w: 700, tam: s.tam, peso: 600, color: AZUL, lh: 1.2 }));

  const cols = [90, 460], filas = [290, 650], CW = 340, CH = 280;
  D.beneficios.slice(0, 4).forEach((b, i) => {
    const x = cols[i % 2], y = filas[Math.floor(i / 2)], cx = x + CW / 2;
    E.push(elem("rect", { x, y, w: CW, h: CH, radio: 40, relleno: BLANCO, borde: { color: AZUL, ancho: 3 } }));
    E.push(elem("circulo", { x: cx - 56, y: y - 56, w: 112, h: 112, relleno: AZUL }));
    E.push(elem("icono", { x: cx - 36, y: y - 36, w: 72, h: 72, clave: claveIcono(b.titulo), color: BLANCO }));
    const tt = fit(b.titulo, 800, 280, 90, 34, 20, 1.1);
    const yT = y + 56 + 26;
    E.push(txt({ texto: b.titulo, x: x + 30, y: yT, w: 280, tam: tt.tam, peso: 800, color: AZUL, alin: "center", lh: tt.lh }));
    const hT = tt.lineas.length * tt.tam * tt.lh;
    const cu = fit(b.texto, 400, 280, CH - (56 + 26 + hT + 40), 26, 18, 1.3);
    E.push(txt({ texto: b.texto, x: x + 30, y: yT + hT + 12, w: 280, tam: cu.tam, peso: 400, color: AZUL, alin: "center", lh: cu.lh }));
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

  // Especificaciones: 3 columnas de 5 filas
  const columnasX = [70, 420, 770], filaY0 = 290, altoFila = 150;
  D.despacho.slice(0, 15).forEach((item, i) => {
    const x = columnasX[Math.floor(i / 5)], y = filaY0 + (i % 5) * altoFila;
    E.push(elem("icono", { x, y: y + 2, w: 62, h: 62, clave: ICONO_DESPACHO[item.icono] || claveIcono(item.etiqueta), color: AZUL }));
    const et = fit(item.etiqueta, 800, 240, 70, 28, 18, 1.12);
    E.push(txt({ texto: item.etiqueta, x: x + 84, y: y + 6, w: 240, tam: et.tam, peso: 800, color: AZUL, lh: et.lh }));
    const altoE = et.lineas.length * et.tam * et.lh;
    const va = fit(item.valor, 400, 240, 80, 24, 17, 1.2);
    E.push(txt({ texto: item.valor, x: x + 84, y: y + 6 + altoE + 4, w: 240, tam: va.tam, peso: 400, color: AZUL, lh: va.lh }));
  });

  E.push(productoEl(fi, 860, 1600, 1000));

  // Pastillas de garantía sobrepuestas a la refrigeradora
  [
    { y: 470, n: "1 AÑO", t: ["de garantía en todo el producto", "Repuestos + mano de obra."] },
    { y: 760, n: "10 AÑOS", t: ["de garantía total", "en el compresor Inverter."] }
  ].forEach((p) => {
    E.push(elem("rect", { x: 1160, y: p.y, w: 740, h: 160, radio: 80, sombra: true, relleno: { lineal: [0, 0, 1, 0], stops: [[0, MARINO], [1, "#3F5FB8"]] } }));
    let tamN = 80;
    fuente(MEDIR, 800, tamN);
    while (MEDIR.measureText(p.n).width > 740 - 80 - 24 - 300 && tamN > 50) { tamN -= 2; fuente(MEDIR, 800, tamN); }
    const anchoN = MEDIR.measureText(p.n).width;
    E.push(txt({ texto: p.n, x: 1200, y: p.y + 80 - tamN * 0.6, w: anchoN + 20, tam: tamN, peso: 800, lh: 1.1 }));
    const xT = 1200 + anchoN + 24, maxT = 1160 + 740 - 36 - xT;
    const det = fit(p.t.join("\n"), 400, maxT, 130, 30, 18, 1.15);
    const altoT = det.lineas.length * det.tam * det.lh;
    E.push(txt({ texto: p.t.join("\n"), x: xT, y: p.y + (160 - altoT) / 2 - 2, w: maxT, tam: det.tam, peso: 400, lh: det.lh }));
  });
  return { nombre: NOMBRES_LAMINA[4], fondo: BLANCO, elementos: E };
}

function laminaFija(indice, img) {
  return { nombre: NOMBRES_LAMINA[indice], fondo: BLANCO, elementos: [imagenEl(img, { fondo: true })] };
}

function construirLaminas(D) {
  const n = estado.productos.length;
  const f = (i) => i % n;
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
