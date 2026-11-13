/* ==========================================================================
   Correo de bienvenida (1536×1024, horizontal).
   La gráfica se arma como elementos editables del mismo editor de fichas:
   izquierda = fondo azul con ambiente integrado y packshot de los productos;
   derecha = cada producto con su tipo, código, foto y píldoras de características.
   ========================================================================== */

const CORREO_W = 1536, CORREO_H = 1024;
const CORREO_LW = 700;                    // ancho del panel azul de la izquierda
const CORREO_RX = 770, CORREO_RW = 716;   // zona derecha
const CORREO_TEXTO = "#1c2b3a";
const MAX_PRODUCTOS_CORREO = 4;

const CADENAS_CORREO = {
  cresa: { etiqueta: "CRESA", logos: ["crecos", "orve", "japon", "pagamenos"] },
  crecoscorp: { etiqueta: "CRECOSCORP", logos: ["dismayor"] },
  ambas: { etiqueta: "CRESA + CRECOSCORP", logos: ["crecos", "orve", "japon", "pagamenos", "dismayor"] }
};
const ARCHIVOS_LOGOS = {
  crecos: "assets/correo/logo_crecos.png",
  orve: "assets/correo/logo_orve.png",
  japon: "assets/correo/logo_japon.png",
  pagamenos: "assets/correo/logo_pagamenos.png",
  dismayor: "assets/correo/logo_dismayor.png"
};
const CATEGORIAS_CORREO = ["Refrigeradora", "Congelador", "Minibar", "Lavadora", "Cocina", "Aire acondicionado", "Minidomésticos", "Otro"];
function aperturaCorreo() { return "En " + nombreMarca() + " seguimos ampliando nuestro portafolio con productos pensados para hacer tu día a día más práctico."; }
function finalCorreo() { return "MÁS ESPACIO, MÁS COMODIDAD, MÁS " + nombreMarca().toUpperCase() + "."; }
/* Frase final según la categoría */
function fraseFinalCorreo(categoria) {
  const c = categoria || "";
  if (/lavad/i.test(c)) return "MÁS LIMPIEZA, MÁS COMODIDAD, MÁS " + nombreMarca().toUpperCase() + ".";
  if (/aire/i.test(c)) return "MÁS FRESCURA, MÁS COMODIDAD, MÁS " + nombreMarca().toUpperCase() + ".";
  if (/minidom|cocina|otro/i.test(c)) return "MÁS TECNOLOGÍA, MÁS PRÁCTICO, MÁS " + nombreMarca().toUpperCase() + ".";
  return finalCorreo();
}
const CIERRE_COMODIDAD = "para brindarte mayor comodidad en casa.";
const CIERRE_COMIDAS = "para hacer tus comidas más fáciles y prácticas.";

const logosCorreo = {};
let correoSlide = null;          // lámina del correo (se edita en el editor)
let modoEditorActivo = "fichas"; // qué lámina tiene el editor: fichas o correo
const copiasEditor = {};

let fotosCorreo = [];   // [{nombre, canvas, miniatura, producto}] (producto = número 1..n)
let specsCorreo = [];   // archivos de spec sheet; el spec k corresponde al producto k+1
let datosCorreo = [];   // datos por producto: {modelo, tipo, categoria, feats}
const cacheDatosCorreo = new Map();

/* ---------- Texto y lógica ---------- */
function ambienteCorreo(categoria) {
  const c = (categoria || "").toLowerCase();
  if (/lavad|secad/.test(c)) return LAVANDERIAS[0];
  if (/aire/.test(c)) return "habitación moderna con luz natural cálida, espacio despejado, sin personas, sin muebles de sala ni baño";
  return COCINAS[0] + ", vista frontal de la pared de la cocina, espacio libre y piso despejado frente al producto, sin isla ni mesa, iluminación luminosa";
}

async function ambienteCorreoImagen(categoria) {
  try {
    const { imagen_base64, media_type } = await llamarWorker("/api/imagen", { ambiente: ambienteCorreo(categoria) });
    return await cargarImagen(`data:${media_type};base64,${imagen_base64}`);
  } catch (e) {
    return escenaRespaldo("portada");
  }
}

