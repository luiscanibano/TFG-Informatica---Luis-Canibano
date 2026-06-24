# TFG — FakeNews Insight

Plataforma web para verificacion de afirmaciones con evidencias. El flujo
principal combina extraccion de claims, recuperacion web, inferencia FEVER/NLI,
adjudicacion semantica y agregacion de veredictos. El backend esta construido
con FastAPI y el frontend con React + Vite; Supabase gestiona autenticacion,
persistencia y RLS.

> Estado: **alpha** — frontend estatico en Cloudflare Pages y backend
> dockerizado en un VPS (OVHcloud u otro proveedor similar), con CI/CD desde
> GitHub Actions.

---

## Estructura del repositorio

```
.
├── fakenews-backend/      # FastAPI + agente FEVER/NLI (Dockerfile)
├── fakenews-frontend/     # React 19 + Vite + Tailwind
├── models/                # Modelo FEVER/NLI exportado para inferencia
├── deploy/vps/            # Compose, Caddy y scripts para desplegar el backend en VPS
├── .github/workflows/     # CI y deploy frontend/backend
├── docker-compose.yml     # Orquestación local
└── .env.example           # Variables necesarias para docker compose
```

---

## Requisitos

- **Docker Desktop** (recomendado para correrlo todo).
- *Opcionalmente, para desarrollo nativo:*
  - Python **3.11**
  - Node **20** (ver [.nvmrc](./.nvmrc))

---

## Arranque rápido (Docker)

```bash
cp .env.example .env       # rellenar SUPABASE_* y VITE_SUPABASE_*
docker compose up --build
```

- Frontend: <http://localhost:5173>
- Backend healthcheck: <http://localhost:8000/health>

---

## Desarrollo nativo

### Backend

```bash
cd fakenews-backend
python -m venv .venv && .venv\Scripts\activate    # Windows
pip install -r requirements-dev.txt
cp .env.example .env                              # rellenar valores
uvicorn main:app --reload
```

### Frontend

```bash
cd fakenews-frontend
npm install
cp .env.example .env                              # rellenar valores
npm run dev
```

---

## Variables de entorno

Cada subproyecto tiene su propio `.env.example`:

- [fakenews-backend/.env.example](fakenews-backend/.env.example)
- [fakenews-frontend/.env.example](fakenews-frontend/.env.example)
- [.env.example](.env.example) (raíz, usado por `docker compose`)

Para autenticación por email, el valor de `VITE_AUTH_SITE_URL` es obligatorio en despliegues reales.
Debe coincidir con la URL pública del frontend y con las `Redirect URLs` configuradas en Supabase para flujos como `reset-password`.

## Auth Emails

Los flujos de autenticación siguen usando Supabase Auth. El código de frontend solo construye los `redirectTo` y consume los enlaces; el envío real del correo y las plantillas activas se configuran en Supabase.

La implementación versionada para SMTP propio y plantillas en inglés está documentada en:

- [docs/auth-email-smtp-setup.md](docs/auth-email-smtp-setup.md)
- [docs/auth-email-templates/base-guidelines.md](docs/auth-email-templates/base-guidelines.md)

Plantillas incluidas en el repositorio:

- [docs/auth-email-templates/recovery.html](docs/auth-email-templates/recovery.html)
- [docs/auth-email-templates/recovery.txt](docs/auth-email-templates/recovery.txt)
- [docs/auth-email-templates/confirmation.html](docs/auth-email-templates/confirmation.html)
- [docs/auth-email-templates/confirmation.txt](docs/auth-email-templates/confirmation.txt)
- [docs/auth-email-templates/email-change.html](docs/auth-email-templates/email-change.html)
- [docs/auth-email-templates/email-change.txt](docs/auth-email-templates/email-change.txt)
- [docs/auth-email-templates/password-changed.html](docs/auth-email-templates/password-changed.html)
- [docs/auth-email-templates/password-changed.txt](docs/auth-email-templates/password-changed.txt)
- [docs/auth-email-templates/email-address-changed.html](docs/auth-email-templates/email-address-changed.html)
- [docs/auth-email-templates/email-address-changed.txt](docs/auth-email-templates/email-address-changed.txt)

