# Despliegue de BioCenso (rama `prueba`)

Arquitectura en la nube:

```
Firebase Hosting (frontend)  ──HTTPS──▶  Railway: backend (Node)  ──▶  Railway: PostgreSQL
biocenso-ucc-2026.web.app                    │
                                             └──▶  Railway: ai-service (FastAPI + Gemini)
```

El frontend **solo** se publica compilado con `VITE_USE_BACKEND=true`. Sin backend, la app guarda todo
en el navegador y cualquiera entra con cualquier contraseña; `vite.config.js` bloquea esa compilación.

## 1. Railway: crear el proyecto

En [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `Sezzzo2/BioCenso`.
Crea **tres** servicios en el mismo proyecto:

| Servicio | Cómo crearlo | Settings → Source |
|---|---|---|
| `Postgres` | **+ New → Database → PostgreSQL** | — |
| `backend` | **+ New → GitHub Repo** | Branch `prueba`, Root Directory `/backend` |
| `ai-service` | **+ New → GitHub Repo** | Branch `prueba`, Root Directory `/ai-service` |

Cada carpeta trae su `railway.json` (comando de arranque y chequeo `/health`).
Si ya existe un servicio que publica el **frontend** desde la raíz del repo, bórralo: el frontend vive en Firebase.

## 2. Crear el esquema de la base

La base de Railway nace vacía. Ejecuta `backend/database/schema.sql` en ella
(Postgres → **Data → Query**, o con `psql` usando la URL pública de **Connect**).
Sin este paso el backend responde `no existe la función fn_...`.

## 3. Variables del servicio `ai-service`

| Variable | Valor |
|---|---|
| `GEMINI_API_KEY` | Una clave **nueva** de Google AI Studio (la anterior quedó publicada; revócala) |
| `GEMINI_MODEL` | Opcional. Modelo que se prueba primero; si está saturado se usan los de respaldo |
| `PORT` | `8000` (fijo, para que el backend sepa dónde llamarlo) |

En **Settings → Networking** no generes dominio público: el backend lo llama por la red privada
(por eso arranca escuchando en `::`, que acepta IPv4 e IPv6).

## 4. Variables del servicio `backend`

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia; Railway la completa) |
| `JWT_SECRET` | 32+ caracteres aleatorios **nuevos**: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `2h` |
| `FRONTEND_ORIGIN` | `https://biocenso-ucc-2026.web.app,https://biocenso-ucc-2026.firebaseapp.com` |
| `TRUST_PROXY` | `true` |
| `AI_SERVICE_URL` | `http://${{ai-service.RAILWAY_PRIVATE_DOMAIN}}:8000` |
| `AI_TIMEOUT_MS` | `170000` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Credenciales **nuevas** de Cloudinary |

Luego **Settings → Networking → Generate Domain** en `backend`. Comprueba:

- `https://<dominio-backend>/health` → `{"estado":"ok"}`
- `https://<dominio-backend>/health/db` → muestra la hora del servidor
- `https://<dominio-backend>/health/ai-service` → `"clave_configurada": true`

## 5. Compilar y publicar el frontend en Firebase

En `frontend/.env.production` pon la URL del backend terminada en `/api`:

```
VITE_USE_BACKEND=true
VITE_API_URL=https://<dominio-backend>/api
```

Desde la raíz del repo:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
firebase deploy --only hosting
```

Si `VITE_API_URL` falta, no es `https` o apunta a `localhost`, la compilación se detiene con un mensaje.

Para GitHub Pages (workflow `deploy-prueba.yml`) define la variable de repositorio `VITE_API_URL`
en **Settings → Secrets and variables → Actions → Variables** y agrega su dominio a `FRONTEND_ORIGIN`.

## 6. Comprobar que el problema quedó resuelto

1. Abre el sitio en una ventana privada: iniciar sesión con un correo inventado debe fallar.
2. Crea dos cuentas, registra una finca con la primera y entra con la segunda: no debe verla
   (abrir `/fincas/<id>` de la otra cuenta muestra "Finca no encontrada").
3. Sube un censo MP4 de menos de 20 MB: aparece en el historial de esa finca.
