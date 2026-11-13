/* ==========================================================================
   Base: constantes de marca, datos demo, iconos, utilidades y motor de elementos
   ========================================================================== */
const W = 1920, H = 1080;
const AZUL = "#47A9E4", MARINO = "#263A76", BLANCO = "#FFFFFF";
const FUENTE = "Montserrat, Arial, sans-serif";
const NOMBRES_LAMINA = ["Portada", "Beneficios 1 y 2", "Beneficios 3 y 4", "Las 4 características", "Ficha para despachos", "Respaldo", "Cierre"];

/* Datos de referencia (SMCRF14TMGO) para el modo demo */
const FICHA_DEMO = {
  modelo: "SMCRF14TMGO",
  tipo: "refrigeradora",
  inverter: true,
  categoria: "refrigeradora",
  subtitulo_ficha: "Tecnología, frescura y comodidad en un solo lugar.",
  subtitulos_beneficios: ["Control táctil en el exterior y compresor de velocidad variable: frío estable con menos consumo de energía.", "Dispensador de agua fría y 434 litros de capacidad neta para organizar la compra de toda la semana."],
  portada: { titulo: "REFRIGERACIÓN SMC", texto: "La nueva SMCRF14TMGO combina diseño moderno, gran capacidad y funciones pensadas para hacer tu día a día más práctico." },
  beneficios: [
    { titulo: "Panel digital exterior", corto: "Pantalla táctil en la puerta para ajustar el frío de cada compartimento sin abrirla.", texto: "Sensor de temperatura en cada compartimento y pantalla táctil en la puerta. Ajustas el frío sin abrir el refrigerador, así se conserva el aire frío y baja el consumo." },
    { titulo: "Ahorro de energía", corto: "Compresor inverter que consume solo la energía que necesita en cada momento.", texto: "Compresor inverter de velocidad variable: modula su potencia según la carga real, en vez de encenderse y apagarse. Mantiene la temperatura estable con menor consumo eléctrico." },
    { titulo: "Dispensador de agua", corto: "Dispensador frontal de agua fría con filtro de fácil reemplazo.", texto: "Dispensador frontal con agua fría sin abrir la puerta. Su filtro de fácil reemplazo retiene impurezas para entregar agua limpia de forma continua." },
    { titulo: "Gran capacidad", corto: "434 litros netos para organizar la compra de toda la semana.", texto: "434 litros de capacidad neta con estantes ajustables y cajones de acceso frontal. Distribuye la compra por zonas de temperatura y aprovecha cada nivel." }
  ],
  despacho: [
    { etiqueta: "Marca", valor: "SMC", icono: "tag" },
    { etiqueta: "Modelo", valor: "SMCRF14TMGO", icono: "modelo" },
    { etiqueta: "Código de producto", valor: "22031020012162", icono: "qr" },
    { etiqueta: "Tipo", valor: "Congelador superior", icono: "tipo" },
    { etiqueta: "Tecnología", valor: "Inverter", icono: "tech" },
    { etiqueta: "Eficiencia energética", valor: "Clase A", icono: "energia" },
    { etiqueta: "Capacidad neta", valor: "434 L", icono: "capacidad" },
    { etiqueta: "Distribución de capacidad", valor: "Refrigerador: 302 L\nCongelador: 107 L", icono: "capacidad" },
    { etiqueta: "Tamaño del producto", valor: "Alto: 172,3 cm\nAncho: 70 cm\nProfundidad: 69,1 cm", icono: "medidas" },
    { etiqueta: "Peso neto / bruto", valor: "66,7 kg / 75 kg", icono: "peso" },
    { etiqueta: "Tamaño de la caja", valor: "Alto: 177 cm\nAncho: 75,5 cm\nProfundidad: 71 cm", icono: "caja" },
    { etiqueta: "Voltaje / frecuencia", valor: "115 V / 60 Hz", icono: "voltaje" },
    { etiqueta: "Refrigerante", valor: "R600a / 58 g", icono: "refrigerante" },
    { etiqueta: "Unidades por contenedor 40HQ", valor: "2 en tránsito\n3 en bodega", icono: "contenedor" },
    { etiqueta: "Potencia", valor: "120 W", icono: "potencia" }
  ],
  datos_destacados: [{ valor: "43 dB", etiqueta: "Nivel de ruido" }, { valor: "302 L", etiqueta: "Espacio refrigerador" }, { valor: "107 L", etiqueta: "Espacio congelador" }, { valor: "Clase A", etiqueta: "Eficiencia" }],
  escenas: {
    portada: "interior de cocina moderna de noche, con gabinetes de madera oscura, encimera de mármol y luz LED cálida bajo los gabinetes.",
    beneficios_1_2: "interior de cocina moderna de noche con encimera de mármol oscuro, grifo de bronce y estantes iluminados con plantas.",
    beneficios_3_4: "interior de cocina moderna con isla de madera oscura, luz LED cálida y repisas con frascos y utensilios de cocina."
  }
};
const CARACTERISTICAS_DEMO = ["Panel digital exterior", "Ahorro de energía", "Dispensador de agua", "Gran capacidad"];