async function cargarLogosCorreo(lista) {
  for (const clave of lista) {
    if (!logosCorreo[clave]) logosCorreo[clave] = await cargarImagen(ARCHIVOS_LOGOS[clave]);
  }
  return lista.map((clave) => logosCorreo[clave]);
}

/* Cierre de la frase según la categoría */
function cierreCorreo(categoria) {
  return /minidom|cocina|otro/i.test(categoria || "") ? CIERRE_COMIDAS : CIERRE_COMODIDAD;
}

/* Texto de introducción: apertura fija + presentación de los productos */
function textoIntroCorreo(productos) {
  const n = productos.length;
  const conModelo = productos.filter((p) => p.modelo);
  if (!conModelo.length) return aperturaCorreo();
  const nombre = (p) => (p.tipo || p.categoria || "producto").toLowerCase();
  if (n === 1) {
    const p = productos[0];
    const ft = p.feats.filter(Boolean).map((x) => x.toLowerCase());
    if (ft.length < 3) return aperturaCorreo();
    return aperturaCorreo() + "\nTe presentamos nuestra " + nombre(p) + " " + p.modelo + ", que combina " +
      ft[0] + ", " + ft[1] + " y " + ft[2] + ", " + cierreCorreo(p.categoria);
  }
  const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const items = conModelo.map((p, i) => (i + 1) + ". " + mayus(nombre(p)) + " " + p.modelo + ".");
  return aperturaCorreo() + "\nTe presentamos " + n + " nuevos productos:\n" + items.join("\n") + "\n" + mayus(cierreCorreo(productos[0].categoria));
}

/* Icono para cada característica del correo, sin repetir */
function asignarIconosCorreo(productos) {
  const ic = asignarIconos(productos.flatMap((p) => p.feats));
  let k = 0;
  productos.forEach((p) => { p.iconos = p.feats.map(() => ic[k++]); });
}

function lineasCorreo(texto, peso, tam, maxW) {
  fuente(MEDIR, peso, tam);
  return envolver(MEDIR, texto, maxW);
}

/* Mayor tamaño (entre max y min) en que el texto cabe en una línea */
function tamanoQueQuepa(ctx, texto, peso, maxW, max, min) {
  for (let t = max; t >= min; t--) {
    fuente(ctx, peso, t);
    if (ctx.measureText(texto).width <= maxW) return t;
  }
  return min;
}
function tamUnaLinea(texto, peso, maxW, max, min) {
  return tamanoQueQuepa(MEDIR, texto, peso, maxW, max, min);
}

/* ---------- Construcción de la lámina como elementos editables ---------- */
function pastillaCorreo(els, x, y, w, h, clave, texto, tamMax) {
  els.push(elem("rect", { x, y, w, h, radio: h / 2, relleno: "#ffffff", sombra: true }));
  const d = Math.min(h - 16, 64);
  els.push(elem("circulo", { x: x + 10, y: y + (h - d) / 2, w: d, h: d, relleno: AZUL }));
  const is = d * 0.62;
  els.push(elem("icono", { clave, color: BLANCO, x: x + 10 + (d - is) / 2, y: y + (h - is) / 2, w: is, h: is }));
  const maxW = w - d - 36;
  let tam = tamMax, lineas = [];
  for (; tam >= 14; tam -= 1) {
    lineas = lineasCorreo(texto, 700, tam, maxW);
    if (lineas.length <= 2 && lineas.length * tam * 1.2 <= h - 10) break;
  }
  const alto = lineas.length * tam * 1.2;
  els.push(txt({ x: x + d + 22, y: y + (h - alto) / 2, w: maxW, texto, tam, peso: 700, color: MARINO, alin: "left", lh: 1.2 }));
}

