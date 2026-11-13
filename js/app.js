/* ==========================================================================
   Flujo: insumos, Worker, generación, exportación y eventos
   ========================================================================== */
const estado = {
  spec: null, specBase64: null, specMedia: null, demo: false,
  productos: [], miniaturas: [], fotoBase64: null, fotoMedia: null,
  feats: ["", "", "", ""], fijas: null, logo: null, modelo: ""
};
const $ = (id) => document.getElementById(id);
const URL_BASE = () => ($("urlWorker").value || "").trim().replace(/\/$/, "");

function log(t) { $("log").textContent = t; }
function error(t) { $("error").textContent = t || ""; }

function validar() {
  const insumos = !!((estado.spec || estado.demo) && estado.productos.length);
  const feats = estado.feats.every((f) => f.trim());
  $("bGen").disabled = !(insumos && feats);
  $("p1").className = "paso " + (insumos ? "ok" : "on");
  $("p2").className = "paso " + (feats ? "ok" : insumos ? "on" : "");
  $("p3").className = "paso " + (insumos && feats ? "on" : "");
  $("p4").className = "paso " + (editor.slides.length ? "ok" : "");
}

document.querySelectorAll(".dz input[type=file]").forEach((inp) => {
  const zona = inp.closest(".dz");
  inp.addEventListener("change", () => {
    const n = inp.files.length;
    zona.classList.toggle("listo", n > 0);
    const t = zona.querySelector(".dz-nombre");
    if (t) t.textContent = n ? (n > 1 ? n + " archivos seleccionados" : inp.files[0].name) : t.dataset.def;
  });
  ["dragenter", "dragover"].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove("over")));
});

