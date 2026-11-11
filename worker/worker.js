// Intermediario seguro para la app de fichas SMC.
// Usa solo servicios gratuitos de Cloudflare (Workers AI), sin claves de pago.
//
// Rutas:
//   POST /api/extraer  -> Workers AI lee el spec sheet (Excel/CSV convertido a texto) y devuelve la ficha JSON
//   POST /api/sugerir  -> Workers AI sugiere las 4 características principales (Excel/CSV)
//   POST /api/imagen   -> Workers AI (SDXL) genera el ambiente de cocina sin producto

const MODELO_TEXTO_GRATIS = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const SOLO_EXCEL = "Por ahora la lectura gratuita solo funciona con Excel o CSV. Sube el Excel del spec sheet o escribe las 4 características a mano.";

const MARCAS_WORKER = {
  smc: { nombre: "SMC", regla: "solo el código que empieza con SMC, sin el código del proveedor", ejemplo: "SMCETO750N" },
  midea: { nombre: "Midea", regla: "solo el código del modelo de la marca Midea, sin el código del proveedor", ejemplo: "código del modelo Midea" }
};
// Rellena los datos de la marca en el prompt
function promptPara(plantilla, marca) {
  const m = MARCAS_WORKER[marca] || MARCAS_WORKER.smc;
  return plantilla.split("{MARCA}").join(m.nombre).split("{REGLA_CODIGO}").join(m.regla).split("{EJEMPLO_CODIGO}").join(m.ejemplo);
}

const PROMPT_EXTRAER = `Eres un redactor técnico de Cresa Retail para fichas comerciales de electrodomésticos {MARCA}.
Lee el spec sheet y responde SOLO con un objeto JSON válido (sin texto extra, sin markdown) con esta forma:
{
  "modelo": "{REGLA_CODIGO}; ejemplo: {EJEMPLO_CODIGO}",
  "tipo": "nombre corto del producto en minúscula, por ejemplo tostadora 2 panes",
  "inverter": true o false (true solo si el spec sheet indica tecnología inverter),
  "subtitulo_ficha": "frase corta en español sobre el producto",
  "categoria": "tipo de producto: refrigeradora, lavadora, cocina, aire acondicionado, etc.",
  "portada": { "titulo": "REFRIGERACIÓN {MARCA}", "texto": "1 o 2 frases comerciales para la portada" },
  "escenas": {
    "portada": "ambiente SIN producto donde se usa este tipo de producto, en una frase (ej. cocina moderna de noche con isla de mármol)",
    "beneficios_1_2": "ambiente SIN producto para las características 1 y 2",
    "beneficios_3_4": "ambiente SIN producto para las características 3 y 4"
  },
  "beneficios": [ { "titulo": "...", "texto": "2 frases de 15 a 25 palabras: qué es y qué gana el cliente" } ],
  "datos_destacados": [ { "valor": "43 dB", "etiqueta": "Nivel de ruido" } ],
  "despacho": [ { "etiqueta": "...", "valor": "...", "icono": "..." } ]
}
Reglas:
- Escribe todo en español. No uses palabras en inglés (por ejemplo "housing", "cool-touch" o "inverter" fuera del campo inverter). Si el spec sheet trae un término en inglés, dilo con palabras simples en español.
- Explica cada beneficio con palabras que entienda cualquier cliente, sin jerga técnica sin explicar.
- Las características que te indico SÍ las tiene el producto. Nunca escribas que el producto no cuenta con ellas, ni que no las tiene, ni frases de contraste como "pero sigue siendo". Escribe siempre en positivo: qué hace la característica y qué gana el cliente.
- Si el spec sheet no detalla una característica, explica su beneficio general en palabras sencillas, sin inventar cifras ni datos técnicos.
- "modelo": {REGLA_CODIGO}.
- "beneficios" debe tener exactamente 4 elementos, en el MISMO orden de las características que te indican abajo. El título es la característica (puedes pulirla), y el texto describe el beneficio para el cliente usando solo datos del spec sheet.
- "escenas": el ambiente debe corresponder a la categoría. Refrigeradora o congelador: interior de cocina moderna de noche, con encimera de mármol oscuro, gabinetes de madera y luz LED cálida bajo los gabinetes. Lavadora o secadora: lavandería moderna con iluminación cálida. Aire acondicionado: sala o dormitorio. Describe solo el ambiente interior, nunca el producto, y nunca calles, exteriores ni ciudades.
- "datos_destacados": exactamente 4 elementos que sean características ADICIONALES, distintas de las 4 principales (ej. capacidad, potencia, nivel de ruido, dimensiones, número de niveles). "valor" corto: una cifra o una palabra. Nunca "Sí" ni "No". Si el spec sheet no alcanza, usa menos elementos.
- "despacho" son los datos logísticos y técnicos del spec sheet (marca, modelo, tipo, tecnología, eficiencia, capacidad neta, distribución de capacidad, medidas del producto, peso neto, medidas de caja, peso bruto, voltaje/frecuencia, refrigerante, unidades por contenedor, potencia). Máximo 15 elementos. Combina peso neto y bruto en una sola línea si hace falta. "valor" puede tener saltos de línea con \\n.
- "icono" debe ser uno de: tag, modelo, qr, tipo, tech, energia, capacidad, medidas, peso, caja, voltaje, refrigerante, contenedor, potencia, default.
- No inventes datos que no estén en el spec sheet. Si un dato no existe, omítelo.

Características principales que el usuario definió (en este orden):`;

