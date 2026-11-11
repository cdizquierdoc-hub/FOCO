/* ==========================================================================
   Correo de bienvenida: gráfica horizontal (1536×1024), según la referencia
   Lifestyle arriba con el/los productos encima, características en tarjetas
   con iconos distintos, texto breve y logos de las cadenas al pie.
   ========================================================================== */

const CORREO_W = 1536, CORREO_H = 1024;
const CORREO_TEXTO = "#1c2b3a";

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
const CATEGORIAS_CORREO = ["Refrigeradora", "Congelador", "Minibar", "Lavadora", "Cocina", "Aire acondicionado", "Otro"];
const INTRO_CORREO = "En SMC seguimos ampliando nuestro portafolio con productos pensados para tu día a día.";
const FINAL_CORREO = "MÁS ESPACIO, MÁS COMODIDAD, MÁS SMC.";

const logosCorreo = {};
let ultimoCorreo = null;

/* Descripción del ambiente según la categoría (sin personas, sin muebles de sala para fichas de cocina) */
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

/* Mayor tamaño (entre max y min) en que el texto cabe en maxW */
function tamanoQueQuepa(ctx, texto, peso, maxW, max, min) {
  for (let t = max; t >= min; t -= 2) {
    fuente(ctx, peso, t);
    if (ctx.measureText(texto).width <= maxW) return t;
  }
  return min;
}

/* Asigna un icono distinto a cada característica de todo el correo (evita repeticiones) */
function asignarIconos(productos) {
  const usados = new Set();
  const pool = Object.keys(ICONOS);
  productos.forEach((p) => {
    p.iconos = p.feats.map((f) => {
      let k = claveIcono(f);
      if (usados.has(k)) k = pool.find((x) => !usados.has(x)) || k;
      usados.add(k);
      return k;
    });
  });
}

function tarjetaCorreo(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = "rgba(23,38,79,.14)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  rrect(ctx, x, y, w, h, 26);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.restore();
}

function circuloIcono(ctx, clave, cx, cy, r) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = AZUL; ctx.fill();
  const ic = icono(clave, BLANCO);
  if (ic) { const s = r * 1.1; ctx.drawImage(ic, cx - s / 2, cy - s / 2, s, s); }
}

function textoCorreo(ctx, texto, x, y, maxW, tam, peso, color, alin, lh, maxLineas) {
  fuente(ctx, peso, tam);
  ctx.fillStyle = color; ctx.textAlign = alin;
  const ax = alin === "center" ? x + maxW / 2 : x;
  envolver(ctx, texto, maxW).slice(0, maxLineas || 9).forEach((l, i) => ctx.fillText(l, ax, y + i * lh));
}