/* Iconos de línea (64×64) */
const ICONOS = {
  touch: '<rect x="18" y="8" width="28" height="48" rx="5"/><circle cx="32" cy="26" r="6"/><path d="M26 44h12"/>',
  energy: '<path d="M36 6 18 36h14l-4 22 18-30H32z"/>',
  inverter: '<rect x="20" y="18" width="24" height="28" rx="5"/><path d="M34 24l-5 9h6l-5 9"/><path d="M12 30v-6a16 16 0 0 1 16-16h8"/><path d="M52 34v6a16 16 0 0 1-16 16h-8"/>',
  drop: '<path d="M32 8c10 14 18 24 18 34a18 18 0 0 1-36 0c0-10 8-20 18-34z"/><path d="M28 40a4 4 0 0 0 4 4"/>',
  expand: '<path d="M8 8h14M8 8v14M56 8H42M56 8v14M8 56h14M8 56V42M56 56H42M56 56V42"/>',
  snow: '<path d="M32 6v52M10 19l44 26M10 45l44-26"/><path d="M24 10l8 6 8-6M24 54l8-6 8 6"/>',
  thermo: '<path d="M26 12a6 6 0 0 1 12 0v28a10 10 0 1 1-12 0z"/><path d="M32 26v18"/>',
  volume: '<path d="M10 24h10l14-12v40L20 40H10z"/><path d="M44 24l12 16M56 24 44 40"/>',
  tag: '<path d="M8 10h22l26 26-22 22L8 32z"/><circle cx="20" cy="22" r="3"/>',
  box: '<path d="M32 8l22 12v24L32 56 10 44V20z"/><path d="M10 20l22 12 22-12M32 32v24"/>',
  scale: '<path d="M12 22h40l4 34H8z"/><path d="M24 22a8 8 0 0 1 16 0"/>',
  ruler: '<path d="M10 46 46 10l8 8-36 36z"/><path d="M22 34l6 6M30 26l6 6M38 18l6 6"/>',
  plug: '<path d="M24 8v14M40 8v14M16 22h32v12a16 16 0 0 1-32 0z"/><path d="M32 50v6"/>',
  wind: '<path d="M8 24h36a8 8 0 1 0-8-8M8 40h44a8 8 0 1 1-8 8M8 32h24"/>',
  shield: '<path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z"/><path d="M22 32l7 7 13-14"/>',
  container: '<path d="M10 22l22-10 22 10v22L32 54 10 44z"/><path d="M10 22l22 10 22-10M32 32v22"/>',
  tech: '<circle cx="32" cy="32" r="9"/><path d="M32 8v12M32 44v12M8 32h12M44 32h12M16 16l8 8M40 40l8 8M48 16l-8 8M24 40l-8 8"/>',
  eject: '<rect x="12" y="20" width="32" height="26" rx="4"/><path d="M48 33h10M52 27l6 6-6 6"/>',
  grill: '<rect x="10" y="18" width="44" height="12" rx="3"/><rect x="10" y="36" width="44" height="12" rx="3"/><path d="M18 30v6M28 30v6M38 30v6M46 30v6"/>',
  sandwich: '<path d="M10 40h44v6a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z"/><path d="M10 40c0-14 8-22 22-22s22 8 22 22"/>',
  waffle: '<rect x="12" y="12" width="40" height="40" rx="4"/><path d="M12 22h40M12 32h40M12 42h40M22 12v40M32 12v40M42 12v40"/>',
  toaster: '<rect x="10" y="30" width="44" height="22" rx="5"/><path d="M20 30V16h9v14M35 30V16h9v14M48 40h2"/>',
  pan: '<circle cx="28" cy="34" r="16"/><path d="M44 30h12M22 34l4 4 8-8"/>',
  gear: '<circle cx="32" cy="32" r="9"/><circle cx="32" cy="32" r="20" stroke-dasharray="6 5"/><path d="M32 8v6M32 50v6M8 32h6M50 32h6"/>',
  timer: '<circle cx="32" cy="34" r="20"/><path d="M32 34l7 7M26 8h12M32 8v6"/>',
  steam: '<path d="M22 46V30c-4-4 4-8 0-12M32 46V24c-4-4 4-8 0-12M42 46V30c-4-4 4-8 0-12"/><path d="M14 56h36"/>',
  pot: '<path d="M10 28h40v14a14 14 0 0 1-14 14H24A14 14 0 0 1 10 42z"/><path d="M50 34h6M18 20c0-4 4-4 4-8M30 20c0-4 4-4 4-8"/>',
  blender: '<path d="M18 14h28l4 26H14z"/><rect x="14" y="44" width="36" height="10" rx="2"/><path d="M26 22h12"/>',
  coffee: '<path d="M14 26h28v16a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12z"/><path d="M42 30h4a6 6 0 0 1 0 12h-4M10 56h36"/>',
  bulb: '<path d="M24 40a16 16 0 1 1 16 0v4H24z"/><path d="M26 52h12M28 58h8"/>',
  power: '<path d="M32 8v22"/><path d="M20 18a18 18 0 1 0 24 0"/>',
  tray: '<rect x="8" y="30" width="48" height="8" rx="3"/><path d="M14 38v8h36v-8"/><path d="M20 18q12 8 24 0"/>',
  sparkle: '<path d="M32 8l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"/>',
  levels: '<rect x="12" y="38" width="8" height="16"/><rect x="28" y="28" width="8" height="26"/><rect x="44" y="16" width="8" height="38"/>',
  star: '<path d="M32 8l7 16 17 2-13 12 4 17-15-9-15 9 4-17L8 26l17-2z"/>'
};
const ICONO_DESPACHO = { tag: "tag", modelo: "tech", qr: "tech", tipo: "box", tech: "inverter", energia: "energy", capacidad: "expand", medidas: "ruler", peso: "scale", caja: "box", voltaje: "plug", refrigerante: "wind", contenedor: "container", potencia: "energy" };
/* Icono según la palabra clave. Cada característica toma el primer icono de su lista que aún no se use en la lámina o el correo */
const REGLAS_ICONOS = [
  [/cancel/i, ["power", "toaster"]],
  [/apagad|autoapag|desconect/i, ["timer", "power"]],
  [/extra[ií]ble|desmont|removib/i, ["eject"]],
  [/sanduch|s[aá]ndwich|\bpanes?\b|wafle|waffle/i, ["sandwich", "waffle"]],
  [/panini|prensa|parrilla|plancha|grill/i, ["grill"]],
  [/tostad|rebanad/i, ["toaster"]],
  [/antiadher|anti-adher|no se pega|no adher/i, ["pan"]],
  [/atasc/i, ["gear"]],
  [/temporiz|tiempo|minuto|reloj|programa/i, ["timer"]],
  [/vapor/i, ["steam"]],
  [/olla|cocci|cocin|horne/i, ["pot"]],
  [/licu|batid/i, ["blender"]],
  [/caf[eé]/i, ["coffee"]],
  [/\bluz|\bled\b|indicador|lumin/i, ["bulb"]],
  [/potencia|watt|\d\s?w\b/i, ["energy", "power"]],
  [/bandeja|goteo|recolect|migaja/i, ["tray", "sparkle"]],
  [/limpi|lavable/i, ["sparkle"]],
  [/niveles?\b/i, ["levels"]],
  [/temperatura|termostat/i, ["thermo", "touch"]],
  [/digital|pantalla|display|t[aá]ctil|panel/i, ["touch"]],
  [/inverter|tecnolog|autom[aá]tic/i, ["inverter", "tech"]],
  [/silencio|ruido|sonid|mudo/i, ["volume"]],
  [/agua|dispens|hidrat/i, ["drop"]],
  [/capacidad|espacio|gran|volumen|litro|almacen/i, ["expand", "container"]],
  [/fr[ií]o|enfri|congela|nofrost|fresc|temperatura/i, ["snow"]],
  [/energ|eficien|clase|ahorro/i, ["energy"]],
  [/garant|respaldo|seguridad|protec/i, ["shield"]],
  [/peso|kg\b/i, ["scale"]],
  [/medid|tama|alto|ancho|profund|dimension/i, ["ruler"]],
  [/volt|frecuencia|hz/i, ["plug"]],
  [/refrig|gas/i, ["wind"]],
  [/caja|empaque|contenedor|unidades/i, ["box", "container"]]
];
const POOL_ICONOS = ["tag", "tech", "container", "box", "shield", "expand", "touch", "energy", "inverter", "drop", "volume", "snow", "thermo", "wind", "plug", "scale", "ruler", "sparkle", "tray", "bulb", "power", "levels", "timer", "pot", "blender", "coffee", "steam", "gear", "waffle", "grill", "sandwich", "eject", "pan", "toaster"];
function asignarIconos(textos) {
  const usados = new Set();
  return textos.map((t) => {
    const regla = REGLAS_ICONOS.find(([re]) => re.test(t || ""));
    let k = regla ? (regla[1].find((x) => !usados.has(x)) || regla[1][0]) : null;
    if (!k) k = POOL_ICONOS.find((x) => !usados.has(x)) || "tag";
    usados.add(k);
    return k;
  });
}
function claveIcono(texto) { return asignarIconos([texto])[0]; }
const iconosListos = {};
async function precargarIconos() {
  const tareas = [];
  for (const clave of Object.keys(ICONOS)) {
    for (const color of [BLANCO, AZUL]) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="${color}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${ICONOS[clave]}</svg>`;
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      tareas.push(img.decode().catch(() => {}).then(() => { iconosListos[clave + "|" + color] = img; }));
    }
  }
  await Promise.all(tareas);
}
function icono(clave, color) {
  return iconosListos[clave + "|" + color] || iconosListos["star|" + color];
}

