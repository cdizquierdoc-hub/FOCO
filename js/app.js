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

async function generar() {
  error(""); $("bGen").disabled = true; $("barra").classList.add("on");
  try {
    let ficha;
    if (estado.demo) {
      ficha = JSON.parse(JSON.stringify(FICHA_DEMO));
      log("Usando datos demo de SMCRF14TMGO.");
    } else {
      log("Leyendo el spec sheet con Claude...");
      const { ficha: f } = await llamarWorker("/api/extraer", {
        archivo_base64: estado.specBase64, media_type: estado.specMedia, caracteristicas: estado.feats.map((f) => f.trim())
      });
      ficha = f;
    }
    const esc = ficha.escenas || FICHA_DEMO.escenas;
    log("Generando los ambientes...");
    const [portada, b1, b2, c4] = await Promise.all([
      obtenerAmbiente("portada", ambienteSeguro(ficha, esc.portada, 0)),
      obtenerAmbiente("b1", ambienteSeguro(ficha, esc.beneficios_1_2, 1)),
      obtenerAmbiente("b2", ambienteSeguro(ficha, esc.beneficios_3_4, 2)),
      obtenerAmbiente("c4", ambienteSeguro(ficha, esc.portada, 3))
    ]);
    log("Armando las 7 láminas...");
    const D = {
      modelo: ficha.modelo,
      subtitulo: ficha.subtitulo_ficha || "",
      portada: ficha.portada || FICHA_DEMO.portada,
      beneficios: estado.feats.map((f, i) => ({ titulo: f.trim(), texto: (ficha.beneficios && ficha.beneficios[i] && ficha.beneficios[i].texto) || "" })),
      datos: ficha.datos_destacados || [],
      despacho: ficha.despacho || [],
      ambientes: { portada, b1, b2, c4 },
      logo: estado.logo
    };
    estado.modelo = D.modelo;
    await document.fonts.ready;
    editor.slides = construirLaminas(D);
    editor.actual = 0; editor.selId = null; editor.historial = [];
    mostrarEditor();
    log("Listo. Ajusta las láminas en el editor y descarga PDF o PowerPoint.");
  } catch (e) {
    error("Error: " + e.message);
    log("");
  } finally {
    $("barra").classList.remove("on");
    validar();
  }
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

$("spec").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  estado.spec = f; estado.demo = false;
  estado.specMedia = f.type;
  $("specNombre").textContent = "Archivo: " + f.name;
  try { estado.specBase64 = await archivoABase64(f); } catch (err) { error(err.message); }
  validar();
});

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
  pdf.save(`Ficha_SMC_${estado.modelo || "producto"}.pdf`);
}
function exportarPptx() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "FICHA", width: 13.333, height: 7.5 });
  pptx.layout = "FICHA";
  editor.slides.forEach((s) => {
    const sl = pptx.addSlide();
    sl.addImage({ data: lienzoDeSlide(s).toDataURL("image/jpeg", 0.93), x: 0, y: 0, w: 13.333, h: 7.5 });
  });
  pptx.writeFile({ fileName: `Ficha_SMC_${estado.modelo || "producto"}.pptx` });
}
$("bVolver").addEventListener("click", () => { $("secEditor").hidden = true; });
$("bAbrirEditor").addEventListener("click", () => { $("secEditor").hidden = false; refrescarTodo(); });
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
  estado.logo = await cargarImagen("assets/logo_smc_blanco.png");
  await precargarIconos();
  iniciarEditor();
  try { $("urlWorker").value = localStorage.getItem("smc_worker_url") || $("urlWorker").value; } catch (e) { /* sin almacenamiento */ }
}
iniciar().then(validar).catch((e) => error("No se pudieron cargar los recursos: " + e.message));