/* Dibuja la gráfica completa. cfg = {productos:[{foto, modelo, categoria, feats}], ambiente, logoSMC, logos, intro, final} */
function renderCorreo(cfg) {
  const c = document.createElement("canvas");
  c.width = CORREO_W; c.height = CORREO_H;
  const ctx = c.getContext("2d");
  const n = cfg.productos.length;
  asignarIconos(cfg.productos);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CORREO_W, CORREO_H);

  /* 1. Encabezado azul a la izquierda */
  const enc = ctx.createLinearGradient(0, 0, 740, 280);
  enc.addColorStop(0, AZUL); enc.addColorStop(1, MARINO);
  ctx.fillStyle = enc;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(740, 0); ctx.lineTo(700, 290); ctx.lineTo(0, 290); ctx.closePath();
  ctx.fill();

  if (cfg.logoSMC) {
    const lw = 210, lh = lw * cfg.logoSMC.height / cfg.logoSMC.width;
    ctx.drawImage(cfg.logoSMC, 70, 40, lw, lh);
  }
  const lineas = n === 1
    ? ["CONOCE LA NUEVA " + cfg.productos[0].categoria.toUpperCase(), "SMC " + (cfg.productos[0].modelo || "").toUpperCase()]
    : ["DESCUBRE LO NUEVO DE SMC", n + " nuevos productos para tu hogar"];
  const tam = Math.min(...lineas.map((l) => tamanoQueQuepa(ctx, l, 800, 610, 48, 26)));
  fuente(ctx, 800, tam);
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "left";
  lineas.forEach((l, i) => ctx.fillText(l, 70, 170 + i * tam * 1.25));

  /* 2. Lifestyle con el/los productos encima (bloque redondeado) */
  const lx = 40, ly = 250, lw2 = 660, lh2 = 430;
  ctx.save();
  rrect(ctx, lx, ly, lw2, lh2, 44);
  ctx.clip();
  ctx.filter = "brightness(1.25) contrast(0.95)";
  drawCover(ctx, cfg.ambiente, lx, ly, lw2, lh2);
  ctx.filter = "none";
  ctx.restore();

  const fotos = cfg.productos.map((p) => p.foto);
  const ranura = lw2 / n, baseY = ly + lh2 - 28;
  cfg.productos.forEach((p, i) => {
    const h = Math.min(370, ranura * 0.9 * p.foto.height / p.foto.width);
    const w = h * p.foto.width / p.foto.height;
    const cx = lx + ranura * (i + 0.5);
    dibujarProducto(ctx, { foto: i, x: cx - w / 2, y: baseY - h, w, h, sombra: true }, fotos);
  });

  /* 3. Texto introductorio breve */
  textoCorreo(ctx, cfg.intro, 70, 735, 600, 24, 500, MARINO, "left", 36, 3);

  /* 4. Características */
  const areaX = 780, areaW = CORREO_W - areaX - 50, areaY = 110, areaH = 680;
  if (n === 1) {
    const p = cfg.productos[0];
    const gap = 34, cw = (areaW - gap) / 2, ch = (areaH - gap) / 2;
    p.feats.forEach((f, k) => {
      const x = areaX + (k % 2) * (cw + gap), y = areaY + Math.floor(k / 2) * (ch + gap);
      tarjetaCorreo(ctx, x, y, cw, ch);
      circuloIcono(ctx, p.iconos[k], x + cw / 2, y + ch * 0.38, 58);
      textoCorreo(ctx, f, x + 26, y + ch * 0.7, cw - 52, 26, 700, MARINO, "center", 32, 2);
    });
  } else {
    const bloque = areaH / n;
    const r = n === 2 ? 36 : n === 3 ? 24 : 20;
    const cardH = n === 2 ? 118 : n === 3 ? 60 : 50;
    const tamFeat = n === 2 ? 22 : n === 3 ? 20 : 19;
    const tamMod = n === 2 ? 30 : n === 3 ? 26 : 24;
    const cg = n === 2 ? 14 : 10, cw = (areaW - cg) / 2;
    const cabecera = n === 2 ? 72 : 40;
    cfg.productos.forEach((p, i) => {
      const y0 = areaY + i * bloque;
      const modelo = (p.modelo || "").toUpperCase();
      ctx.save();
      fuente(ctx, 800, tamanoQueQuepa(ctx, modelo, 800, areaW * 0.6, tamMod, 18));
      ctx.fillStyle = MARINO; ctx.textAlign = "left";
      ctx.fillText(modelo, areaX, y0 + tamMod + 4);
      const anchoModelo = ctx.measureText(modelo).width;
      fuente(ctx, 700, 16);
      ctx.fillStyle = AZUL;
      if (n === 2) ctx.fillText((p.categoria || "").toUpperCase(), areaX, y0 + tamMod + 28);
      else ctx.fillText("· " + (p.categoria || "").toUpperCase(), areaX + anchoModelo + 14, y0 + tamMod + 4);
      ctx.restore();
      const yi = y0 + cabecera;
      p.feats.forEach((f, k) => {
        const x = areaX + (k % 2) * (cw + cg), y = yi + Math.floor(k / 2) * (cardH + cg);
        tarjetaCorreo(ctx, x, y, cw, cardH);
        circuloIcono(ctx, p.iconos[k], x + r + 18, y + cardH / 2, r);
        textoCorreo(ctx, f, x + r * 2 + 34, y + cardH / 2 + tamFeat * 0.35, cw - r * 2 - 50, tamFeat, 700, MARINO, "left", tamFeat * 1.25, 2);
      });
    });
  }

  /* 5. Frase final y cadenas */
  ctx.save();
  fuente(ctx, 800, 28);
  ctx.fillStyle = AZUL; ctx.textAlign = "center";
  ctx.fillText(cfg.final, CORREO_W / 2, 935);
  ctx.restore();

  const px = 70, py = 955, pw = CORREO_W - 140, ph = 56;
  ctx.save();
  rrect(ctx, px, py, pw, ph, ph / 2);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = AZUL; ctx.stroke();
  fuente(ctx, 800, 21);
  ctx.fillStyle = MARINO; ctx.textAlign = "left";
  ctx.fillText("Disponible en cadenas afiliadas:", px + 34, py + 35);
  ctx.restore();

  const altoLogo = 40, separaLogo = 40;
  const medidas = cfg.logos.map((img) => ({ img, w: Math.min(190, altoLogo * img.width / img.height) }));
  const total = medidas.reduce((s, m) => s + m.w, 0) + separaLogo * (medidas.length - 1);
  const inicio = px + 400, fin = px + pw - 30;
  let cursor = inicio + (fin - inicio - total) / 2;
  medidas.forEach((m) => {
    ctx.drawImage(m.img, cursor, py + (ph - altoLogo) / 2, m.w, altoLogo);
    cursor += m.w + separaLogo;
  });

  return c;
}