async function llamarWorker(ruta, cuerpo) {
  const base = URL_BASE();
  if (!base) throw new Error("Falta la dirección del intermediario (Cloudflare Worker).");
  const resp = await fetch(base + ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const texto = await resp.text();
  let datos = {};
  try { datos = JSON.parse(texto); } catch (e) { datos = {}; }
  if (!resp.ok) {
    const detalle = datos.error || texto.replace(/\s+/g, " ").slice(0, 160) || "(respuesta vacía)";
    throw new Error(`Error ${resp.status} en ${base}${ruta}: ${detalle}`);
  }
  return datos;
}

/* Ambiente con IA; si falla, se usa un fondo de respaldo y se avisa */
async function obtenerAmbiente(tipo, descripcion) {
  if (!URL_BASE()) return escenaRespaldo(tipo);
  try {
    const { imagen_base64, media_type } = await llamarWorker("/api/imagen", { ambiente: descripcion });
    return await cargarImagen(`data:${media_type};base64,${imagen_base64}`);
  } catch (e) {
    error((($("error").textContent) ? $("error").textContent + "\n" : "") + `No se pudo generar el ambiente "${tipo}" con IA (se usó un fondo de respaldo). Motivo: ${e.message}`);
    return escenaRespaldo(tipo);
  }
}

/* Características extra (no son las 4 principales), sin "Sí/No" ni repeticiones */
function datosExtra(lista, principales) {
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const palabrasPrincipales = principales.join(" ").split(/\s+/).map(norm).filter((w) => w.length > 3);
  let datos = (lista || []).filter((d) => {
    if (!d || !String(d.valor || "").trim()) return false;
    const vt = String(d.valor).trim();
    if (/^(s[ií]|no|yes)(\W|$)/i.test(vt) && vt.length < 60) return false;
    if (/not specified|no especificad/i.test(vt)) return false;
    const et = norm(d.etiqueta);
    // Las medidas y el peso no son características comerciales: solo van en despacho
    if (/dimension|medida|tamano|peso|largo|ancho|alto|profund|voltaje|frecuencia|tension/.test(et)) return false;
    if (/\d\s*[x×]\s*\d/i.test(String(d.valor))) return false;
    return !palabrasPrincipales.some((w) => et.includes(w));
  });
  // El espacio del refrigerador va siempre junto al del congelador; si falta uno, se usa la capacidad total
  const esRefri = (d) => /refrigerad/.test(norm(d.etiqueta)), esCongel = (d) => /congelad/.test(norm(d.etiqueta));
  const refri = datos.find(esRefri), congel = datos.find(esCongel);
  datos = datos.filter((d) => !esRefri(d) && !esCongel(d));
  if (refri && congel) datos = [refri, congel, ...datos];
  return datos.slice(0, 4);
}

/* Aplica el nombre de la marca a los textos de la ficha que vienen de la IA */
function marcaEnFicha(f) {
  const c = JSON.parse(JSON.stringify(f));
  if (c.portada) { c.portada.titulo = marcaEnTexto(c.portada.titulo); c.portada.texto = marcaEnTexto(c.portada.texto); }
  c.subtitulo_ficha = marcaEnTexto(c.subtitulo_ficha);
  if (c.subtitulos_beneficios) c.subtitulos_beneficios = c.subtitulos_beneficios.map((t) => marcaEnTexto(t));
  (c.beneficios || []).forEach((x) => { if (x) { x.titulo = marcaEnTexto(x.titulo); x.texto = marcaEnTexto(x.texto); x.corto = marcaEnTexto(x.corto); } });
  (c.despacho || []).forEach((x) => { if (x) x.valor = marcaEnTexto(x.valor); });
  (c.datos_destacados || []).forEach((x) => { if (x) x.etiqueta = marcaEnTexto(x.etiqueta); });
  return c;
}

/* Cambio de marca: se actualiza el logo y los textos de la portada */
async function cambiarMarca() {
  const m = marcaSeleccionada();
  estado.logo = await cargarImagen(MARCAS[m].logo);
  $("logoHero").src = MARCAS[m].logo;
  $("logoHero").alt = MARCAS[m].nombre;
  $("marcaTexto").textContent = MARCAS[m].nombre;
}
$("marca").addEventListener("change", cambiarMarca);

async function generar() {
  error(""); $("bGen").disabled = true; $("barra").classList.add("on");
  try {
    let ficha;
    if (estado.demo) {
      ficha = JSON.parse(JSON.stringify(FICHA_DEMO));
      log("Usando datos demo de SMCRF14TMGO.");
    } else {
      log("Leyendo el spec sheet con la IA gratuita de Cloudflare...");
      const { ficha: f } = await llamarWorker("/api/extraer", {
        archivo_base64: estado.specBase64, media_type: estado.specMedia, texto_spec: estado.specTexto, caracteristicas: estado.feats.map((f) => f.trim()), marca: marcaSeleccionada()
      });
      ficha = marcaEnFicha(f);
    }
    ficha = marcaEnFicha(ficha);
    const esc = ficha.escenas || FICHA_DEMO.escenas;
    log("Generando los ambientes...");
    const [portada, b1, b2, c4] = await Promise.all([
      obtenerAmbiente("portada", ambienteSeguro(ficha, esc.portada, 0)),
      obtenerAmbiente("b1", ambienteSeguro(ficha, esc.beneficios_1_2, 1)),
      obtenerAmbiente("b2", ambienteSeguro(ficha, esc.beneficios_3_4, 2)),
      obtenerAmbiente("c4", ambienteSeguro(ficha, esc.portada, 3))
    ]);
    log("Armando las 7 láminas...");
    const amb = { portada, b1, b2, c4 };
    const feats = estado.feats.slice();
    await montarFicha(ficha, amb, feats);
    guardarEnHistorial("ficha", ficha.modelo || "Producto", await datosFichaHistorial(ficha, amb, feats));
    log("Listo. Ajusta las láminas en el editor y descarga PDF o PowerPoint.");
  } catch (e) {
    error("Error: " + e.message);
    log("");
  } finally {
    $("barra").classList.remove("on");
    validar();
  }
}

/* Arma las láminas a partir de la ficha ya lista (se usa al generar y al restaurar una versión) */
async function montarFicha(ficha, amb, feats) {
  const D = {
    modelo: ficha.modelo,
    tipo: ficha.tipo || ficha.categoria || "",
    inverter: !!ficha.inverter,
    subtitulo: ficha.subtitulo_ficha || "",
    portada: ficha.portada || FICHA_DEMO.portada,
    beneficios: feats.map((f, i) => ({ titulo: f.trim(), texto: (ficha.beneficios && ficha.beneficios[i] && ficha.beneficios[i].texto) || "", corto: (ficha.beneficios && ficha.beneficios[i] && ficha.beneficios[i].corto) || "" })),
    subtitulos: ficha.subtitulos_beneficios || [],
    datos: datosExtra(ficha.datos_destacados, feats),
    despacho: limpiarDespacho(ficha.despacho, ficha.modelo),
    ambientes: amb,
    logo: estado.logo
  };
  estado.modelo = D.modelo;
  await document.fonts.ready;
  editor.slides = construirLaminas(D);
  editor.actual = 0; editor.selId = null; editor.historial = [];
  mostrarEditor();
}

/* Despacho: sin almacenamiento ni palabras en inglés; el peso se muestra solo como "Peso" */
function limpiarDespacho(lista, modelo) {
  return (lista || []).map((it) => {
    if (!it) return null;
    let etiqueta = String(it.etiqueta || ""), valor = String(it.valor || "");
    if (/almacen/i.test(etiqueta)) return null;
    if (/no especificad|not specified|no aplica|no disponible|^n\/?a$|^none$|^-+$/i.test(valor.trim())) return null;
    valor = valor.replace(/upright|almacenamiento/gi, "").replace(/\n\s*\n/g, "\n").trim();
    if (/peso/i.test(etiqueta)) etiqueta = "Peso";
    if (!valor) return null;
    return Object.assign({}, it, { etiqueta, valor: /modelo|c[oó]digo/i.test(etiqueta) ? modelo : valor });
  }).filter(Boolean).slice(0, 15);
}

async function datosFichaHistorial(ficha, amb, feats) {
  return {
    ficha, feats, marca: marcaSeleccionada(),
    ambientes: Object.fromEntries(Object.entries(amb).map(([k, img]) => [k, imagenAURL(img, 1344, "image/jpeg")])),
    fotos: estado.productos.map((c) => c.toDataURL("image/png"))
  };
}

/* Restaura una versión guardada de la ficha para corregirla en el editor */
async function restaurarFicha(d) {
  if (d.marca !== marcaSeleccionada()) return error("Esta versión es de la marca " + MARCAS[d.marca].nombre + ". Cambia la marca para restaurarla.");
  error(""); log("Restaurando la versión guardada...");
  try {
    const imgs = await Promise.all(d.fotos.map((src) => cargarImagen(src)));
    fijarProductos(imgs.map(canvasDe), null);
    const amb = {};
    for (const k of Object.keys(d.ambientes)) amb[k] = await cargarImagen(d.ambientes[k]);
    d.feats.forEach((t, i) => { $("f" + i).value = t; estado.feats[i] = t; });
    await montarFicha(d.ficha, amb, d.feats.slice());
    log("Versión restaurada. Puedes corregirla en el editor.");
  } catch (e) { error("No se pudo restaurar la versión: " + e.message); }
}

function mostrarEditor() {
  $("secEditor").hidden = false;
  $("bAbrirEditor").hidden = false;
  refrescarTodo();
  validar();
}

/* ---------- Fotos del producto (varias) ---------- */
function referenciaReducida(img) {
  const k = Math.min(1, 1024 / Math.max(img.width, img.height));
  const ref = document.createElement("canvas");
  ref.width = Math.round(img.width * k); ref.height = Math.round(img.height * k);
  const rctx = ref.getContext("2d");
  rctx.fillStyle = "#ffffff"; rctx.fillRect(0, 0, ref.width, ref.height);
  rctx.drawImage(img, 0, 0, ref.width, ref.height);
  return ref.toDataURL("image/jpeg", 0.9).split(",")[1];
}
function fijarProductos(lista, referencia) {
  estado.productos = lista;
  estado.miniaturas = lista.map((c) => c.toDataURL("image/png"));
  const cont = $("miniFotos");
  cont.innerHTML = "";
  estado.miniaturas.forEach((src) => { const im = document.createElement("img"); im.src = src; cont.appendChild(im); });
  if (referencia) { estado.fotoBase64 = referencia; estado.fotoMedia = "image/jpeg"; }
  validar();
}

$("fotos").addEventListener("change", async (e) => {
  const archivos = [...e.target.files];
  if (!archivos.length) return;
  try {
    const lista = [];
    let referencia = null;
    for (const f of archivos) {
      const img = await archivoAImagen(f);
      if (!referencia) referencia = referenciaReducida(img);
      lista.push(recortarProducto(img));
    }
    fijarProductos(lista, referencia);
  } catch (err) { error(err.message); }
});

async function excelATexto(archivo) {
  const libro = XLSX.read(await archivo.arrayBuffer(), { type: "array" });
  return libro.SheetNames
    .map((n) => "Hoja: " + n + "\n" + XLSX.utils.sheet_to_csv(libro.Sheets[n], { blankrows: false }))
    .join("\n\n");
}

$("spec").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (!/\.(xlsx|xls)$/i.test(f.name)) {
    e.target.value = "";
    error("El spec sheet solo puede ser un archivo Excel (.xlsx o .xls).");
    return;
  }
  estado.spec = f; estado.demo = false;
  estado.specTexto = null; estado.specBase64 = null;
  estado.specMedia = f.type;
  $("specNombre").textContent = "Archivo: " + f.name;
  try {
    estado.specTexto = await excelATexto(f);
  } catch (err) { error("No se pudo leer el archivo: " + err.message); }
  validar();
  if (estado.specTexto) await sugerirCaracteristicas();
});