/* Utilidades de canvas y texto */
const MEDIR = document.createElement("canvas").getContext("2d");
function nuevoLienzo(w = W, h = H) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
/* Tamaño de una lámina: las fichas usan 1920×1080; el correo puede tener otro tamaño */
function dimsSlide(s) { return { w: (s && s.w) || W, h: (s && s.h) || H }; }
function fuente(ctx, peso, tam) { ctx.font = `${peso} ${tam}px ${FUENTE}`; }
function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function poligono(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function envolver(ctx, texto, maxW) {
  const salida = [];
  for (const parrafo of String(texto || "").split("\n")) {
    const palabras = parrafo.split(/\s+/).filter(Boolean);
    if (!palabras.length) { salida.push(""); continue; }
    let linea = "";
    for (const p of palabras) {
      const prueba = linea ? linea + " " + p : p;
      if (!linea || ctx.measureText(prueba).width <= maxW) linea = prueba;
      else { salida.push(linea); linea = p; }
    }
    salida.push(linea);
  }
  return salida;
}
function ajustarLinea(ctx, texto, peso, maxW, max, min) {
  for (let s = max; s >= min; s -= 2) {
    fuente(ctx, peso, s);
    if (ctx.measureText(texto).width <= maxW) return s;
  }
  return min;
}
function ajustarBloque(ctx, texto, peso, maxW, maxH, max, min, lh) {
  for (let s = max; s >= min; s -= 2) {
    fuente(ctx, peso, s);
    const lineas = envolver(ctx, texto, maxW);
    const cabe = lineas.every((l) => ctx.measureText(l).width <= maxW + 0.5);
    if (cabe && lineas.length * s * lh <= maxH) return { tam: s, lineas, lh, peso };
  }
  fuente(ctx, peso, min);
  return { tam: min, lineas: envolver(ctx, texto, maxW), lh, peso };
}
/* Ajuste para los constructores de láminas: tamaño que cabe en el bloque */
function fit(texto, peso, maxW, maxH, max, min, lh) { return ajustarBloque(MEDIR, texto, peso, maxW, maxH, max, min, lh); }

function cargarImagen(src) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error("No se pudo cargar " + src));
    img.src = src;
  });
}
function archivoAImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error("Imagen no válida: " + archivo.name));
    img.src = url;
  });
}
function archivoABase64(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(",")[1]);
    lector.onerror = () => rechazar(new Error("No se pudo leer " + archivo.name));
    lector.readAsDataURL(archivo);
  });
}

