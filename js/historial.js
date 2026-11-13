/* Historial por producto: cada ficha o correo generado se guarda (en IndexedDB del navegador)
   para poder regresar y corregir. Solo guarda lo necesario para volver a armar la lámina o el correo. */
const HIST_DB = "foco-historial";
const HIST_STORE = "versiones";
const HIST_MAX = 6; // versiones por producto y tipo

function abrirHistorialDB() {
  return new Promise((resolver, rechazar) => {
    if (!("indexedDB" in window)) return rechazar(new Error("sin IndexedDB"));
    const r = indexedDB.open(HIST_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(HIST_STORE, { keyPath: "id", autoIncrement: true });
    r.onsuccess = () => resolver(r.result);
    r.onerror = () => rechazar(r.error);
  });
}

function histPeticion(modo, operacion) {
  return abrirHistorialDB().then((db) => new Promise((resolver, rechazar) => {
    const tx = db.transaction(HIST_STORE, modo);
    const req = operacion(tx.objectStore(HIST_STORE));
    tx.oncomplete = () => resolver(req ? req.result : undefined);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  }));
}

async function histListarTodo() {
  const lista = (await histPeticion("readonly", (s) => s.getAll())) || [];
  return lista.sort((a, b) => b.fecha - a.fecha);
}

async function histGuardar(tipo, producto, datos) {
  await histPeticion("readwrite", (s) => s.add({ tipo, producto, fecha: Date.now(), datos }));
  // Se conservan solo las versiones más recientes de cada producto
  const mismos = (await histListarTodo()).filter((e) => e.tipo === tipo && e.producto === producto);
  const sobran = mismos.slice(HIST_MAX);
  if (sobran.length) await histPeticion("readwrite", (s) => { sobran.forEach((e) => s.delete(e.id)); return null; });
}

/* Convierte una imagen o lienzo en texto (data URL) para guardarla */
function imagenAURL(fuente, maxAncho, formato) {
  const w0 = fuente.naturalWidth || fuente.width, h0 = fuente.naturalHeight || fuente.height;
  const k = Math.min(1, maxAncho / w0);
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  const ctx = c.getContext("2d");
  if (formato === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(fuente, 0, 0, c.width, c.height);
  return formato === "image/jpeg" ? c.toDataURL(formato, 0.88) : c.toDataURL("image/png");
}

/* Copia una imagen cargada en un lienzo, para que el resto de la app la use igual que una foto de producto */
function canvasDe(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  return c;
}

/* Guarda sin interrumpir si el navegador no permite almacenar */
async function guardarEnHistorial(tipo, producto, datos) {
  try {
    await histGuardar(tipo, producto, datos);
    actualizarHistorial();
  } catch (e) { /* sin historial: la app sigue funcionando */ }
}

/* Muestra el historial agrupado por producto con botón "Restaurar" */
async function renderizarHistorial(tipo, cont, restaurar) {
  if (!cont) return;
  cont.innerHTML = "";
  const titulo = document.createElement("h4");
  titulo.textContent = "Historial por producto";
  cont.appendChild(titulo);
  let lista;
  try { lista = (await histListarTodo()).filter((e) => e.tipo === tipo); }
  catch (e) {
    const p = document.createElement("p"); p.className = "hist-vacio";
    p.textContent = "El historial no está disponible en este navegador.";
    cont.appendChild(p); return;
  }
  if (!lista.length) {
    const p = document.createElement("p"); p.className = "hist-vacio";
    p.textContent = "Aquí aparecerán las versiones de cada producto para regresar y corregir.";
    cont.appendChild(p); return;
  }
  const grupos = {};
  lista.forEach((e) => { (grupos[e.producto] = grupos[e.producto] || []).push(e); });
  Object.keys(grupos).forEach((producto) => {
    const bloque = document.createElement("div"); bloque.className = "hist-grupo";
    const h = document.createElement("h3"); h.textContent = producto; bloque.appendChild(h);
    grupos[producto].forEach((e) => {
      const fila = document.createElement("div"); fila.className = "hist-fila";
      const fecha = new Date(e.fecha).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
      const span = document.createElement("span"); span.textContent = "Versión del " + fecha;
      const btn = document.createElement("button"); btn.className = "btn sec hist-btn"; btn.textContent = "Restaurar";
      btn.addEventListener("click", () => restaurar(e.datos));
      fila.append(span, btn); bloque.appendChild(fila);
    });
    cont.appendChild(bloque);
  });
}

function actualizarHistorial() {
  renderizarHistorial("ficha", document.getElementById("histFichas"), restaurarFicha);
  renderizarHistorial("correo", document.getElementById("histCorreo"), restaurarCorreo);
}