async function sugerirCaracteristicas() {
  try {
    log("Leyendo el spec sheet para sugerir las 4 características...");
    const { caracteristicas } = await llamarWorker("/api/sugerir", {
      archivo_base64: estado.specBase64, media_type: estado.specMedia, texto_spec: estado.specTexto
    });
    caracteristicas.slice(0, 4).forEach((t, i) => { estado.feats[i] = t; $("f" + i).value = t; });
    log("Sugerimos 4 características a partir del spec sheet. Revísalas o edítalas si quieres.");
  } catch (e) {
    error("No se pudieron sugerir las características (puedes escribirlas tú): " + e.message);
  }
  validar();
}

document.querySelectorAll("[data-feat]").forEach((el) => {
  el.addEventListener("input", () => { estado.feats[+el.dataset.feat] = el.value; validar(); });
});

$("bGen").addEventListener("click", generar);

$("bDemo").addEventListener("click", async () => {
  error("");
  estado.demo = true;
  const producto = await cargarImagen("assets/demo/producto_smcrf14tmgo.png").then((img) => recortarProducto(img));
  fijarProductos([producto], null);
  CARACTERISTICAS_DEMO.forEach((t, i) => { $("f" + i).value = t; estado.feats[i] = t; });
  validar();
  generar();
});

