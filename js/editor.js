/* ==========================================================================
   Editor tipo Canva: seleccionar, mover, cambiar tamaño y rotar desde cada esquina,
   editar texto con doble clic, insertar imágenes y fotos de producto, ordenar capas y deshacer
   ========================================================================== */
const editor = { slides: [], actual: 0, selId: null, historial: [], modo: null };
const ESQUINAS = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; // superior izq., superior der., inferior der., inferior izq.
const RADIO_MANIJA = 26;

function slideActual() { return editor.slides[editor.actual]; }
function seleccionado() {
  const s = slideActual();
  return (s && s.elementos.find((e) => e.id === editor.selId)) || null;
}

/* ---------- Geometría con rotación (la rotación es alrededor del centro del elemento) ---------- */
function centroE(e) { return { x: e.x + e.w / 2, y: e.y + e.h / 2 }; }
function aMundo(e, lx, ly) {
  const c = centroE(e), t = (e.rot || 0) * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
  return { x: c.x + lx * co - ly * si, y: c.y + lx * si + ly * co };
}
function aLocal(e, px, py) {
  const c = centroE(e), t = (e.rot || 0) * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
  const dx = px - c.x, dy = py - c.y;
  return { x: dx * co + dy * si, y: -dx * si + dy * co };
}
function esquinaMundo(e, k) { return aMundo(e, ESQUINAS[k][0] * e.w / 2, ESQUINAS[k][1] * e.h / 2); }
function manijaRotacion(e) { return aMundo(e, 0, -e.h / 2 - 46); }
function distancia(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function elementoEn(s, px, py) {
  for (let i = s.elementos.length - 1; i >= 0; i--) {
    const e = s.elementos[i];
    const l = aLocal(e, px, py);
    if (Math.abs(l.x) <= e.w / 2 && Math.abs(l.y) <= e.h / 2) return e;
  }
  return null;
}

function snapshot() {
  return editor.slides.map((s) => ({ nombre: s.nombre, fondo: s.fondo, fotos: s.fotos, minis: s.minis, elementos: s.elementos.map((e) => Object.assign({}, e)) }));
}
function guardar() {
  editor.historial.push(snapshot());
  if (editor.historial.length > 60) editor.historial.shift();
}
function deshacer() {
  const previo = editor.historial.pop();
  if (!previo) return;
  editor.slides = previo;
  editor.selId = null;
  refrescarTodo();
}
function refrescarTodo() {
  redibujarLienzo();
  renderMiniaturas();
  renderPropiedades();
}

function redibujarLienzo() {
  const s = slideActual();
  const d = dimsSlide(s), lz = $("lienzo");
  if (lz.width !== d.w || lz.height !== d.h) { lz.width = d.w; lz.height = d.h; }
  const ctx = lz.getContext("2d");
  pintarSlide(ctx, s);
  const e = seleccionado();
  if (e) dibujarMarco(ctx, e);
}

/* Marco de selección con manijas en las 4 esquinas y una manija de rotación arriba */
function dibujarMarco(ctx, e) {
  const c = centroE(e);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((e.rot || 0) * Math.PI / 180);
  ctx.setLineDash([14, 8]); ctx.lineWidth = 4; ctx.strokeStyle = MARINO;
  ctx.strokeRect(-e.w / 2 - 6, -e.h / 2 - 6, e.w + 12, e.h + 12);
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(0, -e.h / 2 - 6); ctx.lineTo(0, -e.h / 2 - 46); ctx.stroke();
  if (!e.fondo) {
    ctx.fillStyle = BLANCO; ctx.lineWidth = 3;
    for (const [sx, sy] of ESQUINAS) {
      ctx.beginPath(); ctx.rect(sx * e.w / 2 - 12, sy * e.h / 2 - 12, 24, 24); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, -e.h / 2 - 46, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function renderMiniaturas() {
  const cont = $("miniaturas");
  cont.innerHTML = "";
  editor.slides.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mini-item" + (i === editor.actual ? " act" : "");
    const cv = document.createElement("canvas");
    const dm = dimsSlide(s);
    cv.width = 240; cv.height = Math.round(240 * dm.h / dm.w);
    cv.getContext("2d").drawImage(lienzoDeSlide(s), 0, 0, 240, cv.height);
    b.appendChild(cv);
    const t = document.createElement("div");
    t.textContent = `${i + 1}. ${s.nombre}`;
    b.appendChild(t);
    b.onclick = () => { editor.actual = i; editor.selId = null; refrescarTodo(); };
    cont.appendChild(b);
  });
}

/* ---------- Insertar imágenes ---------- */
function miniaturaDe(c) {
  const m = document.createElement("canvas");
  m.height = 160; m.width = Math.round(160 * c.width / c.height);
  m.getContext("2d").drawImage(c, 0, 0, m.width, m.height);
  return m.toDataURL("image/png");
}
/* Foto de producto nueva: se guarda en la lámina actual y se coloca como elemento de producto */
function agregarFotoProducto(foto) {
  const s = slideActual();
  s.fotos = (s.fotos || estado.productos).slice();
  s.minis = (s.minis || estado.miniaturas).slice();
  s.fotos.push(foto);
  s.minis.push(miniaturaDe(foto));
  const i = s.fotos.length - 1, h = 900, w = h * foto.width / foto.height;
  const p = elem("producto", { foto: i, x: W / 2 - w / 2, y: H - 80 - h, w, h, sombra: true });
  s.elementos.push(p);
  editor.selId = p.id;
}

/* ---------- Edición de texto con doble clic (caja encima del lienzo) ---------- */
function editarTexto(e) {
  const lz = $("lienzo"), wrap = lz.parentElement;
  const d = dimsSlide(slideActual()), k = lz.clientWidth / d.w;
  if (wrap.querySelector(".edicion-texto")) return;
  guardar();
  e.ocultoEditor = true;
  redibujarLienzo();
  const ta = document.createElement("textarea");
  ta.className = "edicion-texto";
  ta.value = e.texto;
  Object.assign(ta.style, {
    position: "absolute", left: (lz.offsetLeft + e.x * k) + "px", top: (lz.offsetTop + e.y * k) + "px",
    width: (e.w * k) + "px", height: (e.tam * e.lh * k * 1.2) + "px",
    fontSize: (e.tam * k) + "px", fontWeight: String(e.peso), lineHeight: String(e.lh),
    fontFamily: FUENTE, color: e.color, textAlign: e.alin,
    background: "rgba(255,255,255,.55)", border: "2px dashed " + MARINO, borderRadius: "6px",
    outline: "none", padding: "0", margin: "0", resize: "none", overflow: "hidden",
    transform: `rotate(${e.rot || 0}deg)`, transformOrigin: "center center", zIndex: 5
  });
  wrap.appendChild(ta);
  ta.focus(); ta.select();
  const ajustar = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
  ta.addEventListener("input", () => { e.texto = ta.value; redibujarLienzo(); ajustar(); });
  ta.addEventListener("keydown", (ev) => { if (ev.key === "Escape") ta.blur(); });
  ta.addEventListener("blur", () => {
    delete e.ocultoEditor;
    ta.remove();
    refrescarTodo();
  });
  ajustar();
}

/* ---------- Panel de propiedades ---------- */
function renderPropiedades() {
  const cont = $("props");
  cont.innerHTML = "";
  const s = slideActual();
  const e = seleccionado();
  const agregar = (n) => cont.appendChild(n);
  const titulo = (t) => { const h = document.createElement("h3"); h.textContent = t; agregar(h); };
  const campo = (etq, ctl) => { const l = document.createElement("label"); l.textContent = etq; l.appendChild(ctl); agregar(l); };
  const boton = (texto, fn, clase) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn sec " + (clase || ""); b.textContent = texto; b.onclick = fn; agregar(b);
  };
  const ctl = (tag, attrs, fn) => {
    const c = document.createElement(tag);
    Object.assign(c, attrs);
    c.addEventListener("focus", guardar);
    const val = () => (c.type === "checkbox" ? c.checked : c.value);
    c.addEventListener("input", () => { fn(val()); redibujarLienzo(); });
    c.addEventListener("change", () => { fn(val()); renderMiniaturas(); redibujarLienzo(); });
    return c;
  };
  const selectDe = (lista, actual, fn) => {
    const sel = document.createElement("select");
    lista.forEach(([v, t]) => sel.add(new Option(t, v)));
    sel.value = String(actual);
    sel.addEventListener("focus", guardar);
    sel.addEventListener("change", () => { fn(sel.value); renderMiniaturas(); redibujarLienzo(); });
    return sel;
  };
  const cargarArchivo = (accion) => {
    const f = document.createElement("input");
    f.type = "file"; f.accept = "image/*";
    f.addEventListener("change", async () => {
      const file = f.files[0];
      if (!file) return;
      try { const img = await archivoAImagen(file); guardar(); await accion(img); refrescarTodo(); }
      catch (err) { error(err.message); }
      f.value = "";
    });
    return f;
  };
  /* Botón que abre el selector de archivos y luego ejecuta la acción con la imagen */
  const botonArchivo = (texto, accion) => {
    const f = cargarArchivo(accion);
    f.hidden = true;
    agregar(f);
    boton(texto, () => f.click());
  };

  if (!e) {
    titulo(`Lámina ${editor.actual + 1}: ${s.nombre}`);
    campo("Color de fondo", ctl("input", { type: "color", value: s.fondo || BLANCO }, (v) => { s.fondo = v; }));
    const principal = s.elementos.find((x) => x.tipo === "imagen" && x.fondo);
    if (principal) {
      botonArchivo("Cambiar imagen de fondo", (img) => { principal.img = img; });
    } else {
      botonArchivo("Insertar imagen de fondo", (img) => { s.elementos.unshift(imagenEl(img, { fondo: true })); });
    }
    boton("+ Agregar texto", () => {
      guardar();
      const t = txt({ texto: "Nuevo texto", x: 300, y: 300, w: 700, tam: 60, peso: 800, color: AZUL });
      s.elementos.push(t); editor.selId = t.id; refrescarTodo();
    });
    botonArchivo("+ Insertar imagen", (img) => {
      const w = 700, h = w * (img.naturalHeight || img.height) / (img.naturalWidth || img.width);
      const el = imagenEl(img, { x: (W - w) / 2, y: (H - h) / 2, w, h });
      s.elementos.push(el); editor.selId = el.id;
    });
    botonArchivo("+ Insertar foto de producto", async (img) => {
      agregarFotoProducto(recortarProducto(img));
    });
    boton("+ Agregar foto de producto existente", () => {
      guardar();
      const p = productoEl(0, 600, 960, 900);
      s.elementos.push(p); editor.selId = p.id; refrescarTodo();
    });
    const ayuda = document.createElement("p");
    ayuda.className = "ayuda";
    ayuda.textContent = "Haz clic en un elemento para seleccionarlo y arrástralo para moverlo. Las esquinas cambian su tamaño y la manija de arriba lo rota. Doble clic en un texto para editarlo. Ctrl+Z deshace.";
    agregar(ayuda);
    return;
  }

  titulo(etiquetaTipo(e));
  if (e.tipo === "texto") {
    const ta = document.createElement("textarea");
    ta.value = e.texto;
    ta.addEventListener("focus", guardar);
    ta.addEventListener("input", () => { e.texto = ta.value; redibujarLienzo(); });
    ta.addEventListener("change", renderMiniaturas);
    campo("Contenido", ta);
    campo("Tamaño", ctl("input", { type: "number", min: 10, max: 260, value: Math.round(e.tam) }, (v) => { e.tam = +v || e.tam; }));
    campo("Grosor", selectDe([[400, "Normal"], [600, "Semibold"], [800, "Negrita"]], e.peso, (v) => { e.peso = +v; }));
    campo("Color", ctl("input", { type: "color", value: e.color }, (v) => { e.color = v; }));
    campo("Alineación", selectDe([["left", "Izquierda"], ["center", "Centro"], ["right", "Derecha"]], e.alin, (v) => { e.alin = v; }));
    campo("Ancho del texto", ctl("input", { type: "number", min: 80, max: 1900, value: Math.round(e.w) }, (v) => { e.w = +v || e.w; }));
    campo("Sombra", ctl("input", { type: "checkbox", checked: !!e.sombra }, (v) => { e.sombra = v; }));
  }
  if (e.tipo === "rect" || e.tipo === "circulo" || e.tipo === "poli") {
    campo("Color", ctl("input", { type: "color", value: typeof e.relleno === "string" ? e.relleno : AZUL }, (v) => { e.relleno = v; }));
    if (e.tipo === "rect") campo("Esquinas redondeadas", ctl("input", { type: "number", min: 0, max: 600, value: e.radio || 0 }, (v) => { e.radio = +v; }));
  }
  if (e.tipo === "imagen") {
    botonArchivo("Reemplazar imagen", (img) => { e.img = img; });
    if (e.pts) campo("Tinte azul", ctl("input", { type: "checkbox", checked: !!e.tinte }, (v) => { e.tinte = v; }));
  }
  if (e.tipo === "producto") {
    const tira = document.createElement("div");
    tira.className = "tira-fotos";
    const fotosS = slideActual().fotos || estado.productos, minisS = slideActual().minis || estado.miniaturas;
    fotosS.forEach((c, i) => {
      const im = document.createElement("img");
      im.src = minisS[i];
      im.className = e.foto === i ? "act" : "";
      im.title = "Foto " + (i + 1);
      im.onclick = () => {
        guardar();
        const cx = e.x + e.w / 2;
        e.foto = i; e.w = anchoPorAlto(i, e.h, fotosS); e.x = cx - e.w / 2;
        refrescarTodo();
      };
      tira.appendChild(im);
    });
    agregar(tira);
    campo("Alto", ctl("input", { type: "number", min: 80, max: 1400, value: Math.round(e.h) }, (v) => {
      const base = e.y + e.h, cx = e.x + e.w / 2;
      e.h = +v || e.h; e.w = anchoPorAlto(e.foto, e.h, fotosS); e.x = cx - e.w / 2; e.y = base - e.h;
    }));
    campo("Sombra", ctl("input", { type: "checkbox", checked: !!e.sombra }, (v) => { e.sombra = v; }));
  }
  if (e.tipo === "icono") {
    campo("Símbolo", selectDe(Object.keys(ICONOS).map((k) => [k, k]), e.clave, (v) => { e.clave = v; }));
    campo("Color", selectDe([[AZUL, "Azul"], [BLANCO, "Blanco"]], e.color, (v) => { e.color = v; }));
  }
  campo("Rotación (°)", ctl("input", { type: "number", min: -180, max: 180, step: 1, value: Math.round(e.rot || 0) }, (v) => { e.rot = +v || 0; }));

  const fila = document.createElement("div");
  fila.className = "fila";
  agregar(fila);
  const botonFila = (texto, fn, clase) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn sec " + (clase || ""); b.textContent = texto; b.onclick = fn;
    fila.appendChild(b);
  };
  botonFila("Al frente", () => {
    guardar(); const a = s.elementos; a.splice(a.indexOf(e), 1); a.push(e); refrescarTodo();
  });
  botonFila("Atrás", () => {
    guardar(); const a = s.elementos; a.splice(a.indexOf(e), 1); a.unshift(e); refrescarTodo();
  });
  botonFila("Eliminar", eliminarSeleccion, "peligro");
}

