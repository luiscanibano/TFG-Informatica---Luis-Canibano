# FakeNews Insight — Extensión de navegador (MVP)

Extensión Manifest V3 (Chrome / Edge) que permite revisar textos y verificar
afirmaciones con evidencias FEVER sin abrir el dashboard.

## Funcionalidades v0.1.0

- Login con email / contraseña (la misma cuenta que en la web).
- Login con Google usando Supabase OAuth y `chrome.identity.launchWebAuthFlow`.
- Pegar texto manualmente o **usar la selección actual** de la pestaña.
- Llamada al backend (`/verify`) para extraer claims, buscar evidencias y
  mostrar veredicto global con cuota diaria.
- Botón **Verificar afirmaciones**: extrae claims, busca evidencias
  web y devuelve veredicto por afirmación con citas según los límites del plan.
- Entrada acotada: mínimo 80 caracteres en popup/selección y máximo 12.000
  caracteres en cliente; el backend aplica además el máximo real por plan.
- Sesión persistente en `chrome.storage.local` con refresco automático del JWT.

## Estructura

```
browser-extension/
├── manifest.json
├── icons/                 # icon16.png, icon48.png, icon128.png (placeholders)
├── lib/
│   ├── api.js             # Cliente del backend FastAPI
│   ├── config.js          # ⚠️ EDITA AQUÍ tus credenciales
│   ├── google-auth.js     # OAuth Google para la extension
│   ├── storage.js         # Wrapper de chrome.storage.local
│   └── supabase.js        # Login / refresh / signOut vía REST
└── popup/
    ├── popup.html
    ├── popup.css
    └── popup.js           # Router de vistas + handlers FEVER/NLI
```

## Configuración

Antes de cargar la extensión, edita
[`lib/config.js`](lib/config.js) con tus valores reales:

```js
SUPABASE_URL: "https://<tu-proyecto>.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",       // mismo VITE_SUPABASE_ANON_KEY que el frontend
ANALYSIS_API_BASE_URL: "https://api.fakenewsinsight.com",
ANALYSIS_API_ENABLE_FALLBACKS: false,     // activar solo en desarrollo controlado
WEB_REGISTER_URL: "https://<tu-proyecto>.pages.dev/register",
```

Si quieres que la extension reintente contra backends locales (`localhost`, `127.0.0.1`), actívalo manualmente con `ANALYSIS_API_ENABLE_FALLBACKS: true`. Para una versión distribuida a usuarios finales debe quedarse en `false`.

> El `anon key` de Supabase es público por diseño; la seguridad real reside en
> las políticas **RLS** de tu base de datos. No lo confundas con el
> `service_role` (ese sí es secreto y **nunca** debe ir en la extensión).

## Login con Google — requisitos para que funcione

La extensión ya puede iniciar sesión con Google, pero **no funcionará** si no
completas esta configuración antes de cargarla:

1. En `chrome://extensions`, carga la extensión una vez en modo desarrollador.
2. Copia el **ID de la extensión** que Chrome le asigna.
3. El redirect URI que usará la extensión será:

  `https://<TU_EXTENSION_ID>.chromiumapp.org/`

4. En Supabase Dashboard:
  - `Authentication -> Providers -> Google`: activa Google.
  - `Authentication -> URL Configuration -> Redirect URLs`: añade ese redirect.
5. En Google Cloud Console, dentro del cliente OAuth que usa Supabase para Google:
  - añade también `https://<TU_EXTENSION_ID>.chromiumapp.org/` como **Authorized redirect URI**
    si tu configuración de Google lo requiere.
6. Verifica que el usuario pueda iniciar sesión con Google en tu proyecto Supabase.

Si cambias el ID de la extensión porque vuelves a cargarla desde otra carpeta o
perfil del navegador, tendrás que repetir el paso del redirect URI.

## Cargar en local (Chrome / Edge)

1. Edita `lib/config.js` (ver arriba).
2. Ve a `chrome://extensions` (o `edge://extensions`).
3. Activa el **Modo desarrollador** (esquina superior derecha).
4. Pulsa **Cargar descomprimida** y selecciona la carpeta `browser-extension/`.
5. Copia el ID de la extensión y configura el redirect URI de Google/Supabase como se explica arriba.
6. Fija la extensión en la barra de herramientas para acceder rápido al popup.
7. Abre el popup y prueba tanto el login clásico como **Continuar con Google**.

## Iconos

La carpeta `icons/` contiene PNGs placeholder de 16, 48 y 128 px. Sustitúyelos
por el branding final antes de publicar.

## Backend — CORS

El backend FastAPI debe permitir orígenes `chrome-extension://<id>` para que las
peticiones desde el popup funcionen. Esta versión del repo ya incluye el regex
correspondiente en `fakenews-backend/main.py` (`CORSMiddleware`).

## Checklist rápida de instalación

Para que la extensión funcione completa al instalarla en local:

1. `lib/config.js` debe apuntar a tu Supabase y a tu backend reales.
2. El backend debe estar desplegado o accesible y responder en `/verify`.
3. En Supabase debe estar activado el proveedor Google.
4. El redirect `https://<EXTENSION_ID>.chromiumapp.org/` debe estar permitido en Supabase.
5. Si Google Cloud te lo exige, ese mismo redirect debe estar permitido en el cliente OAuth de Google.
6. Debes recargar la extensión tras cualquier cambio en `manifest.json`, `popup/` o `lib/`.

## Distribución

Para publicación en stores, genera primero el paquete de distribución con:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-store.ps1
```

Ese comando crea un ZIP listo para revisión en `browser-extension/dist/` y
elimina del manifiesto los permisos de backend local usados en desarrollo.

La guía completa para Chrome Web Store y Microsoft Edge Add-ons está en:

- [`../docs/browser-extension-store-publication.md`](../docs/browser-extension-store-publication.md)

Mientras no se publique en store, también puedes distribuir el ZIP manualmente
vía GitHub Releases.