const PROMPT_SUGERIR = `Lee el spec sheet y responde SOLO con JSON válido: {"caracteristicas": ["...", "...", "...", "..."]}.
Propón las 4 características principales más vendedoras del producto, en español (sin palabras en inglés), con títulos cortos de 2 a 4 palabras
(ej. "Panel digital exterior", "Apagado automático"). Usa solo datos del spec sheet.`;

const ORIGENES_PERMITIDOS = [
  "https://cdizquierdoc.github.io",
  "https://cdizquierdoc-hub.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

function cabecerasCors(origen) {
  const permitido = ORIGENES_PERMITIDOS.includes(origen);
  return {
    "Access-Control-Allow-Origin": permitido ? origen : ORIGENES_PERMITIDOS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const cors = cabecerasCors(request.headers.get("Origin") || "");
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "Método no permitido" }, 405, cors);

    const url = new URL(request.url);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "JSON inválido" }, 400, cors);
    }

    try {
      if (url.pathname === "/api/extraer") return await extraer(body, env, cors);
      if (url.pathname === "/api/imagen") return await imagen(body, env, cors);
      if (url.pathname === "/api/sugerir") return await sugerir(body, env, cors);
      if (url.pathname === "/api/datos") return await datos(body, env, cors);
      return json({ error: "Ruta no encontrada" }, 404, cors);
    } catch (e) {
      return json({ error: "Error interno: " + (e && e.message ? e.message : String(e)) }, 500, cors);
    }
  },
};

// Llama al modelo de texto gratuito de Workers AI
async function textoIA(env, instruccion, specTexto, maxTokens) {
  if (!env.AI) throw new Error("Falta el binding AI (Workers AI) en el Worker");
  const res = await env.AI.run(MODELO_TEXTO_GRATIS, {
    messages: [
      { role: "system", content: "Responde solo con JSON válido, sin texto extra ni markdown." },
      { role: "user", content: "Spec sheet (Excel/CSV convertido a texto):\n" + String(specTexto).slice(0, 40000) + "\n\n" + instruccion },
    ],
    max_tokens: maxTokens,
  });
  const salida = res && (res.response !== undefined ? res.response : res.result && res.result.response);
  return typeof salida === "string" ? salida : JSON.stringify(salida || "");
}

// Deja solo el código que empieza con SMC (el otro es del proveedor)
function codigoSMC(t, marca) {
  if (marca === "midea") return String(t || "").trim();
  const m = String(t || "").match(/SMC[A-Z0-9-]+/i);
  return m ? m[0].toUpperCase() : String(t || "").trim();
}

// Toma el primer objeto {...} de la respuesta, aunque venga con texto alrededor
function extraerJson(texto) {
  const ini = texto.indexOf("{"), fin = texto.lastIndexOf("}");
  if (ini === -1 || fin <= ini) return null;
  try { return JSON.parse(texto.slice(ini, fin + 1)); } catch (e) { return null; }
}

async function extraer(body, env, cors) {
  const { caracteristicas, texto_spec } = body;
  if (!texto_spec) return json({ error: SOLO_EXCEL }, 400, cors);
  if (!Array.isArray(caracteristicas) || caracteristicas.length !== 4 || caracteristicas.some((c) => !c || !String(c).trim())) {
    return json({ error: "Se requieren exactamente 4 características" }, 400, cors);
  }
  const lista = caracteristicas.map((c, i) => `${i + 1}) ${String(c).trim()}`).join("\n");
  const texto = await textoIA(env, promptPara(PROMPT_EXTRAER, body.marca) + "\n" + lista, texto_spec, 2500);
  const ficha = extraerJson(texto);
  if (ficha) { ficha.modelo = codigoSMC(ficha.modelo, body.marca); ficha.inverter = ficha.inverter === true; }
  if (!ficha) return json({ error: "La IA gratuita no devolvió una ficha válida. Respuesta: " + texto.slice(0, 200) }, 502, cors);
  return json({ ficha }, 200, cors);
}