function etiquetaTipo(e) {
  return { texto: "Texto", imagen: "Imagen", producto: "Foto del producto", icono: "Icono", rect: "Rectángulo", circulo: "Círculo", poli: "Forma" }[e.tipo] || "Elemento";
}

function eliminarSeleccion() {
  const s = slideActual(), e = seleccionado();
  if (!e) return;
  guardar();
  s.elementos = s.elementos.filter((x) => x !== e);
  editor.selId = null;
  refrescarTodo();
}

/* ---------- Mouse / tacto sobre el lienzo ---------- */
function coordsLienzo(ev) {
  const r = $("lienzo").getBoundingClientRect();
  const d = dimsSlide(slideActual());
  return { x: (ev.clientX - r.left) * d.w / r.width, y: (ev.clientY - r.top) * d.h / r.height };
}
function iniciarEditor() {
  const lienzo = $("lienzo");
  lienzo.width = W; lienzo.height = H;

  lienzo.addEventListener("pointerdown", (ev) => {
    const p = coordsLienzo(ev), s = slideActual(), sel = seleccionado();
    let modo = null;
    if (sel && !sel.fondo) {
      if (distancia(p, manijaRotacion(sel)) <= RADIO_MANIJA) {
        modo = { tipo: "rot", e: sel };
      } else {
        const k = ESQUINAS.findIndex((_, i) => distancia(p, esquinaMundo(sel, i)) <= RADIO_MANIJA);
        if (k >= 0) {
          const [sx, sy] = ESQUINAS[k];
          // La esquina opuesta queda fija mientras se arrastra esta
          const F = aMundo(sel, -sx * sel.w / 2, -sy * sel.h / 2);
          modo = { tipo: "esc", e: sel, sx, sy, F, w0: sel.w, h0: sel.h, tam0: sel.tam, rot0: sel.rot || 0 };
        }
      }
    }
    if (!modo) {
      const h = elementoEn(s, p.x, p.y);
      editor.selId = h ? h.id : null;
      if (h && !h.fondo) modo = { tipo: "mover", e: h, dx: p.x - h.x, dy: p.y - h.y };
    }
    if (modo) { guardar(); editor.modo = modo; lienzo.setPointerCapture(ev.pointerId); }
    renderPropiedades();
    redibujarLienzo();
  });

  lienzo.addEventListener("pointermove", (ev) => {
    const m = editor.modo;
    if (!m) return;
    const p = coordsLienzo(ev), e = m.e;
    if (m.tipo === "mover") {
      e.x = p.x - m.dx; e.y = p.y - m.dy;
    } else if (m.tipo === "rot") {
      const c = centroE(e);
      let g = Math.atan2(p.y - c.y, p.x - c.x) * 180 / Math.PI + 90;
      g = ((g + 180) % 360 + 360) % 360 - 180;
      if (ev.shiftKey) g = Math.round(g / 15) * 15;
      if (Math.abs(g) < 2) g = 0;
      e.rot = Math.round(g * 10) / 10;
    } else if (m.tipo === "esc") {
      const t = m.rot0 * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
      const vx = p.x - m.F.x, vy = p.y - m.F.y;
      const lx = vx * co + vy * si, ly = -vx * si + vy * co; // posición del puntero en el marco del elemento
      if (e.tipo === "texto" || e.tipo === "producto" || e.tipo === "circulo") {
        // Escala uniforme: el texto cambia también su tamaño de letra
        const f = Math.max(40 / m.w0, lx * m.sx / m.w0);
        e.w = m.w0 * f; e.h = m.h0 * f;
        if (e.tipo === "texto") e.tam = Math.max(10, m.tam0 * f);
      } else {
        e.w = Math.max(40, lx * m.sx);
        e.h = Math.max(30, ly * m.sy);
      }
      // El centro queda a mitad de camino entre la esquina fija y la que se arrastra
      const cx = m.F.x + (m.sx * e.w / 2) * co - (m.sy * e.h / 2) * si;
      const cy = m.F.y + (m.sx * e.w / 2) * si + (m.sy * e.h / 2) * co;
      e.x = cx - e.w / 2; e.y = cy - e.h / 2;
    }
    redibujarLienzo();
  });

  const terminar = () => {
    if (!editor.modo) return;
    editor.modo = null;
    renderMiniaturas();
    renderPropiedades();
  };
  lienzo.addEventListener("pointerup", terminar);
  lienzo.addEventListener("pointercancel", terminar);

  lienzo.addEventListener("dblclick", (ev) => {
    const p = coordsLienzo(ev), h = elementoEn(slideActual(), p.x, p.y);
    if (h && h.tipo === "texto") { editor.selId = h.id; editarTexto(h); }
  });

  document.addEventListener("keydown", (ev) => {
    if (!$("secEditor") || $("secEditor").hidden) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); deshacer(); return; }
    const e = seleccionado();
    if (!e) return;
    if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); eliminarSeleccion(); return; }
    const paso = ev.shiftKey ? 10 : 2;
    const mov = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[ev.key];
    if (mov) {
      ev.preventDefault();
      if (!ev.repeat) guardar();
      e.x += mov[0]; e.y += mov[1];
      redibujarLienzo();
    }
  });
}