function construirCorreo(cfg) {
  const n = cfg.productos.length;
  const els = [];
  asignarIconosCorreo(cfg.productos);
  const fotos = cfg.productos.map((p) => p.foto);

  /* 1. Panel azul de la izquierda con el ambiente integrado */
  els.push(elem("rect", { x: 0, y: 0, w: CORREO_LW, h: CORREO_H, relleno: { lineal: [0, 0, 1, 1], stops: [[0, AZUL], [1, MARINO]] }, fondo: true }));
  if (cfg.ambiente) els.push(imagenEl(cfg.ambiente, { x: 0, y: 0, w: CORREO_LW, h: CORREO_H, fondo: true }));
  els.push(elem("rect", { x: 0, y: 0, w: CORREO_LW, h: CORREO_H, relleno: { lineal: [0, 0, 1, 1], stops: [[0, "rgba(71,169,228,0.55)"], [1, "rgba(38,58,118,0.72)"]] }, fondo: true }));

  if (cfg.logoSMC) {
    const lw = 200, lh = lw * cfg.logoSMC.height / cfg.logoSMC.width;
    els.push(imagenEl(cfg.logoSMC, { x: 70, y: 46, w: lw, h: lh }));
  }
  const titulo = n === 1
    ? ["CONOCE NUESTRA NUEVA " + (cfg.productos[0].tipo || cfg.productos[0].categoria || "").toUpperCase(), (cfg.productos[0].modelo || "").toUpperCase()]
    : ["DESCUBRE LO NUEVO DE " + nombreMarca().toUpperCase(), n + " nuevos productos para tu hogar"];
  const tamT = Math.min(...titulo.map((l) => tamUnaLinea(l, 800, 610, 50, 26)));
  titulo.forEach((l, i) => els.push(txt({ x: 70, y: 150 + i * tamT * 1.25, w: 610, texto: l, tam: tamT, peso: 800, color: BLANCO, sombra: true, lh: 1.2 })));

  /* 2. Packshot de los productos sobre el azul: 1 centrado, 2 en fila, 3 en triángulo, 4 en cuadrícula */
  const DISPOSICION = {
    1: [{ cx: 350, base: 620, maxH: 380, maxW: 340 }],
    2: [{ cx: 180, base: 610, maxH: 330, maxW: 260 }, { cx: 520, base: 610, maxH: 330, maxW: 260 }],
    3: [{ cx: 350, base: 440, maxH: 200, maxW: 230 }, { cx: 165, base: 630, maxH: 200, maxW: 230 }, { cx: 535, base: 630, maxH: 200, maxW: 230 }],
    4: [{ cx: 180, base: 430, maxH: 175, maxW: 230 }, { cx: 520, base: 430, maxH: 175, maxW: 230 }, { cx: 180, base: 620, maxH: 175, maxW: 230 }, { cx: 520, base: 620, maxH: 175, maxW: 230 }]
  };
  cfg.productos.forEach((p, i) => {
    const pos = DISPOSICION[n][i];
    const ratio = p.foto.width / p.foto.height;
    const h = Math.min(pos.maxH, pos.maxW / ratio), w = h * ratio;
    els.push(elem("producto", { foto: i, x: pos.cx - w / 2, y: pos.base - h, w, h, sombra: true }));
  });

  /* 3. Introducción (apertura, presentación y lista de productos) */
  let yi = 640;
  cfg.intro.split(/\n+/).map((p) => p.trim()).filter(Boolean).forEach((parrafo) => {
    const lista = /^\d+\./.test(parrafo);
    const lineas = lineasCorreo(parrafo, 500, 21, 600);
    els.push(txt({ x: 70, y: yi, w: 600, texto: parrafo, tam: 21, peso: 500, color: BLANCO, alin: "left", lh: 1.55 }));
    yi += lineas.length * 21 * 1.55 + (lista ? 4 : 14);
  });

  /* 4. Zona derecha: productos con su nombre, código, foto y píldoras */
  if (n === 1) {
    const p = cfg.productos[0];
    const ratio = p.foto.width / p.foto.height;
    const base = 860, h = Math.min(600, 560), w = Math.min(h * ratio, 520), hReal = w / ratio;
    const cx = CORREO_RX + CORREO_RW / 2;
    els.push(elem("producto", { foto: 0, x: cx - w / 2, y: base - hReal, w, h: hReal, sombra: true }));
    const pw = 262, ph = 104;
    const topY = base - hReal + 40, botY = base - hReal * 0.42;
    const izq = Math.max(CORREO_RX, cx - w / 2 + 34 - pw), der = Math.min(CORREO_RX + CORREO_RW - pw, cx + w / 2 - 34);
    const pos = [[izq, topY], [der, topY], [izq, botY], [der, botY]];
    p.feats.forEach((f, k) => pastillaCorreo(els, pos[k][0], pos[k][1], pw, ph, p.iconos[k], f, 21));
    els.push(txt({ x: CORREO_RX, y: 150, w: CORREO_RW, texto: (p.tipo || p.categoria || "").toUpperCase(), tam: 22, peso: 700, color: AZUL, alin: "left", lh: 1.2 }));
    els.push(txt({ x: CORREO_RX, y: 180, w: CORREO_RW, texto: (p.modelo || "").toUpperCase(), tam: 40, peso: 800, color: MARINO, alin: "left", lh: 1.2 }));
  } else {
    const bloque = 760 / n;
    const headerH = n === 2 ? 96 : n === 3 ? 66 : 54;
    const pillH = n === 2 ? 104 : n === 3 ? 74 : 56, gapP = n === 2 ? 12 : n === 3 ? 10 : 8;
    const tamNombre = n === 2 ? 30 : n === 3 ? 24 : 20, tamCodigo = n === 2 ? 22 : n === 3 ? 18 : 16;
    const maxFoto = n === 2 ? 340 : n === 3 ? 210 : 150;
    cfg.productos.forEach((p, i) => {
      const y0 = 110 + i * bloque;
      const ratio = p.foto.width / p.foto.height;
      let hF = Math.min(bloque - 30, maxFoto), wF = hF * ratio;
      if (wF > 230) { wF = 230; hF = wF / ratio; }
      const xF = CORREO_RX + 10, yF = y0 + (bloque - hF) / 2;
      els.push(elem("producto", { foto: i, x: xF, y: yF, w: wF, h: hF, sombra: true }));
      const xT = xF + wF + 14, anchoT = CORREO_RX + CORREO_RW - xT;
      const xP = xF + wF - 34, anchoP = CORREO_RX + CORREO_RW - xP; // las píldoras sí cubren el borde de la foto
      const nombre = (p.tipo || p.categoria || "producto");
      const nombreTxt = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      const tamN = tamUnaLinea(nombreTxt, 800, anchoT, tamNombre, 16);
      els.push(txt({ x: xT, y: y0 + 2, w: anchoT, texto: nombreTxt, tam: tamN, peso: 800, color: MARINO, alin: "left", lh: 1.2 }));
      els.push(txt({ x: xT, y: y0 + 2 + tamN * 1.25, w: anchoT, texto: (p.modelo || "").toUpperCase(), tam: tamCodigo, peso: 700, color: AZUL, alin: "left", lh: 1.2 }));
      const colW = (anchoP - 12) / 2;
      p.feats.forEach((f, k) => {
        const x = xP + (k % 2) * (colW + 12), y = y0 + headerH + Math.floor(k / 2) * (pillH + gapP);
        pastillaCorreo(els, x, y, colW, pillH, p.iconos[k], f, n === 2 ? 20 : n === 3 ? 18 : 17);
      });
    });
  }

  /* 5. Frase final y logos de las cadenas (píldora compacta) */
  els.push(txt({ x: CORREO_RX, y: 898, w: CORREO_RW, texto: cfg.final, tam: 26, peso: 800, color: AZUL, alin: "center", lh: 1.2 }));
  const etiqueta = "Disponible en cadenas afiliadas:";
  fuente(MEDIR, 800, 17);
  const anchoEtiqueta = MEDIR.measureText(etiqueta).width;
  const logos = cfg.logos.map((img) => ({ img, w: Math.min(150, 30 * img.width / img.height) }));
  const anchoLogos = logos.reduce((s, m) => s + m.w, 0) + 22 * (logos.length - 1);
  const pillW = 48 + anchoEtiqueta + 22 + anchoLogos, pillX = (CORREO_W - pillW) / 2, pillY = 948, pillH = 52;
  els.push(elem("rect", { x: pillX, y: pillY, w: pillW, h: pillH, radio: pillH / 2, relleno: "#ffffff", borde: { ancho: 3, color: AZUL } }));
  els.push(txt({ x: pillX + 24, y: pillY + (pillH - 17 * 1.2) / 2, w: anchoEtiqueta + 8, texto: etiqueta, tam: 17, peso: 800, color: MARINO, alin: "left", lh: 1.2 }));
  let cursor = pillX + 24 + anchoEtiqueta + 22;
  logos.forEach((m) => {
    els.push(imagenEl(m.img, { x: cursor, y: pillY + 11, w: m.w, h: 30 }));
    cursor += m.w + 22;
  });

  return {
    nombre: "Correo de bienvenida",
    w: CORREO_W, h: CORREO_H,
    fondo: "#ffffff",
    fotos,
    minis: cfg.productos.map((p) => miniaturaCorreo(p.foto)),
    elementos: els
  };
}

