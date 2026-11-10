# Fichas comerciales SMC

App web (GitHub Pages) que genera la ficha de 6 láminas a partir del spec sheet, la foto del producto y 4 características.

Láminas:
1. Portada (ambiente lifestyle + producto)
2. Beneficios 1 y 2
3. Beneficios 3 y 4
4. Ficha para pedidos y despachos (con pastillas 1 año / 10 años sobre la refrigeradora)
5. Respaldo (fija)
6. Cierre (fija)

## Estructura

```
index.html          App (GitHub Pages)
assets/             Logo, láminas fijas, producto demo
worker/worker.js    Intermediario: guarda las claves de API (Claude y Gemini)
worker/wrangler.toml
```

Las claves NUNCA van en index.html ni en el repositorio. Viven como secretos en Cloudflare.

## 1. Publicar la app en GitHub Pages

1. Crea un repositorio público, por ejemplo `smc-fichas`.
2. Sube todo el contenido de esta carpeta (index.html, assets, worker, README).
3. En el repositorio: **Settings → Pages → Deploy from a branch → main / (root)**.
4. La app queda en `https://TU-USUARIO.github.io/smc-fichas/`.

Si tu usuario de GitHub es distinto de `cdizquierdoc` o `cdizquierdoc-hub`, agrega tu origen en `ORIGENES_PERMITIDOS` dentro de `worker/worker.js` (formato `https://TU-USUARIO.github.io`).

## 2. Publicar el intermediario en Cloudflare Workers (gratis)

Necesitas una cuenta de Cloudflare y Node.js instalado.

```bash
cd worker
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # pega tu clave de Anthropic
npx wrangler secret put GEMINI_API_KEY      # pega tu clave de Google AI Studio
npx wrangler deploy
```

`wrangler deploy` muestra una URL del tipo `https://smc-fichas-api.TU-CUENTA.workers.dev`.

## 3. Conectar la app

Abre la app, pega esa URL en **Configuración** y listo. El navegador la recuerda.

## 4. Usar

1. Sube el spec sheet (PDF o imagen) y la foto del producto.
2. Escribe las 4 características principales.
3. Clic en **Generar ficha**. Tarda aproximadamente 1 minuto (la IA genera 3 ambientes).
4. Descarga PDF o PowerPoint, o clic en una lámina para bajarla en PNG.

Si no quieres usar IA para algún ambiente, sube tu propia foto en la sección **Ambientes (opcional)**.

## Notas importantes

- **Producto integrado:** Gemini recibe la foto del producto como referencia y genera la escena completa (por ejemplo, la refri dentro de una cocina o la lavadora en una lavandería). Claude elige el ambiente según la categoría del spec sheet. Si la IA falla, la app usa un ambiente de respaldo y pega la foto real del producto encima.
- **Costos:** la generación de imágenes con Gemini y las llamadas a Claude cobran por uso. Revisa precios vigentes en Google AI Studio y en la consola de Anthropic.
- **Modelos:** si Google o Anthropic cambian el nombre del modelo, edita `worker/wrangler.toml` y vuelve a ejecutar `npx wrangler deploy`.
- **Modo demo:** el botón **Probar con datos demo** usa los datos de SMCRF14TMGO y no gasta API para leer el spec sheet. Sin URL del intermediario, los ambientes salen como degradados de respaldo.
