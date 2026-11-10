# Despliegue de BioCenso (rama `main`)

```
Firebase Hosting (página)  ──HTTPS──▶  Railway: backend (Node)  ──▶  Neon: PostgreSQL
biocenso-ucc-2026.web.app                    │
                                             └──red privada + token──▶  Railway: ai-service (FastAPI + Gemini)
```

| Pieza | Dónde | URL |
|---|---|---|
| Página | Firebase Hosting | https://biocenso-ucc-2026.web.app |
| Backend | Railway, proyecto `jubilant-cat`, servicio `backend` | https://backend-production-87d9.up.railway.app |
| Servicio de IA | Railway, servicio `ai-service` | Sin URL pública: solo lo alcanza el backend por la red privada |
| Base de datos | Neon, proyecto `biocenso` | — |

Railway despliega solo cada vez que se hace push a `main`. Render (sección final) queda como respaldo.

La página se queda en Firebase. El frontend **solo** se publica compilado con `VITE_USE_BACKEND=true`:
sin backend, la app guarda todo en el navegador y cualquiera entra con cualquier contraseña.
`frontend/vite.config.js` detiene esa compilación.

## 1. Neon: base de datos

1. Crea una cuenta en [neon.tech](https://neon.tech) (puedes entrar con GitHub) y un proyecto
   `biocenso` en la región **AWS US West 2 (Oregon)**.
2. En **Connect**, copia la cadena de conexión *pooled* (empieza por `postgresql://`). No la pegues
   en el chat ni en archivos del repositorio.
3. Crea el esquema desde la carpeta `backend` (PowerShell):

   ```bash
   $env:DATABASE_URL="pega-aqui-la-cadena"; node scripts/crearEsquema.js
   ```

   Crea el esquema base si falta y aplica las migraciones de `backend/database/migraciones`.
   Debe terminar con `Listo: 28 funciones y procedimientos.` Se puede ejecutar de nuevo sin riesgo;
   hazlo cada vez que se agregue una migración, **antes** de publicar el backend que la necesita.

## 2. Railway: backend y servicio de IA

En un proyecto de Railway, dos servicios conectados al repositorio `Sezzzo2/BioCenso`, rama `main`:

| Servicio | Root Directory | Start command | Healthcheck |
|---|---|---|---|
| `backend` | `/backend` | `npm start` | `/health` |
| `ai-service` | `/ai-service` | `python -m app.servidor` | `/health` |

Ambos usan el builder Railpack (lo mismo dice el `railway.json` de cada carpeta).
`app/servidor.py` escucha en IPv4 e IPv6 a la vez: la red privada de Railway llega por IPv6 y el
healthcheck por IPv4, así que `uvicorn --host ::` sola hacía fallar el despliegue.

Variables (**Settings → Variables** de cada servicio):

| Servicio | Variable | Valor |
|---|---|---|
| `ai-service` | `GEMINI_API_KEY` | La clave de Google AI Studio |
| `ai-service` | `AI_SERVICE_TOKEN` | Un texto aleatorio largo |
| `ai-service` | `PORT` | `8000` |
| `backend` | `PORT` | `8080` (el dominio público apunta a ese puerto) |
| `backend` | `NODE_ENV` | `production` |
| `backend` | `DATABASE_URL` | La cadena de conexión de Neon |
| `backend` | `DB_SSL` | `true` |
| `backend` | `JWT_SECRET` | Un texto aleatorio de 32 caracteres o más |
| `backend` | `JWT_EXPIRES_IN` | `2h` |
| `backend` | `FRONTEND_ORIGIN` | `https://biocenso-ucc-2026.web.app,https://biocenso-ucc-2026.firebaseapp.com` |
| `backend` | `TRUST_PROXY` | `true` |
| `backend` | `AI_SERVICE_URL` | `http://${{ai-service.RAILWAY_PRIVATE_DOMAIN}}:8000` |
| `backend` | `AI_SERVICE_TOKEN` | `${{ai-service.AI_SERVICE_TOKEN}}` |
| `backend` | `AI_TIMEOUT_MS` | `600000` |
| `backend` | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Credenciales de Cloudinary (fotos de los bovinos) |

En `backend → Settings → Networking`, genera el dominio público con el puerto `8080`.

Comprueba con la URL del backend:
- `/health` → `{"estado":"ok"}`
- `/health/db` → muestra la hora del servidor
- `/health/ai-service` → `"clave_configurada": true`
- `/health/cloudinary` → las tres credenciales `definida`

Railway no tiene plan gratis permanente: usa el crédito de prueba y después pide el plan Hobby.

## 3. Firebase: publicar la página

En `frontend/.env.production` va la URL del backend terminada en `/api`:

```
VITE_USE_BACKEND=true
VITE_API_URL=https://backend-production-87d9.up.railway.app/api
```

Desde la raíz del repo:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
firebase deploy --only hosting
```

Si `VITE_API_URL` falta, no es `https` o apunta a `localhost`, la compilación se detiene.

Para GitHub Pages (workflow `deploy-prueba.yml`), define la variable de repositorio `VITE_API_URL`
en **Settings → Secrets and variables → Actions → Variables** y agrega su dominio a `FRONTEND_ORIGIN`.

## 4. Comprobar que el problema quedó resuelto

1. En una ventana privada, iniciar sesión con un correo inventado debe fallar.
2. Crea dos cuentas, registra una finca con la primera y entra con la segunda: no debe verla
   (abrir `/fincas/<id>` de la otra cuenta muestra "Finca no encontrada").
3. Sube un censo MP4 o una foto: aparece en el historial de esa finca.

## Respaldo: Render

`render.yaml` crea `biocenso-backend` y `biocenso-ai` (**New → Blueprint**, repositorio
`Sezzzo2/BioCenso`). Pide como secretos `GEMINI_API_KEY`, `DATABASE_URL` y las tres de Cloudinary;
`JWT_SECRET` y `AI_SERVICE_TOKEN` los genera Render. Los servicios gratis se duermen tras 15 minutos
sin uso y tardan unos 50 s en despertar. Para volver a Render, cambia `VITE_API_URL` a
`https://biocenso-backend.onrender.com/api` y publica de nuevo la página.

## Variables opcionales del servicio de IA

| Variable | Uso |
|---|---|
| `GEMINI_MODEL` | Modelo que se prueba primero; si está saturado se usan los de respaldo |
| `GEMINI_TIMEOUT_MODELO` / `GEMINI_TIMEOUT_TOTAL` | Segundos de espera por modelo (60) y en total (150) |
| `GEMINI_LIMITE_EN_LINEA_MB` | Hasta este tamaño (14 MB) el archivo va dentro de la petición; por encima se sube con la API de archivos de Gemini |

En el backend, `CENSO_MAX_MB` (200 por defecto) fija el tamaño máximo del video de un censo.