/* ---------- Interfaz ---------- */
function nProductosCorreo() { return +$("cNumero").value; }
function errorCorreo(t) { $("cError").textContent = t || ""; }
function logCorreo(t) { $("cLog").textContent = t; }

function opcionesCategoria(seleccion) {
  return CATEGORIAS_CORREO.map((c) => `<option${c === seleccion ? " selected" : ""}>${c}</option>`).join("");
}

function bloqueProducto(i, datos) {
  const d = datos || {};
  const feats = d.feats || [];
  const div = document.createElement("div");
  div.className = "prod-bloque";
  div.dataset.indice = i;
  div.innerHTML = `
    <div class="prod-h"><div class="num">${i + 1}</div><strong>Producto ${i + 1}</strong></div>
    <div class="grid2">
      <label class="campo">Nombre del producto <input type="text" data-campo="tipo" placeholder="Ej. sanduchera 2 panes" value="${(d.tipo || "").replace(/"/g, "&quot;")}"></label>
      <label class="campo">Código del modelo <input type="text" data-campo="modelo" placeholder="Ej. SMCEST750N" value="${(d.modelo || "").replace(/"/g, "&quot;")}"></label>
    </div>
    <div class="grid2">
      <label class="campo">Categoría <select data-campo="categoria">${opcionesCategoria(d.categoria || "Refrigeradora")}</select></label>
      <label class="campo">Foto que se usa en el correo <select data-campo="foto"></select></label>
    </div>
    <div class="feat"><div class="num">1</div><input type="text" data-campo="f0" placeholder="Característica 1" value="${feats[0] || ""}"></div>
    <div class="feat"><div class="num">2</div><input type="text" data-campo="f1" placeholder="Característica 2" value="${feats[1] || ""}"></div>
    <div class="feat"><div class="num">3</div><input type="text" data-campo="f2" placeholder="Característica 3" value="${feats[2] || ""}"></div>
    <div class="feat"><div class="num">4</div><input type="text" data-campo="f3" placeholder="Característica 4" value="${feats[3] || ""}"></div>`;
  return div;
}