async function sugerir(body, env, cors) {
  const { texto_spec } = body;
  if (!texto_spec) return json({ error: SOLO_EXCEL }, 400, cors);
  const texto = await textoIA(env, PROMPT_SUGERIR, texto_spec, 400);
  const parsed = extraerJson(texto);
  if (!parsed || !Array.isArray(parsed.caracteristicas) || parsed.caracteristicas.length < 4) {
    return json({ error: "La IA gratuita no sugirió 4 características. Respuesta: " + texto.slice(0, 200) }, 502, cors);
  }
  return json({ caracteristicas: parsed.caracteristicas.slice(0, 4).map((c) => String(c)) }, 200, cors);
}

// Datos del producto para el correo de bienvenida: código, categoría, 4 características y texto de presentación
const CATEGORIAS_DATOS = ["Refrigeradora", "Congelador", "Minibar", "Lavadora", "Cocina", "Aire acondicionado", "Minidomésticos", "Otro"];
const PROMPT_DATOS = `Lee el spec sheet y responde SOLO con JSON válido con esta forma:
{"modelo": "{REGLA_CODIGO}; ejemplo: {EJEMPLO_CODIGO}",
 "inverter": true o false,
 "categoria": "una sola de: Refrigeradora, Congelador, Minibar, Lavadora, Cocina, Aire acondicionado, Minidomésticos, Otro",
 "tipo": "nombre corto y específico del producto en minúscula, por ejemplo sanduchera 2 panes, tostadora, prensa tipo panini, refrigeradora",
 "caracteristicas": ["4 características principales de venta, de 2 a 4 palabras cada una"]}
Reglas: usa solo datos del spec sheet. Escribe en español, sin palabras en inglés. El tipo va en minúscula y sin el código del modelo.`;

async function datos(body, env, cors) {
  const { texto_spec } = body;
  if (!texto_spec) return json({ error: SOLO_EXCEL }, 400, cors);
  const texto = await textoIA(env, promptPara(PROMPT_DATOS, body.marca), texto_spec, 700);
  const parsed = extraerJson(texto);
  if (!parsed) return json({ error: "La IA gratuita no devolvió los datos. Respuesta: " + texto.slice(0, 200) }, 502, cors);
  const cat = String(parsed.categoria || "");
  const categoria = CATEGORIAS_DATOS.find((c) => cat.toLowerCase().includes(c.toLowerCase().split(" ")[0])) || "Otro";
  const caracteristicas = (Array.isArray(parsed.caracteristicas) ? parsed.caracteristicas : []).slice(0, 4).map((c) => String(c));
  return json({
    modelo: codigoSMC(parsed.modelo, body.marca),
    inverter: parsed.inverter === true,
    categoria,
    caracteristicas,
    tipo: String(parsed.tipo || "").trim(),
    presentacion: ""
  }, 200, cors);
}

async function imagen(body, env, cors) {
  const { ambiente, prompt } = body;
  if (!prompt && !ambiente) return json({ error: "Falta el prompt" }, 400, cors);
  return await imagenWorkersAI(ambiente || prompt, env, cors);
}

// Ambiente vacío con Workers AI (gratis). La app pega encima la foto real del producto.
async function imagenWorkersAI(ambiente, env, cors) {
  if (!env.AI) return json({ error: "Falta el binding AI (Workers AI) en el Worker" }, 500, cors);
  const prompt = "Fotografía profesional de la pared frontal de una cocina moderna y luminosa, espacio libre y piso despejado frente a la pared, sin isla, sin mesa, sin barra, " +
    "horizontal, de borde a borde, " +
    "iluminación cálida y elegante, tonos madera oscura y mármol, enfoque nítido y realista. " +
    "Sin personas, sin electrodomésticos, sin texto ni logotipos, sin bordes ni márgenes. " +
    "Espacio despejado en el centro y a la derecha para colocar un producto. Escena de cocina residencial, no un baño: " + ambiente;
  const negativo = "isla de cocina, mesa en primer plano, encimera en primer plano, barra, taburetes, perspectiva diagonal, cruce de mesa, oscuro, muy oscuro, sala de estar, sofá, sillón, living, televisor, mueble de TV, comedor de sala, estantería de libros, chimenea, dormitorio, cama, sofá, sala de estar, habitación, cuarto, oficina, baño, bañera, tina, ducha, lavabo, azulejos de baño, espejo de baño, " +
    "personas, gente, texto, letras, logotipo, marca de agua, calle, ciudad, exterior, " +
    "edificio urbano, vista a la calle, autos, borroso, dibujo, caricatura, ilustración, collage, " +
    "marco, bordes, distorsionado, electrodoméstico, refrigeradora, lavadora";
  const res = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
    prompt, negative_prompt: negativo, width: 1344, height: 768
  });
  if (res && typeof res.image === "string") {
    return json({ imagen_base64: res.image, media_type: "image/png", incluye_producto: false }, 200, cors);
  }
  const bytes = new Uint8Array(await new Response(res).arrayBuffer());
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return json({ imagen_base64: btoa(binario), media_type: "image/png", incluye_producto: false }, 200, cors);
}
