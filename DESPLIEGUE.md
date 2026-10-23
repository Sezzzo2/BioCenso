# Despliegue de BioCenso (rama `prueba`)

```
Firebase Hosting (página)  ──HTTPS──▶  Render: biocenso-backend (Node)  ──▶  Neon: PostgreSQL
biocenso-ucc-2026.web.app                       │
                                                └──HTTPS + token──▶  Render: biocenso-ai (FastAPI + Gemini)
```

La página se queda en Firebase. El frontend **solo** se publica compilado con `VITE_USE_BACKEND=true`:
sin backend, la app guarda todo en el navegador y cualquiera entra con cualquier contraseña.
`frontend/vite.config.js` detiene esa compilación.

Todo es de plan gratis. En Render, los servicios gratis se duermen tras 15 minutos sin uso y
tardan unos 50 s en despertar; la página los despierta al abrirse, pero conviene abrirla
un minuto antes de una presentación.

## 1. Neon: base de datos

1. Crea una cuenta en [neon.tech](https://neon.tech) (puedes entrar con GitHub) y un proyecto
   `biocenso` en la región **AWS US West 2 (Oregon)**, la misma de Render.
2. En **Connect**, copia la cadena de conexión (empieza por `postgresql://`). No la pegues en
   el chat ni en archivos del repositorio.
3. Crea el esquema desde la carpeta `backend` (PowerShell):

   ```bash
   $env:DATABASE_URL="pega-aqui-la-cadena"; node scripts/crearEsquema.js
   ```

   Crea el esquema base si falta y aplica las migraciones de `backend/database/migraciones`.
   Debe terminar con `Listo: 24 funciones y procedimientos.` Se puede ejecutar de nuevo sin riesgo;
   hazlo cada vez que se agregue una migración, **antes** de publicar el backend que la necesita.

## 2. Render: backend y servicio de IA

1. Crea una cuenta en [render.com](https://render.com) con GitHub.
2. **New → Blueprint** y elige el repositorio `Sezzzo2/BioCenso`, rama `prueba`.
   Render lee `render.yaml` y crea `biocenso-backend` y `biocenso-ai`.
   - Si el repositorio no aparece (es de otra cuenta), pídele a su dueño que te agregue como
     colaborador, o que él cree el Blueprint.
3. Render pedirá las variables marcadas como secretas:

   | Servicio | Variable | Valor |
   |---|---|---|
   | `biocenso-ai` | `GEMINI_API_KEY` | La clave de Google AI Studio |
   | `biocenso-backend` | `DATABASE_URL` | La cadena de conexión de Neon |
   | `biocenso-backend` | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Credenciales de Cloudinary (fotos de los bovinos) |

   `JWT_SECRET` y `AI_SERVICE_TOKEN` los genera Render solo; el backend recibe el token del servicio de IA.
4. Cuando termine, revisa la URL de `biocenso-ai`. Si no es `https://biocenso-ai.onrender.com`
   (Render agrega un sufijo si el nombre está ocupado), cambia `AI_SERVICE_URL` en
   `biocenso-backend → Environment`.
5. Comprueba con la URL del backend:
   - `https://<backend>.onrender.com/health` → `{"estado":"ok"}`
   - `https://<backend>.onrender.com/health/db` → muestra la hora del servidor
   - `https://<backend>.onrender.com/health/ai-service` → `"clave_configurada": true`

## 3. Firebase: publicar la página

En `frontend/.env.production` pon la URL del backend terminada en `/api`:

```
VITE_USE_BACKEND=true
VITE_API_URL=https://<backend>.onrender.com/api
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
3. Sube un censo MP4 o una foto de menos de 20 MB: aparece en el historial de esa finca.

## Alternativa: Railway

Si prefieres Railway (no se duerme, pero requiere su plan de pago para uso continuo), cada carpeta
trae su `railway.json`. Crea en un proyecto: PostgreSQL, `backend` (Root Directory `/backend`) y
`ai-service` (Root Directory `/ai-service`), con las mismas variables de la tabla anterior más:

| Servicio | Variable | Valor |
|---|---|---|
| `ai-service` | `PORT` | `8000` |
| `ai-service` | `AI_SERVICE_TOKEN` | Un texto aleatorio largo |
| `backend` | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `backend` | `AI_SERVICE_URL` | `http://${{ai-service.RAILWAY_PRIVATE_DOMAIN}}:8000` |
| `backend` | `AI_SERVICE_TOKEN` | `${{ai-service.AI_SERVICE_TOKEN}}` |
| `backend` | `NODE_ENV`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `TRUST_PROXY`, `AI_TIMEOUT_MS` | Como en `render.yaml` |

El esquema se crea igual, con `scripts/crearEsquema.js` y la URL pública de la base.

## Variables opcionales del servicio de IA

| Variable | Uso |
|---|---|
| `GEMINI_MODEL` | Modelo que se prueba primero; si está saturado se usan los de respaldo |
| `GEMINI_TIMEOUT_MODELO` / `GEMINI_TIMEOUT_TOTAL` | Segundos de espera por modelo (60) y en total (150) |
| `GEMINI_LIMITE_EN_LINEA_MB` | Hasta este tamaño (14 MB) el archivo va dentro de la petición; por encima se sube con la API de archivos de Gemini |

En el backend, `CENSO_MAX_MB` (200 por defecto) fija el tamaño máximo del video de un censo.