/* Llena el menú de fotos del producto con las fotos asignadas a él */
function llenarSelectFotos(div) {
  const k = +div.dataset.indice;
  div._fotos = fotosCorreo.filter((f) => f.producto === k + 1);
  const sel = div.querySelector('[data-campo="foto"]');
  const previo = sel.value;
  sel.innerHTML = div._fotos.length
    ? div._fotos.map((f, j) => `<option value="${j}">${f.nombre}</option>`).join("")
    : `<option value="">Sin fotos: asígnale una en la lista de fotos</option>`;
  if (previo !== "" && +previo < div._fotos.length) sel.value = previo;
}

function leerBloque(div) {
  const v = (c) => div.querySelector(`[data-campo="${c}"]`).value.trim();
  const idx = +div.querySelector('[data-campo="foto"]').value;
  const foto = (div._fotos || [])[idx];
  return {
    foto: foto ? foto.canvas : null,
    tipo: v("tipo"),
    modelo: v("modelo"),
    categoria: div.querySelector('[data-campo="categoria"]').value,
    feats: [v("f0"), v("f1"), v("f2"), v("f3")]
  };
}

/* Texto de un spec sheet para la IA gratuita (solo Excel y CSV) */
async function textoSpecCorreo(archivo) {
  if (/\.(xlsx|xls)$/i.test(archivo.name)) return await excelATexto(archivo);
  throw new Error("El spec sheet solo puede ser Excel (" + archivo.name + ").");
}