/* Recorte del producto: si ya tiene transparencia la usa; si no, quita el fondo liso desde los bordes */
function recortarProducto(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const datos = ctx.getImageData(0, 0, w, h);
  const d = datos.data;
  let transparentes = 0;
  for (let i = 3; i < d.length; i += 4 * 37) if (d[i] < 250) transparentes++;
  if (transparentes > (w * h / 37) * 0.02) return c;

  const r0 = d[0], g0 = d[1], b0 = d[2];
  const esFondo = (p) => {
    const i = p * 4;
    return Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) < 90;
  };
  const visto = new Uint8Array(w * h);
  const pila = [];
  for (let x = 0; x < w; x++) { pila.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { pila.push(y * w, y * w + w - 1); }
  while (pila.length) {
    const p = pila.pop();
    if (visto[p] || !esFondo(p)) continue;
    visto[p] = 1;
    d[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) pila.push(p - 1);
    if (x < w - 1) pila.push(p + 1);
    if (y > 0) pila.push(p - w);
    if (y < h - 1) pila.push(p + w);
  }
  ctx.putImageData(datos, 0, 0);
  return c;
}

/* Ambiente de respaldo (sin IA) */
function escenaRespaldo(tipo) {
  const c = nuevoLienzo(), ctx = c.getContext("2d");
  if (tipo === "portada") {
    const g = ctx.createRadialGradient(1400, 300, 80, 1200, 500, 1300);
    g.addColorStop(0, "#5a3d25"); g.addColorStop(0.5, "#241913"); g.addColorStop(1, "#0d0a08");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#dcecf8"); g.addColorStop(1, "#7fb8e0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  return c;
}

/* ==========================================================================
   Modelo de elementos: cada lámina es una lista de elementos editables.
   tipos: imagen, texto, rect, circulo, poli, producto, icono
   ========================================================================== */
let ID_ELEMENTO = 0;
function elem(tipo, o) { return Object.assign({ id: "e" + (++ID_ELEMENTO), tipo, x: 0, y: 0, w: 0, h: 0 }, o); }
function txt(o) {
  return elem("texto", Object.assign({ texto: "", tam: 40, peso: 800, color: BLANCO, alin: "left", lh: 1.2, sombra: false, w: 600 }, o));
}
function imagenEl(img, o) {
  return elem("imagen", Object.assign({ img, x: 0, y: 0, w: W, h: H, tinte: false, fondo: false }, o));
}
function anchoPorAlto(i, h) {
  const p = estado.productos[i] || estado.productos[0];
  return h * p.width / p.height;
}
function productoEl(i, h, cx, base) {
  const w = anchoPorAlto(i, h);
  return elem("producto", { foto: i, x: cx - w / 2, y: base - h, w, h, sombra: true });
}
/* Panel en chevron (mitad derecha de la lámina) con el ambiente tintado en azul */
const CHEVRON_DER = [[0.0483, 0], [1, 0], [1, 1], [0.0483, 1], [0.3129, 0.5]];
function panelChevron(img) {
  return imagenEl(img, { x: 760, y: 0, w: 1160, h: H, pts: CHEVRON_DER, tinte: false, fondo: true, aclarar: true });
}

function mapPts(e, pts) { return pts.map(([u, v]) => [e.x + u * e.w, e.y + v * e.h]); }
function rutaForma(ctx, e) {
  if (e.tipo === "circulo") { ctx.beginPath(); ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, 0, Math.PI * 2); }
  else if (e.pts) poligono(ctx, mapPts(e, e.pts));
  else if (e.radio) rrect(ctx, e.x, e.y, e.w, e.h, e.radio);
  else { ctx.beginPath(); ctx.rect(e.x, e.y, e.w, e.h); }
}
function colorRelleno(ctx, e) {
  const r = e.relleno || AZUL;
  if (typeof r === "string") return r;
  const g = ctx.createLinearGradient(e.x + r.lineal[0] * e.w, e.y + r.lineal[1] * e.h, e.x + r.lineal[2] * e.w, e.y + r.lineal[3] * e.h);
  r.stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}