/* ---------- Exportación ---------- */
function descargarBlob(blob, nombre) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportarPdf() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [W, H], hotfixes: ["px_scaling"] });
  editor.slides.forEach((s, i) => {
    if (i > 0) pdf.addPage([W, H], "landscape");
    pdf.addImage(lienzoDeSlide(s).toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, W, H);
  });
  pdf.save(`Ficha_${nombreMarca()}_${estado.modelo || "producto"}.pdf`);
}
function exportarPptx() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "FICHA", width: 13.333, height: 7.5 });
  pptx.layout = "FICHA";
  editor.slides.forEach((s) => {
    const sl = pptx.addSlide();
    sl.addImage({ data: lienzoDeSlide(s).toDataURL("image/jpeg", 0.93), x: 0, y: 0, w: 13.333, h: 7.5 });
  });
  pptx.writeFile({ fileName: `Ficha_${nombreMarca()}_${estado.modelo || "producto"}.pptx` });
}
$("bVolver").addEventListener("click", () => { $("secEditor").hidden = true; });
$("bPdf").addEventListener("click", exportarPdf);
$("bPptx").addEventListener("click", exportarPptx);
$("bPng").addEventListener("click", () => {
  const s = slideActual();
  lienzoDeSlide(s).toBlob((b) => descargarBlob(b, `lamina_${editor.actual + 1}.png`));
});

/* ---------- Arranque ---------- */
$("urlWorker").addEventListener("change", () => {
  try { localStorage.setItem("smc_worker_url", URL_BASE()); } catch (e) { /* sin almacenamiento */ }
});

async function iniciar() {
  try {
    await Promise.all([
      document.fonts.load(`800 40px Montserrat`), document.fonts.load(`400 40px Montserrat`),
      document.fonts.load(`600 40px Montserrat`)
    ]);
  } catch (e) { /* sin fuente: se usa la de respaldo */ }
  estado.fijas = {
    respaldo: await cargarImagen("assets/fijas/respaldo.jpg"),
    cierre: await cargarImagen("assets/fijas/cierre.jpg")
  };
  estado.logo = await cargarImagen(MARCAS[marcaSeleccionada()].logo);
  await precargarIconos();
  iniciarEditor();
  actualizarHistorial();
  try { $("urlWorker").value = localStorage.getItem("smc_worker_url") || $("urlWorker").value; } catch (e) { /* sin almacenamiento */ }
}
iniciar().then(validar).catch((e) => error("No se pudieron cargar los recursos: " + e.message));