/* ---------- Interfaz ---------- */
function opcionesCategoria(seleccion) {
  return CATEGORIAS_CORREO.map((c) => `<option${c === seleccion ? " selected" : ""}>${c}</option>`).join("");
}

function bloqueProducto(i, datos) {
  const d = datos || {};
  const div = document.createElement("div");
  div.className = "prod-bloque";
  div.innerHTML = `
    <div class="prod-h"><div class="num">${i + 1}</div><strong>Producto ${i + 1}</strong></div>
    <div class="grid2">
      <label class="campo">Modelo <input type="text" data-campo="modelo" placeholder="Ej. SMCRF14TMGO" value="${(d.modelo || "").replace(/"/g, "&quot;")}"></label>
      <label class="campo">Categoría <select data-campo="categoria">${opcionesCategoria(d.categoria || "Refrigeradora")}</select></label>
    </div>
    <div class="grid2">
      <label class="dz dz-mini">
        <strong>Foto del producto</strong>
        <span class="dz-nombre" data-def="PNG con fondo transparente o JPG.">PNG con fondo transparente o JPG.</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" data-campo="foto">
      </label>
      <label class="dz dz-mini">
        <strong>Spec sheet (opcional)</strong>
        <span class="dz-nombre" data-def="Excel o CSV: sugiere las 4 características.">Excel o CSV: sugiere las 4 características.</span>
        <input type="file" accept=".xlsx,.xls,.csv" data-campo="spec">
      </label>
    </div>
    <div class="feat"><div class="num">1</div><input type="text" data-campo="f0" placeholder="Característica 1" value="${(d.feats && d.feats[0]) || ""}"></div>
    <div class="feat"><div class="num">2</div><input type="text" data-campo="f1" placeholder="Característica 2" value="${(d.feats && d.feats[1]) || ""}"></div>
    <div class="feat"><div class="num">3</div><input type="text" data-campo="f2" placeholder="Característica 3" value="${(d.feats && d.feats[2]) || ""}"></div>
    <div class="feat"><div class="num">4</div><input type="text" data-campo="f3" placeholder="Característica 4" value="${(d.feats && d.feats[3]) || ""}"></div>`;
  div._foto = d.foto || null;

  div.querySelector('[data-campo="foto"]').addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      div._foto = recortarProducto(await archivoAImagen(f));
      const zona = div.querySelector('[data-campo="foto"]').closest(".dz");
      zona.classList.add("listo");
      zona.querySelector(".dz-nombre").textContent = f.name;
    } catch (err) { errorCorreo("No se pudo leer la foto: " + err.message); }
  });

  div.querySelector('[data-campo="spec"]').addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const zona = div.querySelector('[data-campo="spec"]').closest(".dz");
    zona.classList.add("listo");
    zona.querySelector(".dz-nombre").textContent = f.name;
    try {
      const texto = /\.(xlsx|xls)$/i.test(f.name) ? await excelATexto(f) : await f.text();
      const { caracteristicas } = await llamarWorker("/api/sugerir", { texto_spec: texto });
      caracteristicas.slice(0, 4).forEach((t, k) => { div.querySelector(`[data-campo="f${k}"]`).value = t; });
      logCorreo("Sugerí las características del producto " + (i + 1) + ". Revísalas si quieres.");
    } catch (err) { errorCorreo("No se pudieron sugerir las características del producto " + (i + 1) + ": " + err.message); }
  });
  return div;
}