function miniaturaCorreo(canvas) {
  const k = 96 / canvas.height;
  const m = document.createElement("canvas");
  m.width = Math.round(canvas.width * k); m.height = 96;
  m.getContext("2d").drawImage(canvas, 0, 0, m.width, m.height);
  return m.toDataURL("image/png");
}

/* Lista de fotos subidas, con el producto al que pertenece cada una */
function renderFotosCorreo() {
  const n = nProductosCorreo();
  fotosCorreo.forEach((f) => { if (f.producto > n) f.producto = n; });
  const cont = $("cFotosLista");
  cont.innerHTML = "";
  fotosCorreo.forEach((f, j) => {
    const item = document.createElement("div");
    item.className = "foto-item";
    const opciones = Array.from({ length: n }, (_, k) => `<option value="${k + 1}"${f.producto === k + 1 ? " selected" : ""}>Producto ${k + 1}</option>`).join("");
    item.innerHTML = `<img src="${f.miniatura}" alt=""><span>${f.nombre}</span><select data-foto="${j}">${opciones}</select>`;
    cont.appendChild(item);
  });
  cont.querySelectorAll("select[data-foto]").forEach((sel) => {
    sel.addEventListener("change", () => {
      fotosCorreo[+sel.dataset.foto].producto = +sel.value;
      actualizarFotosBloques();
    });
  });
}

function actualizarFotosBloques() {
  $("cProductos").querySelectorAll(".prod-bloque").forEach(llenarSelectFotos);
}

function actualizarIntro() {
  const prods = [...$("cProductos").querySelectorAll(".prod-bloque")].map(leerBloque);
  if (!prods.length) return;
  $("cIntro").value = textoIntroCorreo(prods);
  $("cFinal").value = fraseFinalCorreo(prods[0].categoria);
}

/* Bloques de producto según el número elegido y los datos de cada spec sheet */
function renderBloquesCorreo() {
  const n = nProductosCorreo();
  const cont = $("cProductos");
  cont.innerHTML = "";
  for (let k = 0; k < n; k++) {
    const b = bloqueProducto(k, datosCorreo[k] || {});
    cont.appendChild(b);
    llenarSelectFotos(b);
  }
  actualizarIntro();
}

async function alCambiarFotos() {
  errorCorreo("");
  const archivos = [...$("cFotos").files];
  const n = nProductosCorreo();
  fotosCorreo = [];
  for (let j = 0; j < archivos.length; j++) {
    try {
      const canvas = recortarProducto(await archivoAImagen(archivos[j]));
      // Si hay exactamente una foto por producto, se reparten en orden; si no, quedan en el producto 1
      const producto = archivos.length === n ? j + 1 : 1;
      fotosCorreo.push({ nombre: archivos[j].name, canvas, miniatura: miniaturaCorreo(canvas), producto });
    } catch (err) { errorCorreo("No se pudo leer " + archivos[j].name + ": " + err.message); }
  }
  renderFotosCorreo();
  actualizarFotosBloques();
  actualizarIntro();
}

