/* ==========================================================================
   Editor tipo Canva: seleccionar, mover, cambiar tamaño, editar texto y fotos,
   agregar/eliminar elementos, ordenar capas y deshacer
   ========================================================================== */
const editor = { slides: [], actual: 0, selId: null, historial: [], modo: null };

function slideActual() { return editor.slides[editor.actual]; }
function seleccionado() {
  const s = slideActual();
  return (s && s.elementos.find((e) => e.id === editor.selId)) || null;
}
function elementoEn(s, px, py) {
  for (let i = s.elementos.length - 1; i >= 0; i--) {
    const e = s.elementos[i];
    if (px >= e.x && px <= e.x + e.w && py >= e.y && py <= e.y + e.h) return e;
  }
  return null;
}

function snapshot() {
  return editor.slides.map((s) => ({ nombre: s.nombre, fondo: s.fondo, elementos: s.elementos.map((e) => Object.assign({}, e)) }));
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
  const ctx = $("lienzo").getContext("2d");
  pintarSlide(ctx, s);
  const e = seleccionado();
  if (e) {
    ctx.save();
    ctx.setLineDash([14, 8]); ctx.lineWidth = 4; ctx.strokeStyle = MARINO;
    ctx.strokeRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12);
    ctx.setLineDash([]);
    if (!e.fondo) {
      ctx.fillStyle = BLANCO;
      ctx.fillRect(e.x + e.w - 14, e.y + e.h - 14, 28, 28);
      ctx.strokeRect(e.x + e.w - 14, e.y + e.h - 14, 28, 28);
    }
    ctx.restore();
  }
}

function renderMiniaturas() {
  const cont = $("miniaturas");
  cont.innerHTML = "";
  editor.slides.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mini-item" + (i === editor.actual ? " act" : "");
    const cv = document.createElement("canvas");
    cv.width = 240; cv.height = 135;
    cv.getContext("2d").drawImage(lienzoDeSlide(s), 0, 0, 240, 135);
    b.appendChild(cv);
    const t = document.createElement("div");
    t.textContent = `${i + 1}. ${s.nombre}`;
    b.appendChild(t);
    b.onclick = () => { editor.actual = i; editor.selId = null; refrescarTodo(); };
    cont.appendChild(b);
  });
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
      try { const img = await archivoAImagen(file); guardar(); accion(img); refrescarTodo(); }
      catch (err) { error(err.message); }
    });
    return f;
  };

  if (!e) {
    titulo(`Lámina ${editor.actual + 1}: ${s.nombre}`);
    campo("Color de fondo", ctl("input", { type: "color", value: s.fondo || BLANCO }, (v) => { s.fondo = v; }));
    const principal = s.elementos.find((x) => x.tipo === "imagen" && x.fondo);
    if (principal) campo("Cambiar imagen de fondo", cargarArchivo((img) => { principal.img = img; }));
    boton("+ Agregar texto", () => {
      guardar();
      const t = txt({ texto: "Nuevo texto", x: 300, y: 300, w: 700, tam: 60, peso: 800, color: AZUL });
      s.elementos.push(t); editor.selId = t.id; refrescarTodo();
    });
    boton("+ Agregar foto de producto", () => {
      guardar();
      const p = productoEl(0, 600, 960, 900);
      s.elementos.push(p); editor.selId = p.id; refrescarTodo();
    });
    const ayuda = document.createElement("p");
    ayuda.className = "ayuda";
    ayuda.textContent = "Haz clic en un elemento para editarlo. Arrástralo para moverlo y usa la esquina inferior derecha para cambiar su tamaño. Ctrl+Z deshace.";
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
    campo("Reemplazar imagen", cargarArchivo((img) => { e.img = img; }));
    if (e.pts) campo("Tinte azul", ctl("input", { type: "checkbox", checked: !!e.tinte }, (v) => { e.tinte = v; }));
  }
  if (e.tipo === "producto") {
    const tira = document.createElement("div");
    tira.className = "tira-fotos";
    estado.productos.forEach((c, i) => {
      const im = document.createElement("img");
      im.src = estado.miniaturas[i];
      im.className = e.foto === i ? "act" : "";
      im.title = "Foto " + (i + 1);
      im.onclick = () => {
        guardar();
        const cx = e.x + e.w / 2;
        e.foto = i; e.w = anchoPorAlto(i, e.h); e.x = cx - e.w / 2;
        refrescarTodo();
      };
      tira.appendChild(im);
    });
    agregar(tira);
    campo("Alto", ctl("input", { type: "number", min: 80, max: 1400, value: Math.round(e.h) }, (v) => {
      const base = e.y + e.h, cx = e.x + e.w / 2;
      e.h = +v || e.h; e.w = anchoPorAlto(e.foto, e.h); e.x = cx - e.w / 2; e.y = base - e.h;
    }));
    campo("Sombra", ctl("input", { type: "checkbox", checked: !!e.sombra }, (v) => { e.sombra = v; }));
  }
  if (e.tipo === "icono") {
    campo("Símbolo", selectDe(Object.keys(ICONOS).map((k) => [k, k]), e.clave, (v) => { e.clave = v; }));
    campo("Color", selectDe([[AZUL, "Azul"], [BLANCO, "Blanco"]], e.color, (v) => { e.color = v; }));
  }

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
  return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
}
function iniciarEditor() {
  const lienzo = $("lienzo");
  lienzo.width = W; lienzo.height = H;

  lienzo.addEventListener("pointerdown", (ev) => {
    const p = coordsLienzo(ev), s = slideActual(), sel = seleccionado();
    let modo = null;
    if (sel && !sel.fondo && Math.abs(p.x - (sel.x + sel.w)) <= 20 && Math.abs(p.y - (sel.y + sel.h)) <= 20) {
      modo = { tipo: "redim", e: sel, x0: p.x, y0: p.y, w0: sel.w, h0: sel.h, ratio: sel.h / sel.w };
    } else {
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
    if (m.tipo === "mover") { e.x = p.x - m.dx; e.y = p.y - m.dy; }
    else {
      const dx = p.x - m.x0, dy = p.y - m.y0;
      if (e.tipo === "texto") e.w = Math.max(120, m.w0 + dx);
      else if (e.tipo === "producto") { e.w = Math.max(60, m.w0 + dx); e.h = e.w * m.ratio; }
      else if (e.tipo === "circulo") { const d = Math.max(40, m.w0 + Math.max(dx, dy)); e.w = d; e.h = d; }
      else { e.w = Math.max(40, m.w0 + dx); e.h = Math.max(30, m.h0 + dy); }
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
