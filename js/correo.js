/* ==========================================================================
   Correo de bienvenida: gráfica horizontal (1536×1024) con 1 a 4 productos
   Reutiliza el recorte de producto, la sombra, los iconos y el Worker de fichas.
   ========================================================================== */

const CORREO_W = 1536, CORREO_H = 1024, CORREO_BANDA = 440;
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
const INTRO_CORREO = "En SMC seguimos ampliando nuestro portafolio con productos pensados para hacer tu día a día más práctico.";
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

/* Dibuja la gráfica completa del correo. cfg = {productos:[{foto, modelo, categoria, feats}], ambiente, logoSMC, cadena, intro, final} */
function renderCorreo(cfg) {
  const c = document.createElement("canvas");
  c.width = CORREO_W; c.height = CORREO_H;
  const ctx = c.getContext("2d");
  const n = cfg.productos.length;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CORREO_W, CORREO_H);

  /* 1. Lifestyle al principio, con los productos encima */
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, CORREO_W, CORREO_BANDA); ctx.clip();
  ctx.filter = "brightness(1.25) contrast(0.95)";
  drawCover(ctx, cfg.ambiente, 0, 0, CORREO_W, CORREO_BANDA);
  ctx.filter = "none";
  const velo = ctx.createLinearGradient(0, 0, CORREO_W * 0.6, 0);
  velo.addColorStop(0, "rgba(71,169,228,0.96)");
  velo.addColorStop(0.55, "rgba(71,169,228,0.82)");
  velo.addColorStop(1, "rgba(71,169,228,0)");
  ctx.fillStyle = velo;
  ctx.fillRect(0, 0, CORREO_W, CORREO_BANDA);
  ctx.restore();

  const zonaX = 760, zonaW = CORREO_W - zonaX - 50, ranura = zonaW / n, baseY = CORREO_BANDA - 24;
  const fotos = cfg.productos.map((p) => p.foto);
  cfg.productos.forEach((p, i) => {
    const h = Math.min(360, ranura * 0.92 * p.foto.height / p.foto.width);
    const w = h * p.foto.width / p.foto.height;
    const cx = zonaX + ranura * (i + 0.5);
    dibujarProducto(ctx, { foto: i, x: cx - w / 2, y: baseY - h, w, h, sombra: true }, fotos);
  });

  /* Logo y título sobre el lifestyle */
  if (cfg.logoSMC) {
    const lw = 230, lh = lw * cfg.logoSMC.height / cfg.logoSMC.width;
    ctx.drawImage(cfg.logoSMC, 70, 50, lw, lh);
  }
  const lineas = n === 1
    ? ["CONOCE LA NUEVA " + cfg.productos[0].categoria.toUpperCase(), "SMC " + (cfg.productos[0].modelo || "").toUpperCase()]
    : ["DESCUBRE LO NUEVO DE SMC", n + " nuevos productos para tu hogar"];
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 12;
  ctx.textAlign = "left";
  const tam = Math.min(...lineas.map((l) => tamanoQueQuepa(ctx, l, 800, 620, 56, 28)));
  fuente(ctx, 800, tam);
  lineas.forEach((l, i) => ctx.fillText(l, 70, 210 + i * (tam * 1.2)));
  ctx.restore();

  /* 2. Introducción */
  ctx.save();
  fuente(ctx, 500, 26);
  ctx.fillStyle = MARINO; ctx.textAlign = "center";
  envolver(ctx, cfg.intro, 1240).forEach((l, i) => ctx.fillText(l, CORREO_W / 2, 500 + i * 38));
  ctx.restore();

  /* 3. Columna por producto: nombre, categoría y 4 características con icono */
  const mX = 70, separa = 40, colW = (CORREO_W - mX * 2 - separa * (n - 1)) / n;
  const dos = n <= 2;
  cfg.productos.forEach((p, i) => {
    const x = mX + i * (colW + separa);
    ctx.save();
    ctx.textAlign = "left";
    fuente(ctx, 800, tamanoQueQuepa(ctx, p.modelo || "", 800, colW, 32, 20));
    ctx.fillStyle = MARINO;
    ctx.fillText((p.modelo || "").toUpperCase(), x, 612);
    fuente(ctx, 700, 18);
    ctx.fillStyle = AZUL;
    ctx.fillText((p.categoria || "").toUpperCase(), x, 642);
    ctx.restore();

    p.feats.forEach((f, k) => {
      let cx, cy, tw;
      if (dos) { cx = x + (k % 2) * (colW / 2); cy = 672 + Math.floor(k / 2) * 96; tw = colW / 2 - 100; }
      else { cx = x; cy = 672 + k * 54; tw = colW - 86; }
      ctx.save();
      ctx.beginPath(); ctx.arc(cx + 27, cy + 27, 27, 0, Math.PI * 2);
      ctx.fillStyle = AZUL; ctx.fill();
      const ic = icono(claveIcono(f), BLANCO);
      if (ic) ctx.drawImage(ic, cx + 27 - 20, cy + 27 - 20, 40, 40);
      fuente(ctx, 600, 22);
      ctx.fillStyle = CORREO_TEXTO; ctx.textAlign = "left";
      envolver(ctx, f, tw).slice(0, 2).forEach((l, j) => ctx.fillText(l, cx + 68, cy + 34 + j * 26));
      ctx.restore();
    });
  });

  /* 4. Frase final y cadenas */
  ctx.save();
  fuente(ctx, 800, 30);
  ctx.fillStyle = AZUL; ctx.textAlign = "center";
  ctx.fillText(cfg.final, CORREO_W / 2, 930);
  ctx.restore();

  const px = 70, py = 952, pw = CORREO_W - 140, ph = 62;
  ctx.save();
  rrect(ctx, px, py, pw, ph, ph / 2);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = AZUL; ctx.stroke();
  fuente(ctx, 800, 22);
  ctx.fillStyle = MARINO; ctx.textAlign = "left";
  ctx.fillText("Disponible en cadenas afiliadas:", px + 34, py + 39);
  ctx.restore();

  const altoLogo = 44, separaLogo = 40;
  const medidas = cfg.logos.map((img) => ({ img, w: Math.min(190, altoLogo * img.width / img.height) }));
  const total = medidas.reduce((s, m) => s + m.w, 0) + separaLogo * (medidas.length - 1);
  const inicio = px + 400, fin = px + pw - 30;
  let lx = inicio + (fin - inicio - total) / 2;
  medidas.forEach((m) => {
    ctx.drawImage(m.img, lx, py + (ph - altoLogo) / 2, m.w, altoLogo);
    lx += m.w + separaLogo;
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
  div._nombreFoto = "";

  div.querySelector('[data-campo="foto"]').addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      div._foto = recortarProducto(await archivoAImagen(f));
      div.querySelector('[data-campo="foto"]').closest(".dz").classList.add("listo");
      div.querySelector('[data-campo="foto"]').closest(".dz").querySelector(".dz-nombre").textContent = f.name;
    } catch (err) { errorCorreo("No se pudo leer la foto: " + err.message); }
  });

  div.querySelector('[data-campo="spec"]').addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    div.querySelector('[data-campo="spec"]').closest(".dz").classList.add("listo");
    div.querySelector('[data-campo="spec"]').closest(".dz").querySelector(".dz-nombre").textContent = f.name;
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
