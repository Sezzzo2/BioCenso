# BioCenso — Backend

Sistema automatizado para el censo de bovinos en la Finca La Vitrina (Universidad Cooperativa de Colombia, Villavicencio). Este repositorio contiene el **backend** (API REST), el **microservicio de IA** (actualmente un mock de YOLOv26s) y los scripts de **base de datos**.

## Arquitectura

```
Cliente (React, Swagger, Postman)
        │  HTTP / JSON
        ▼
Backend Node.js + Express  (puerto 4000)
        │                         │
        │ SQL (pg)                │ HTTP multipart
        ▼                         ▼
PostgreSQL                 Microservicio de IA — FastAPI (puerto 8000)
(biocenso / biocenso_test)  └─ POST /predict  → mock de YOLOv26s
```

Principios de diseño:

- **La lógica de datos vive en PostgreSQL.** Los controladores de Node no contienen `INSERT`/`UPDATE`/`DELETE`; solo llaman funciones (`SELECT * FROM fn_...`), procedimientos (`CALL sp_...`) y vistas.
- **Autenticación JWT + autorización por finca.** Un usuario solo accede a sus fincas (o a las que tenga asociadas). Si no tiene acceso, la API responde `404` (igual que si no existiera) para no revelar la existencia de recursos.
- **La IA es un servicio aparte.** Reemplazar el mock por el modelo YOLOv26s real no debería requerir cambios en el backend, siempre que se respete el contrato de `/predict`.

## Requisitos

| Herramienta | Versión recomendada |
|---|---|
| Node.js | 20 o superior (probado con 24) |
| PostgreSQL | 14 o superior, con pgAdmin |
| Python | 3.10 o superior |
| Cuenta de Cloudinary | Plan gratuito (imágenes de animales) |

## Estructura del proyecto

```
BioCenso/
├── backend/
│   ├── app.js                 # Configuración de Express (middlewares, rutas)
│   ├── server.js              # Arranque del servidor
│   ├── src/
│   │   ├── config/            # db.js, cloudinary.js, swagger.js
│   │   ├── controllers/       # Lógica de cada módulo (solo llaman a la BD)
│   │   ├── routes/            # Endpoints + anotaciones Swagger
│   │   ├── validators/        # Validación de entrada (express-validator)
│   │   ├── middlewares/       # Auth JWT, autorización por finca, subida de archivos, errores
│   │   └── utils/             # Resolución de id_finca para autorización
│   └── test/                  # Pruebas Jest + Supertest
├── ai-service/
│   ├── requirements.txt
│   └── app/main.py            # Mock de YOLOv26s (FastAPI)
└── database/
    ├── schema.sql             # Esquema consolidado (usar este para crear una base nueva)
    └── migrations/            # Historial de cambios por fase (referencia)
```

## Instalación

### 1. Base de datos

Crea **dos** bases en pgAdmin: `biocenso` (desarrollo) y `biocenso_test` (pruebas). En cada una, abre el Query Tool y ejecuta el contenido completo de `database/schema.sql`.

> Antes de ejecutar, verifica en la esquina superior del Query Tool que estás conectado a la base correcta.

### 2. Backend

```powershell
cd backend
npm install
```

Copia `.env.example` como `.env` y completa los valores (ver tabla más abajo).

### 3. Microservicio de IA

```powershell
cd ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Si `python` no se reconoce, prueba con `py` (ver "Solución de problemas").

## Variables de entorno (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del backend | `4000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Base de datos de desarrollo | `biocenso` |
| `DB_NAME_TEST` | Base de datos de pruebas (obligatoria para `npm test`) | `biocenso_test` |
| `DB_USER` / `DB_PASSWORD` | Credenciales de PostgreSQL | |
| `JWT_SECRET` | Secreto para firmar tokens. Debe ser largo y aleatorio | |
| `JWT_EXPIRES_IN` | Duración del token. En producción usa algo corto | `2h` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Credenciales exactas del dashboard de Cloudinary | |
| `FRONTEND_ORIGIN` | Orígenes permitidos por CORS, separados por comas. Incluye el de Swagger | `http://localhost:5173,http://localhost:4000` |
| `TRUST_PROXY` | `true` solo si corre detrás de un proxy/balanceador | `false` |
| `AI_SERVICE_URL` | URL del microservicio de IA | `http://localhost:8000` |

Para generar un `JWT_SECRET` aleatorio:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Nunca subas el archivo `.env` al repositorio.** Debe estar en `.gitignore`.

## Ejecución

Se necesitan **dos procesos** corriendo a la vez (una terminal cada uno):

**Terminal 1 — Backend**

```powershell
cd backend
npm run dev
```

**Terminal 2 — Microservicio de IA**