async function alCambiarSpecs() {
  errorCorreo("");
  specsCorreo = [...$("cSpecs").files].slice(0, MAX_PRODUCTOS_CORREO);
  datosCorreo = [];
  for (let k = 0; k < specsCorreo.length; k++) {
    const f = specsCorreo[k];
    const clave = f.name + "|" + f.size + "|" + marcaSeleccionada();
    try {
      if (!cacheDatosCorreo.has(clave)) {
        logCorreo(`Leyendo el spec sheet ${k + 1} con la IA gratuita...`);
        const d = await llamarWorker("/api/datos", { texto_spec: await textoSpecCorreo(f), marca: marcaSeleccionada() });
        cacheDatosCorreo.set(clave, {
          modelo: d.modelo || "",
          tipo: d.tipo || "",
          categoria: d.categoria || "Refrigeradora",
          feats: [0, 1, 2, 3].map((i) => (d.caracteristicas && d.caracteristicas[i]) || "")
        });
      }
      datosCorreo[k] = cacheDatosCorreo.get(clave);
    } catch (err) {
      errorCorreo(`No se pudo leer el spec sheet ${k + 1}: ${err.message}. Puedes escribir sus datos a mano.`);
    }
  }
  renderBloquesCorreo();
  logCorreo("Revisa los datos de cada producto y luego genera el correo.");
}

function cambiarNumeroCorreo() {
  renderFotosCorreo();
  renderBloquesCorreo();
}

/* ---------- Editor: la lámina del correo usa el mismo editor de fichas ---------- */
function cambiarEditorA(modo) {
  if (modo === modoEditorActivo) return;
  copiasEditor[modoEditorActivo] = { slides: editor.slides, actual: editor.actual, historial: editor.historial };
  const c = copiasEditor[modo] || { slides: [], actual: 0, historial: [] };
  editor.slides = c.slides; editor.actual = c.actual; editor.historial = c.historial; editor.selId = null;
  modoEditorActivo = modo;
}

function mostrarEditorModo(modo, desplazar) {
  const sec = $("secEditor");
  sec.hidden = false;
  sec.querySelector("h2").textContent = modo === "correo" ? "Editor del correo de bienvenida" : "Editor de la ficha (7 láminas)";
  const fichas = modo === "fichas";
  ["bPdf", "bPptx", "bPng"].forEach((id) => { $(id).hidden = !fichas; });
  $("cPdfE").hidden = fichas; $("cPngE").hidden = fichas;
  refrescarTodo();
  if (desplazar) sec.scrollIntoView({ behavior: "smooth", block: "start" });
}

function abrirEditorCorreo() {
  if (!correoSlide) return;
  cambiarEditorA("correo");
  editor.slides = [correoSlide]; editor.actual = 0; editor.selId = null; editor.historial = [];
  mostrarEditorModo("correo", true);
}

async function generarCorreo() {
  errorCorreo("");
  const productos = [...$("cProductos").querySelectorAll(".prod-bloque")].map(leerBloque);
  if (!productos.length) return errorCorreo("Elige el número de productos.");
  const faltaFoto = productos.findIndex((p) => !p.foto);
  if (faltaFoto !== -1) return errorCorreo(`Falta la foto del producto ${faltaFoto + 1}. Súbela y asígnala a ese producto.`);
  const faltaModelo = productos.findIndex((p) => !p.modelo);
  if (faltaModelo !== -1) return errorCorreo(`Escribe el código del producto ${faltaModelo + 1}.`);
  const faltaFeat = productos.findIndex((p) => p.feats.some((f) => !f));
  if (faltaFeat !== -1) return errorCorreo(`Escribe las 4 características del producto ${faltaFeat + 1}.`);

  $("cGen").disabled = true; $("cBarra").classList.add("on");
  try {
    logCorreo("Creando el ambiente de fondo con IA...");
    const ambiente = await ambienteCorreoImagen(productos[0].categoria);
    logCorreo("Armando el correo...");
    const logos = await cargarLogosCorreo(CADENAS_CORREO[$("cCadena").value].logos);
    const introC = $("cIntro").value.trim() || textoIntroCorreo(productos);
    const finalC = $("cFinal").value.trim() || finalCorreo();
    correoSlide = construirCorreo({ productos, ambiente, logoSMC: estado.logo, logos, intro: introC, final: finalC });
    guardarEnHistorial("correo", productos.map((p) => p.modelo).join(" + "), {
      productos: productos.map((p) => ({ tipo: p.tipo, modelo: p.modelo, categoria: p.categoria, feats: p.feats, foto: p.foto.toDataURL("image/png") })),
      ambiente: imagenAURL(ambiente, 1344, "image/jpeg"),
      cadena: $("cCadena").value, marca: marcaSeleccionada(), intro: introC, final: finalC
    });
    $("cEditar").hidden = false;
    abrirEditorCorreo();
    logCorreo("Listo. Ajusta textos, fotos y posiciones en el editor y descarga PNG o PDF.");
  } catch (e) {
    errorCorreo("Error: " + e.message);
    logCorreo("");
  } finally {
    $("cBarra").classList.remove("on");
    $("cGen").disabled = false;
  }
}