function leerBloque(div) {
  const v = (c) => div.querySelector(`[data-campo="${c}"]`).value.trim();
  return {
    foto: div._foto,
    modelo: v("modelo"),
    categoria: div.querySelector('[data-campo="categoria"]').value,
    feats: [v("f0"), v("f1"), v("f2"), v("f3")]
  };
}

function crearBloquesCorreo() {
  const n = +$("cNumero").value;
  const cont = $("cProductos");
  const previos = [...cont.querySelectorAll(".prod-bloque")].map((b) => ({ ...leerBloque(b), foto: b._foto }));
  cont.innerHTML = "";
  for (let i = 0; i < n; i++) cont.appendChild(bloqueProducto(i, previos[i]));
}

function errorCorreo(t) { $("cError").textContent = t || ""; }
function logCorreo(t) { $("cLog").textContent = t; }

async function generarCorreo() {
  errorCorreo("");
  const productos = [...$("cProductos").querySelectorAll(".prod-bloque")].map(leerBloque);
  const faltaFoto = productos.findIndex((p) => !p.foto);
  if (faltaFoto !== -1) return errorCorreo(`Falta la foto del producto ${faltaFoto + 1}.`);
  const faltaModelo = productos.findIndex((p) => !p.modelo);
  if (faltaModelo !== -1) return errorCorreo(`Escribe el modelo del producto ${faltaModelo + 1}.`);
  const faltaFeat = productos.findIndex((p) => p.feats.some((f) => !f));
  if (faltaFeat !== -1) return errorCorreo(`Escribe las 4 características del producto ${faltaFeat + 1}.`);

  $("cGen").disabled = true; $("cBarra").classList.add("on");
  try {
    logCorreo("Creando el ambiente de fondo con IA...");
    const ambiente = await ambienteCorreoImagen(productos[0].categoria);
    logCorreo("Armando el correo...");
    const cadena = CADENAS_CORREO[$("cCadena").value];
    const logos = await cargarLogosCorreo(cadena.logos);
    const lienzo = renderCorreo({
      productos,
      ambiente,
      logoSMC: estado.logo,
      logos,
      intro: $("cIntro").value.trim() || INTRO_CORREO,
      final: $("cFinal").value.trim() || FINAL_CORREO
    });
    ultimoCorreo = lienzo;
    const vista = $("cVista");
    vista.innerHTML = "";
    lienzo.style.width = "100%"; lienzo.style.height = "auto";
    vista.appendChild(lienzo);
    $("cDescargas").hidden = false;
    logCorreo("Listo. Revisa la gráfica y descárgala en PNG o PDF.");
  } catch (e) {
    errorCorreo("Error: " + e.message);
    logCorreo("");
  } finally {
    $("cBarra").classList.remove("on");
    $("cGen").disabled = false;
  }
}

function iniciarCorreo() {
  document.querySelectorAll(".modo").forEach((b) => {
    b.addEventListener("click", () => {
      const correo = b.dataset.modo === "correo";
      document.querySelectorAll(".modo").forEach((x) => x.classList.toggle("on", x === b));
      $("modoFichas").hidden = correo;
      $("modoCorreo").hidden = !correo;
    });
  });
  $("cNumero").addEventListener("change", crearBloquesCorreo);
  $("cGen").addEventListener("click", generarCorreo);
  $("cPng").addEventListener("click", () => {
    if (ultimoCorreo) ultimoCorreo.toBlob((b) => descargarBlob(b, "correo_bienvenida_smc.png"));
  });
  $("cPdf").addEventListener("click", () => {
    if (!ultimoCorreo) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [CORREO_W, CORREO_H], hotfixes: ["px_scaling"] });
    pdf.addImage(ultimoCorreo.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, CORREO_W, CORREO_H);
    pdf.save("correo_bienvenida_smc.pdf");
  });
  $("cIntro").value = INTRO_CORREO;
  $("cFinal").value = FINAL_CORREO;
  crearBloquesCorreo();
}
iniciarCorreo();