```powershell
cd ai-service
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Verificación rápida:

```powershell
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4000/health/db
Invoke-RestMethod http://localhost:4000/health/cloudinary
Invoke-RestMethod http://localhost:4000/health/ai-service
```

## Pruebas

```powershell
cd backend
npm test
```

- Requiere que el **microservicio de IA esté corriendo** (las pruebas de censos y dashboard lo usan).
- Corre contra `biocenso_test`, nunca contra la base de desarrollo. Si `DB_NAME_TEST` falta o es igual a `DB_NAME`, la suite se detiene con un error a propósito.
- Estado actual: 10 archivos, 74 pruebas. Cubren validación, camino feliz, autenticación, autorización cruzada entre usuarios, seguridad (XSS, fuerza bruta, payloads grandes) y la integración con el servicio de IA.
- Los `console.error` que aparecen durante la ejecución son logs esperados de los casos de error que las pruebas provocan a propósito.

Un solo archivo:

```powershell
npx jest test/auth.test.js --runInBand
```

## Documentación de la API

Con el backend corriendo:

- Interfaz interactiva: <http://localhost:4000/api-docs>
- Especificación OpenAPI en JSON: <http://localhost:4000/api-docs.json> (importable en Postman)

Para probar endpoints protegidos desde Swagger:

1. Ejecuta `POST /api/auth/registro` (si no tienes usuario) y luego `POST /api/auth/login`.
2. Copia el valor de `token` de la respuesta, sin comillas.
3. Pulsa **Authorize**, pega el token (sin escribir "Bearer") y pulsa el botón verde **Authorize** dentro del cuadro.
4. El candado de los endpoints protegidos debe verse cerrado.

## Resumen de endpoints

Todos requieren `Authorization: Bearer <token>`, salvo registro, login y health.

| Módulo | Endpoints |
|---|---|
| Autenticación | `POST /api/auth/registro`, `POST /api/auth/login`, `GET /api/auth/perfil` |
| Fincas | `POST /api/fincas`, `GET /api/fincas`, `GET /api/fincas/:id` |
| Animales | `POST /api/animales`, `GET /api/animales/finca/:id_finca`, `GET`/`PUT`/`DELETE /api/animales/:id` |
| Vacunas | `POST`/`GET /api/vacunas`, `POST /api/vacunas/aplicar`, `GET /api/vacunas/animal/:id_animal`, `DELETE /api/vacunas/aplicacion/:id` |
| Censos | `POST /api/censos`, `GET /api/censos/finca/:id_finca`, `GET /api/censos/:id`, `PATCH /api/censos/:id/conteo-manual` |
| Dashboard | `GET /api/dashboard/finca/:id_finca`, `GET /api/dashboard/finca/:id_finca/evolucion` |
| Salud | `GET /health`, `/health/db`, `/health/cloudinary`, `/health/ai-service` |

El detalle de cada uno (parámetros, cuerpos, códigos de respuesta) está en Swagger.

## Seguridad implementada

- Contraseñas con hash (bcryptjs) y política de contraseña fuerte.
- El rol se asigna siempre en el servidor (`Ganadero`); el cliente no puede autoasignarse privilegios.
- Mensaje genérico en login fallido, con comparación de hash señuelo para evitar enumeración de correos por tiempos de respuesta.
- Autorización por finca en todos los recursos, con respuesta `404` para recursos ajenos.
- `helmet`, CORS con lista blanca, límite de JSON de 100 KB, rate limiting global y uno más estricto en login/registro.
- Escapado de HTML en todos los campos de texto libre (mitigación de XSS almacenado).
- Consultas parametrizadas en todo el acceso a datos.

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `python` no se reconoce | Prueba `py --version`. Si tampoco funciona, instala Python marcando **"Add python.exe to PATH"** y abre una terminal nueva. |
| `Cannot find module '...'` | Faltan dependencias. Corre `npm install` dentro de `backend`. |
| `no existe la base de datos` o `no existe la función fn_...` | Revisa que `.env` tenga `DB_NAME` con el nombre **exacto** de la base (respeta mayúsculas) y que `schema.sql` se haya ejecutado en esa base. |
| `NODE_ENV=test pero DB_NAME_TEST no está configurado...` | Agrega `DB_NAME_TEST=biocenso_test` al `.env`. |
| `502` al crear un censo, o fallan los tests de censo/dashboard | El microservicio de IA no está corriendo. Levántalo (Terminal 2). |
| `403 "Origen no permitido"` desde Swagger | Agrega `http://localhost:4000` a `FRONTEND_ORIGIN` y reinicia el backend. |
| `401 "Token no proporcionado"` en Swagger | No se aplicó el token. Repite el flujo de **Authorize** y verifica que el candado quede cerrado. |
| Cloudinary: `cloud_name mismatch` | `CLOUDINARY_CLOUD_NAME` debe ser el *Cloud name* exacto del dashboard, no el nombre del proyecto. |
| `curl` en PowerShell pide confirmación | En PowerShell `curl` es un alias de `Invoke-WebRequest`. Usa `Invoke-RestMethod` o `curl.exe`. |
| Cambié el `.env` y no pasa nada | Las variables se leen al arrancar. Reinicia el servidor. |

## Estado y trabajo pendiente

- **Hecho:** autenticación, autorización, fincas, animales (con imagen), vacunas, censos con mock de IA, dashboard, endurecimiento de seguridad, base de pruebas aislada, documentación Swagger.
- **Pendiente — modelo real:** reemplazar el mock de `ai-service` por YOLOv26s entrenado, manteniendo el contrato de `POST /predict`: `count`, `peso_estimado_promedio`, `detections`, `processing_time`, `model`.
- **Pendiente — validación experimental:** módulo para registrar las pruebas de comparación manual vs. automático (altura de vuelo, resolución, condiciones lumínicas, etc.) y los indicadores (precisión, recall, F1, mAP).
- **Opcional — subida directa a S3:** URLs prefirmadas y multipart upload para videos grandes, en lugar de pasar el archivo por el backend.