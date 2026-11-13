// Intermediario seguro para la app de fichas SMC.
// Usa solo servicios gratuitos de Cloudflare (Workers AI), sin claves de pago.
//
// Rutas:
//   POST /api/extraer  -> Workers AI lee el spec sheet (Excel/CSV convertido a texto) y devuelve la ficha JSON
//   POST /api/sugerir  -> Workers AI sugiere las 4 características principales (Excel/CSV)
//   POST /api/imagen   -> Workers AI (SDXL) genera el ambiente de cocina sin producto

const MODELO_TEXTO_GRATIS = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const SOLO_EXCEL = "El spec sheet debe ser un archivo Excel (.xlsx). Súbelo o escribe las 4 características a mano.";

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
  "tipo": "nombre corto del producto en minúscula, por ejemplo sanduchera 2 panes",
  "inverter": true o false (true solo si el spec sheet indica tecnología inverter),
  "subtitulo_ficha": "frase corta en español sobre el producto",
  "categoria": "tipo específico del producto, por ejemplo sanduchera, refrigeradora, lavadora, aire acondicionado. Nunca escribas 'cocina' como categoría.",
  "portada": { "titulo": "TIPO DEL PRODUCTO EN MAYÚSCULAS seguido de {MARCA}, por ejemplo SANDUCHERA {MARCA}", "texto": "1 o 2 frases comerciales para la portada" },
  "escenas": {
    "portada": "ambiente SIN producto donde se usa este tipo de producto, en una frase (ej. cocina moderna de noche con isla de mármol)",
    "beneficios_1_2": "ambiente SIN producto para las características 1 y 2",
    "beneficios_3_4": "ambiente SIN producto para las características 3 y 4"
  },
  "subtitulos_beneficios": ["2 frases que resumen las características 1 y 2 juntas y su beneficio para el cliente", "2 frases que resumen las características 3 y 4 juntas y su beneficio para el cliente"],
  "beneficios": [ { "titulo": "...", "corto": "de 10 a 14 palabras que explican brevemente qué es o qué hace la característica, por ejemplo: Luz de encendido y luz de listo que indican el estado del equipo.", "texto": "de 20 a 26 palabras en 2 o 3 frases muy técnicas: nombra el componente o tecnología concreta (compresor inverter, sensor, ciclo de refrigeración, tipo de placa, material), su medida o nivel si el spec sheet lo trae, y qué logra el cliente" } ],
  "datos_destacados": [ { "valor": "43 dB", "etiqueta": "Nivel de ruido" } ],
  "despacho": [ { "etiqueta": "...", "valor": "...", "icono": "..." } ]
}
Reglas:
- Escribe todo en español. No uses palabras en inglés (por ejemplo "housing", "cool-touch" o "inverter" fuera del campo inverter). Si el spec sheet trae un término en inglés, dilo con palabras simples en español.
- Explica cada beneficio con palabras que entienda cualquier cliente, sin jerga técnica sin explicar.
- Las características que te indico SÍ las tiene el producto. Nunca escribas que el producto no cuenta con ellas, ni que no las tiene, ni frases de contraste como "pero sigue siendo". Escribe siempre en positivo: qué hace la característica y qué gana el cliente.
- Si el spec sheet no detalla una característica, explica su beneficio general en palabras sencillas, sin inventar cifras ni datos técnicos.
- "modelo": {REGLA_CODIGO}.
- El detalle técnico va en "texto": usa datos concretos del spec sheet (medidas, potencia, niveles, capacidad, materiales, tecnología) cuando existan. "corto" es solo una frase para la lámina de las 4 características.
- En datos_destacados, el espacio del refrigerador va siempre con el del congelador; si no están los dos, usa la capacidad total neta en litros. La eficiencia energética (Clase A) solo va si el spec sheet la indica.
- Antes de escribir cada característica, explica su función real en este tipo de producto, no solo repitas el nombre. Glosario de referencia: "Luces indicadoras" = luz de encendido (el equipo está conectado y funcionando) y luz de listo (las placas ya alcanzaron la temperatura para empezar a cocinar). "Control de temperatura automático" = termostato que mantiene la temperatura de cocción sin intervención. "Apagado automático" = el equipo se apaga solo al terminar la cocción o tras un tiempo sin uso. "Placas antiadherentes" = superficie que evita que la comida se pegue.
- Prohibido usar "permite", "permiten", "permitir" o "te permite" en cualquier texto. Explica con verbos concretos.
- En "despacho" nunca incluyas almacenamiento, ni "upright", ni nada en inglés. Si hay peso, usa la etiqueta "Peso" con el valor del peso; si no hay peso, no incluyas esa fila.
- Prohibido en cualquier texto: grill, ribbed, non-stick, knob, yes, no, premium y toda palabra en inglés que no sea nombre comercial. Usa en su lugar "placas acanaladas" o "antiadherentes".
- El spec sheet puede venir en inglés: tradúcelo todo al español (ej. Rated Power = Potencia; Plate Coating = Recubrimiento antiadherente; Opening Angles = Ángulo de apertura; Drip Tray = Bandeja recolectora de grasa; Cool-touch handle = Mango antiquemaduras; Product Type = tipo de producto). Si un dato dice "Not specified", omítelo.
- Todo en español, excepto los nombres comerciales de tipo de producto que se usan así en el mercado (Top Mount, Side by Side, Inverter). No uses palabras en inglés poco comunes en español (por ejemplo, upright): tradúcelas o, si son de almacenamiento, omítelas.
- Usa el nombre exacto del producto del spec sheet: si es sanduchera o prensa panini, escribe sanduchera, nunca tostadora ni tostador.
- Prohibido repetir muletillas como "lo que te permite", "esto te permite", "lo que permite" o "permite" en cada texto. Varía la redacción en cada característica.
- "subtitulos_beneficios" hablan solo de las 2 características de cada lámina, con un tono de venta y sin repetir el título.
- "beneficios" debe tener exactamente 4 elementos, en el MISMO orden de las características que te indican abajo. El título es la característica (puedes pulirla), y el texto describe el beneficio para el cliente usando solo datos del spec sheet.
- "escenas": el ambiente debe corresponder a la categoría. Refrigeradora o congelador: interior de cocina moderna de noche, con encimera de mármol oscuro, gabinetes de madera y luz LED cálida bajo los gabinetes. Lavadora, secadora, plancha de ropa o cualquier producto de lavado, secado o planchado: cuarto de lavado o lavandería moderna con iluminación cálida, con lavadora, secadora, cesto de ropa o tabla de planchar al fondo, nunca cocina. Aire acondicionado: sala o dormitorio. Describe solo el ambiente interior, nunca el producto, y nunca calles, exteriores ni ciudades.
- "datos_destacados": exactamente 4 elementos que sean características ADICIONALES, distintas de las 4 principales (ej. capacidad, potencia, nivel de ruido, número de niveles). Nunca medidas ni dimensiones de producto: esos datos van solo en despacho. "valor" corto: una cifra o una palabra. Nunca "Sí" ni "No". Si el spec sheet no alcanza, usa menos elementos.
- "despacho" es la lista completa de datos para pedidos y despachos. Recorre TODA la hoja y crea un elemento separado por cada dato que sirva para eso, sin juntar varios datos en uno. Revisa esta lista y añade cada uno que exista en el spec sheet: marca; modelo; código del producto (puede repetir el modelo); tipo; tecnología; eficiencia energética (solo si la hoja la indica); capacidad neta; distribución de capacidad (refrigerador y congelador juntos); voltaje/frecuencia; potencia; refrigerante; medidas del producto; medidas de la caja; medidas de la caja máster; peso neto/bruto o "Peso" si solo hay uno; unidades por contenedor 20GP, 40GP y 40HQ, cada una en su propio elemento. Si una celda trae varias medidas (producto, caja, máster), sepáralas en elementos distintos con etiquetas claras. Si un dato no existe o dice "Not specified", no lo incluyas. Máximo 15 elementos. "valor" puede tener saltos de línea con \\n solo si es un mismo dato largo.
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
  const esLavanderia = /lavand|lavad|secad|plancha|ropa/i.test(ambiente);
  const prompt = "Fotografía profesional de la pared frontal del interior descrito, luminoso, espacio libre y piso despejado frente a la pared, sin isla, sin mesa, sin barra, " +
    "horizontal, de borde a borde, " +
    "iluminación cálida y elegante, enfoque nítido y realista. " +
    "Sin personas, sin electrodomésticos, sin texto ni logotipos, sin bordes ni márgenes. " +
    "Espacio despejado en el centro y a la derecha para colocar un producto. Escena residencial interior, sin producto, que corresponda al tipo de producto: " + ambiente;
  const negativo = (esLavanderia ? "cocina, estufa, fregadero, encimera de mármol, " : "") + "isla de cocina, mesa en primer plano, encimera en primer plano, barra, taburetes, perspectiva diagonal, cruce de mesa, oscuro, muy oscuro, sala de estar, sofá, sillón, living, televisor, mueble de TV, comedor de sala, estantería de libros, chimenea, dormitorio, cama, sofá, sala de estar, habitación, cuarto, oficina, baño, bañera, tina, ducha, lavabo, azulejos de baño, espejo de baño, " +
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
