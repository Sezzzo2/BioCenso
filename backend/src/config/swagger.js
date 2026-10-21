const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BioCenso API",
      version: "1.0.0",
      description:
        "API REST del sistema de censo automatizado de bovinos — Finca La Vitrina, " +
        "Universidad Cooperativa de Colombia. Cubre autenticación, gestión de fincas " +
        "y animales, vacunación, censos procesados por IA (YOLOv26s, actualmente vía " +
        "microservicio mock) y dashboard de resultados.",
    },
    servers: [
      { url: "http://localhost:4000", description: "Servidor local de desarrollo" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Usuario: {
          type: "object",
          properties: {
            id_usuario: { type: "integer", example: 1 },
            nombre: { type: "string", example: "Juan" },
            apellido: { type: "string", example: "Ayala" },
            correo: { type: "string", format: "email", example: "juan@biocenso.com" },
            rol: { type: "string", example: "Ganadero" },
            fecha_registro: { type: "string", format: "date-time" },
            estado: { type: "boolean", example: true },
          },
        },
        RegistroInput: {
          type: "object",
          required: ["nombre", "apellido", "correo", "contrasena"],
          properties: {
            nombre: { type: "string", example: "Juan" },
            apellido: { type: "string", example: "Ayala" },
            correo: { type: "string", format: "email", example: "juan@biocenso.com" },
            contrasena: { type: "string", format: "password", example: "ClaveSegura123" },
          },
        },
        LoginInput: {
          type: "object",
          required: ["correo", "contrasena"],
          properties: {
            correo: { type: "string", format: "email" },
            contrasena: { type: "string", format: "password" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            usuario: { $ref: "#/components/schemas/Usuario" },
          },
        },
        Finca: {
          type: "object",
          properties: {
            id_finca: { type: "integer" },
            id_usuario: { type: "integer" },
            nombre: { type: "string", example: "La Vitrina" },
            municipio: { type: "string", example: "Villavicencio" },
            departamento: { type: "string", example: "Meta" },
            direccion: { type: "string", nullable: true },
            estado: { type: "boolean" },
            creado_en: { type: "string", format: "date-time" },
            actualizado_en: { type: "string", format: "date-time" },
          },
        },
        FincaInput: {
          type: "object",
          required: ["nombre", "municipio", "departamento"],
          properties: {
            nombre: { type: "string" },
            municipio: { type: "string" },
            departamento: { type: "string" },
            direccion: { type: "string" },
          },
        },
        Animal: {
          type: "object",
          properties: {
            id_animal: { type: "integer" },
            id_finca: { type: "integer" },
            numero_animal: { type: "string", example: "A-001" },
            imagen_url: { type: "string", nullable: true },
            fecha_nacimiento: { type: "string", format: "date", nullable: true },
            peso: { type: "number", nullable: true, example: 320.5 },
            sexo: { type: "string", enum: ["Macho", "Hembra"] },
            estado_reproductivo: { type: "string", nullable: true },
            estado_general: { type: "string", example: "Sano" },
            enfermedad: { type: "string", nullable: true },
            creado_en: { type: "string", format: "date-time" },
            actualizado_en: { type: "string", format: "date-time" },
          },
        },
        Vacuna: {
          type: "object",
          properties: {
            id_vacunas: { type: "integer" },
            nombre: { type: "string", example: "Fiebre Aftosa" },
          },
        },
        AplicacionVacuna: {
          type: "object",
          properties: {
            id_animal_vacunas: { type: "integer" },
            id_animal: { type: "integer" },
            fecha_vacunacion: { type: "string", format: "date-time" },
            id_vacunas: { type: "integer" },
            nombre_vacuna: { type: "string" },
            id_finca: { type: "integer" },
          },
        },
        Censo: {
          type: "object",
          properties: {
            id_censo: { type: "integer" },
            id_finca: { type: "integer" },
            nota: { type: "string", nullable: true },
            fecha_procesamiento: { type: "string", format: "date-time" },
            estado: { type: "string", enum: ["Procesando", "Completado", "Error"] },
            tiempo_procesamiento: { type: "number", nullable: true },
            conteo_manual: { type: "integer", nullable: true },
          },
        },
        Deteccion: {
          type: "object",
          properties: {
            id_deteccion: { type: "integer" },
            id_censo: { type: "integer" },
            cantidad_animales: { type: "number" },
            peso_estimado: { type: "number" },
          },
        },
        CensoCreado: {
          type: "object",
          properties: {
            censo: { $ref: "#/components/schemas/Censo" },
            deteccion: { $ref: "#/components/schemas/Deteccion" },
          },
        },
        CensoCompleto: {
          type: "object",
          description: "Resultado de vista_censo_completo (censo + detección + finca unidos)",
          properties: {
            id_censo: { type: "integer" },
            id_finca: { type: "integer" },
            nota: { type: "string", nullable: true },
            fecha_procesamiento: { type: "string", format: "date-time" },
            estado: { type: "string" },
            tiempo_procesamiento: { type: "number", nullable: true },
            nombre_finca: { type: "string" },
            id_deteccion: { type: "integer", nullable: true },
            cantidad_animales: { type: "number", nullable: true },
            peso_estimado: { type: "number", nullable: true },
          },
        },
        DashboardResumen: {
          type: "object",
          properties: {
            total_bovinos_registrados: { type: "integer" },
            numero_censos: { type: "integer" },
            tiempo_promedio_procesamiento: { type: "number", nullable: true },
            id_ultimo_censo: { type: "integer", nullable: true },
            fecha_ultimo_censo: { type: "string", format: "date-time", nullable: true },
            cantidad_detectada_ultimo_censo: { type: "number", nullable: true },
            conteo_manual_ultimo_censo: { type: "integer", nullable: true },
            diferencia_ultimo_censo: { type: "number", nullable: true },
            porcentaje_precision_ultimo_censo: { type: "number", nullable: true },
          },
        },
        DashboardVacunacion: {
          type: "object",
          properties: {
            total_aplicaciones: { type: "integer", example: 12 },
            animales_vacunados: { type: "integer", example: 8 },
            ultima_vacunacion: { type: "string", format: "date-time", nullable: true },
            proximas_dosis: { type: "integer", nullable: true },
            vacunaciones_vencidas: { type: "integer", nullable: true },
            calculo_programacion_disponible: { type: "boolean", example: false },
            mensaje_programacion: { type: "string" },
          },
        },
        EvolucionPunto: {
          type: "object",
          properties: {
            id_censo: { type: "integer" },
            fecha_procesamiento: { type: "string", format: "date-time" },
            cantidad_animales: { type: "number", nullable: true },
            conteo_manual: { type: "integer", nullable: true },
          },
        },
        ErrorValidacion: {
          type: "object",
          properties: {
            errores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  campo: { type: "string" },
                  mensaje: { type: "string" },
                },
              },
            },
          },
        },
        ErrorSimple: {
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);