Resumen operativo:

1. Configura un SMTP propio en Supabase, recomendado Resend.
2. Verifica SPF, DKIM y, si es posible, DMARC en el subdominio remitente.
3. Configura `Site URL` y `Redirect URLs` en Supabase para local y producción.
4. Copia las plantillas HTML/texto versionadas en este repositorio dentro de `Auth > Email Templates`.
5. Mantén los asuntos y el copy en inglés.

---

## CI/CD

- **CI** ([ci.yml](.github/workflows/ci.yml)): lint + smoke tests en cada PR.
- **Deploy backend** ([deploy-backend-vps.yml](.github/workflows/deploy-backend-vps.yml)):
  conecta por SSH al VPS, hace `git pull`, `git lfs pull` y recrea el stack Docker.
- **Deploy frontend** ([deploy-cloudflare-pages.yml](.github/workflows/deploy-cloudflare-pages.yml)):
  compila el frontend Vite y publica `dist/` en Cloudflare Pages.

El Dockerfile del frontend se mantiene para desarrollo local y validacion
containerizada, pero produccion sirve el artefacto estatico desde Cloudflare
Pages.

Para mantener el modelo FEVER/NLI grande, el backend se despliega completo en
un VPS con suficiente RAM y carga localmente el agente de verificacion dentro
del mismo proceso FastAPI.

Secrets/variables necesarios para despliegue:

- Backend VPS: `VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, `VPS_APP_DIR`.
- Frontend Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_PAGES_PROJECT_NAME`.
- Build frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_AUTH_SITE_URL`, `VITE_ANALYSIS_API_BASE_URL` apuntando al backend publico del VPS.

### Arquitectura: Cloudflare Pages + VPS

La app queda separada asi:

1. `Cloudflare Pages`: frontend React/Vite.
2. `VPS`: `fakenews-backend/` + Caddy como reverse proxy.
3. `fakenews-backend/` ejecuta `/verify` localmente cargando el modelo FEVER/NLI.

El VPS se levanta con [deploy/vps/docker-compose.yml](deploy/vps/docker-compose.yml)
y usa [deploy/vps/Caddyfile](deploy/vps/Caddyfile) para exponer el backend bajo
tu dominio (por ejemplo `api.fakenewsinsight.com`).

### Preparacion del VPS

1. Instala Docker, Docker Compose plugin, Git y Git LFS.
2. Clona el repo en `/opt/fakenews-insight`.
3. Copia [deploy/vps/.env.example](deploy/vps/.env.example) a `deploy/vps/.env`
  y rellena secrets/URLs reales.
  Ajusta `BACKEND_WORKER_REPLICAS` segun la CPU/RAM del VPS.
4. Ejecuta:

```bash
cd /opt/fakenews-insight
git lfs pull
docker compose -f deploy/vps/docker-compose.yml --env-file deploy/vps/.env up -d --build

# Ejemplo: levantar 3 workers FEVER en un VPS de 4 vCores / 8 GB RAM
docker compose -f deploy/vps/docker-compose.yml --env-file deploy/vps/.env up -d --build --scale backend-worker=3
```

### CI/CD del backend en VPS

El workflow [deploy-backend-vps.yml](.github/workflows/deploy-backend-vps.yml)
hace esto en cada push a `main` que toque backend/modelo:

1. Se conecta por SSH al VPS.
2. Ejecuta `deploy/vps/deploy.sh`.
3. Ese script hace `git pull`, `git lfs pull` y recrea el stack Docker,
   escalando `backend-worker` segun `BACKEND_WORKER_REPLICAS`.

Necesitas configurar en GitHub Actions estos secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_PRIVATE_KEY`
- `VPS_APP_DIR` (por ejemplo `/opt/fakenews-insight`)

---

## URLs

> - Frontend: `https://fakenewsinsight.com`
> - Backend:  `https://api.fakenewsinsight.com`