function dibujarForma(ctx, e) {
  ctx.save();
  if (e.sombra) { ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; }
  rutaForma(ctx, e);
  ctx.fillStyle = colorRelleno(ctx, e);
  ctx.fill();
  if (e.borde) { ctx.shadowColor = "transparent"; ctx.lineWidth = e.borde.ancho; ctx.strokeStyle = e.borde.color; ctx.stroke(); }
  ctx.restore();
}
function dibujarImagen(ctx, e) {
  ctx.save();
  rutaForma(ctx, e);
  ctx.clip();
  if (e.aclarar) ctx.filter = "brightness(1.3) contrast(0.92)";
  drawCover(ctx, e.img, e.x, e.y, e.w, e.h);
  ctx.filter = "none";
  if (e.tinte) {
    ctx.globalCompositeOperation = "color";
    ctx.fillStyle = "rgba(71,169,228,.92)"; ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(71,169,228,.25)"; ctx.fillRect(e.x, e.y, e.w, e.h);
  }
  ctx.restore();
}
function dibujarTexto(ctx, e) {
  fuente(ctx, e.peso, e.tam);
  const lineas = envolver(ctx, e.texto, e.w);
  e.h = lineas.length * e.tam * e.lh;
  ctx.save();
  ctx.fillStyle = e.color; ctx.textAlign = e.alin; ctx.textBaseline = "alphabetic";
  if (e.sombra) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 16; }
  const ax = e.alin === "center" ? e.x + e.w / 2 : e.alin === "right" ? e.x + e.w : e.x;
  lineas.forEach((l, i) => ctx.fillText(l, ax, e.y + e.tam * 0.95 + i * e.tam * e.lh));
  ctx.restore();
}
function dibujarProducto(ctx, e, fotos) {
  const img = fotos[e.foto] || fotos[0];
  if (!img) return;
  if (e.sombra) {
    // Sombra de contacto: el producto se apoya en una superficie
    const cx = e.x + e.w / 2, base = e.y + e.h;
    ctx.save();
    ctx.translate(cx, base - e.h * 0.03 + 4);
    ctx.scale(1, 0.12);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.w * 0.62);
    g.addColorStop(0, "rgba(0,0,0,0.65)");
    g.addColorStop(0.6, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, e.w * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.drawImage(img, e.x, e.y, e.w, e.h);
}

/* Pinta una lámina completa (también la usan el editor, las miniaturas y la exportación) */
function pintarSlide(ctx, s) {
  const d = dimsSlide(s);
  ctx.fillStyle = s.fondo || BLANCO;
  ctx.fillRect(0, 0, d.w, d.h);
  for (const e of s.elementos) {
    if (e.tipo === "imagen") dibujarImagen(ctx, e);
    else if (e.tipo === "texto") dibujarTexto(ctx, e);
    else if (e.tipo === "rect" || e.tipo === "circulo" || e.tipo === "poli") dibujarForma(ctx, e);
    else if (e.tipo === "producto") dibujarProducto(ctx, e, s.fotos || estado.productos);
    else if (e.tipo === "icono") ctx.drawImage(icono(e.clave, e.color), e.x, e.y, e.w, e.h);
  }
}
function lienzoDeSlide(s) {
  const d = dimsSlide(s);
  const c = nuevoLienzo(d.w, d.h);
  pintarSlide(c.getContext("2d"), s);
  return c;
}

/* Marca de la ficha y del correo (SMC o Midea). Todo lo demás se mantiene igual */
const MARCAS = {
  smc: { nombre: "SMC", logo: "assets/logo_smc_blanco.png" },
  midea: { nombre: "Midea", logo: "assets/logo_midea_blanco.png" }
};
function marcaSeleccionada() {
  const s = document.getElementById("marca");
  return s && MARCAS[s.value] ? s.value : "smc";
}
function nombreMarca() { return MARCAS[marcaSeleccionada()].nombre; }
/* Cambia el nombre de la marca en un texto de la ficha (solo si la marca no es SMC) */
function marcaEnTexto(t) {
  const m = marcaSeleccionada();
  if (!t || m === "smc") return t;
  return String(t).replace(/\bSMC\b/g, MARCAS[m].nombre);
}
