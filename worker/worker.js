// Intermediario seguro para la app de fichas SMC.
// Guarda las claves de API como secretos de Cloudflare (nunca en GitHub).
//
// Rutas:
//   POST /api/extraer  -> Claude lee el spec sheet (PDF o imagen) y devuelve JSON
//   POST /api/imagen   -> Gemini genera el ambiente lifestyle (sin producto)

const MODELO_TEXTO = "claude-sonnet-5-5";
const MODELO_IMAGEN_DEFAULT = "gemini-2.5-flash-image";

const PROMPT_EXTRAER = `Eres un redactor técnico de Cresa Retail para fichas comerciales de electrodomésticos SMC.
Lee el spec sheet adjunto y responde SOLO con un objeto JSON válido (sin texto extra, sin markdown) con esta forma:
{
  "modelo": "código exacto del modelo",
  "subtitulo_ficha": "frase corta de una línea sobre el producto",
  "categoria": "tipo de producto: refrigeradora, lavadora, cocina, aire acondicionado, etc.",
  "portada": { "titulo": "REFRIGERACIÓN SMC", "texto": "1 o 2 frases comerciales para la portada" },
  "escenas": {
    "portada": "ambiente SIN producto donde se usa este tipo de producto, en una frase (ej. cocina moderna de noche con isla de mármol)",
    "beneficios_1_2": "ambiente SIN producto para las características 1 y 2",
    "beneficios_3_4": "ambiente SIN producto para las características 3 y 4"
  },
  "beneficios": [ { "titulo": "...", "texto": "1 o 2 frases" } ],
  "datos_destacados": [ { "valor": "43 dB", "etiqueta": "Nivel de ruido" } ],
  "despacho": [ { "etiqueta": "...", "valor": "...", "icono": "..." } ]
}
Reglas:
- "beneficios" debe tener exactamente 4 elementos, en el MISMO orden de las características que te indican abajo. El título es la característica (puedes pulirla), y el texto debe describir beneficio al cliente usando solo datos del spec sheet.
- "escenas": el ambiente debe corresponder a la categoría. Refrigeradora o congelador: interior de cocina moderna de noche, con encimera de mármol oscuro, gabinetes de madera y luz LED cálida bajo los gabinetes. Lavadora o secadora: lavandería moderna con iluminación cálida. Aire acondicionado: sala o dormitorio. Describe solo el ambiente interior, nunca el producto, y nunca calles, exteriores ni ciudades.
- "datos_destacados" tiene exactamente 4 elementos (uno por característica, en el mismo orden). Pon una cifra clave del spec sheet relacionada con esa característica (ej. nivel de ruido, capacidad, consumo) o null si no hay ninguna.
- "despacho" son los datos logísticos y técnicos del spec sheet (marca, modelo, código, tipo, tecnología, eficiencia, capacidad neta, distribución de capacidad, medidas del producto, peso neto, medidas de caja, peso bruto, voltaje/frecuencia, refrigerante, unidades por contenedor, potencia). Máximo 15 elementos. Combina peso neto y bruto en una sola línea si hace falta. "valor" puede tener saltos de línea con \\n.
- "icono" debe ser uno de: tag, modelo, qr, tipo, tech, energia, capacidad, medidas, peso, caja, voltaje, refrigerante, contenedor, potencia, default.
- No inventes datos que no estén en el spec sheet. Si un dato no existe, omítelo.

Características principales que el usuario definió (en este orden):`;

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
      return json({ error: "Ruta no encontrada" }, 404, cors);
    } catch (e) {
      return json({ error: "Error interno: " + (e && e.message ? e.message : String(e)) }, 500, cors);
    }
  },
};

async function extraer(body, env, cors) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: "Falta ANTHROPIC_API_KEY en el Worker" }, 500, cors);
  const { archivo_base64, media_type, caracteristicas } = body;
  if (!archivo_base64 || !media_type) return json({ error: "Falta el spec sheet" }, 400, cors);
  if (!Array.isArray(caracteristicas) || caracteristicas.length !== 4 || caracteristicas.some((c) => !c || !String(c).trim())) {
    return json({ error: "Se requieren exactamente 4 características" }, 400, cors);
  }

  const bloqueArchivo =
    media_type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type, data: archivo_base64 } }
      : { type: "image", source: { type: "base64", media_type, data: archivo_base64 } };

  const lista = caracteristicas.map((c, i) => `${i + 1}) ${String(c).trim()}`).join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.TEXT_MODEL || MODELO_TEXTO,
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: [bloqueArchivo, { type: "text", text: PROMPT_EXTRAER + "\n" + lista }],
        },
      ],
    }),
  });

  const data = await resp.json();
  if (!resp.ok) return json({ error: "Claude: " + (data.error && data.error.message) }, 502, cors);

  const texto = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const limpio = texto.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  let ficha;
  try {
    ficha = JSON.parse(limpio);
  } catch (e) {
    return json({ error: "Claude no devolvió JSON válido", crudo: texto.slice(0, 500) }, 502, cors);
  }
  return json({ ficha }, 200, cors);
}

async function imagen(body, env, cors) {
  const { prompt, ambiente, referencia_base64, referencia_media } = body;
  if (!prompt && !ambiente) return json({ error: "Falta el prompt" }, 400, cors);
  // Por defecto usa Workers AI (plan gratuito de Cloudflare). Gemini solo si se activa IMAGE_PROVIDER=gemini.
  if (env.IMAGE_PROVIDER !== "gemini") return await imagenWorkersAI(ambiente || prompt, env, cors);
  if (!env.GEMINI_API_KEY) return json({ error: "Falta GEMINI_API_KEY en el Worker" }, 500, cors);
  const entrada = [];
  if (referencia_base64) {
    entrada.push({ inlineData: { mimeType: referencia_media || "image/png", data: referencia_base64 } });
  }
  entrada.push({ text: prompt });

  const modelo = env.IMAGE_MODEL || MODELO_IMAGEN_DEFAULT;
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: entrada }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );

  const data = await resp.json();
  if (!resp.ok) return json({ error: "Gemini: " + (data.error && data.error.message) }, 502, cors);

  const partes = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  const img = partes.find((p) => p.inlineData || p.inline_data);
  if (!img) return json({ error: "Gemini no devolvió imagen" }, 502, cors);
  const inl = img.inlineData || img.inline_data;
  return json({ imagen_base64: inl.data, media_type: inl.mimeType || inl.mime_type || "image/png" }, 200, cors);
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
  let bytes;
  if (res && typeof res.image === "string") {
    return json({ imagen_base64: res.image, media_type: "image/png", incluye_producto: false }, 200, cors);
  }
  bytes = new Uint8Array(await new Response(res).arrayBuffer());
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return json({ imagen_base64: btoa(binario), media_type: "image/png", incluye_producto: false }, 200, cors);
}