/* Restaura una versión guardada del correo para corregirla en el editor */
async function restaurarCorreo(d) {
  if (d.marca !== marcaSeleccionada()) return errorCorreo("Esta versión es de la marca " + MARCAS[d.marca].nombre + ". Cambia la marca para restaurarla.");
  errorCorreo(""); logCorreo("Restaurando la versión guardada...");
  try {
    const productos = [];
    for (const p of d.productos) {
      const img = await cargarImagen(p.foto);
      productos.push({ foto: canvasDe(img), tipo: p.tipo, modelo: p.modelo, categoria: p.categoria, feats: p.feats });
    }
    const ambiente = await cargarImagen(d.ambiente);
    const logos = await cargarLogosCorreo(CADENAS_CORREO[d.cadena].logos);
    $("cIntro").value = d.intro; $("cFinal").value = d.final;
    correoSlide = construirCorreo({ productos, ambiente, logoSMC: estado.logo, logos, intro: d.intro, final: d.final });
    $("cEditar").hidden = false;
    abrirEditorCorreo();
    logCorreo("Versión restaurada. Puedes corregirla en el editor.");
  } catch (e) { errorCorreo("No se pudo restaurar la versión: " + e.message); }
}

function iniciarCorreo() {
  // El editor pasa a ser una sección hermana, para que se pueda mostrar desde la pestaña de correo
  $("modoCorreo").before($("secEditor"));

  document.querySelectorAll(".modo").forEach((b) => {
    b.addEventListener("click", () => {
      const correo = b.dataset.modo === "correo";
      document.querySelectorAll(".modo").forEach((x) => x.classList.toggle("on", x === b));
      $("modoFichas").hidden = correo;
      $("modoCorreo").hidden = !correo;
      $("secEditor").hidden = true;
      cambiarEditorA(correo ? "correo" : "fichas");
    });
  });
  // Abrir el editor de fichas desde su pestaña restaura sus láminas
  $("bAbrirEditor").addEventListener("click", () => { cambiarEditorA("fichas"); mostrarEditorModo("fichas", false); });

  $("cFotos").addEventListener("change", alCambiarFotos);
  $("cSpecs").addEventListener("change", alCambiarSpecs);
  $("cNumero").addEventListener("change", cambiarNumeroCorreo);
  $("cGen").addEventListener("click", generarCorreo);
  $("cEditar").addEventListener("click", abrirEditorCorreo);
  $("cPngE").addEventListener("click", () => {
    if (correoSlide) lienzoDeSlide(correoSlide).toBlob((b) => descargarBlob(b, "correo_bienvenida_smc.png"));
  });
  $("cPdfE").addEventListener("click", () => {
    if (!correoSlide) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [CORREO_W, CORREO_H], hotfixes: ["px_scaling"] });
    pdf.addImage(lienzoDeSlide(correoSlide).toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, CORREO_W, CORREO_H);
    pdf.save("correo_bienvenida_smc.pdf");
  });
  $("cFinal").value = finalCorreo();
  // Cualquier cambio en los datos de los productos actualiza la introducción y la frase final
  $("cProductos").addEventListener("input", actualizarIntro);
  $("cProductos").addEventListener("change", actualizarIntro);
  renderBloquesCorreo();
}
iniciarCorreo();
