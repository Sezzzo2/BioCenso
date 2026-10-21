const request = require("supertest");
const app = require("../app");
const pool = require("../src/config/db");
const { crearUsuarioYToken } = require("./helpers/authHelper");

describe("Fase 8: Dashboard / resultados agregados", () => {
  let usuarioA, usuarioB;
  let idFincaA, idFincaVacia;
  let idCensoA, cantidadDetectada;

  beforeAll(async () => {
    usuarioA = await crearUsuarioYToken("dashboard-a");
    usuarioB = await crearUsuarioYToken("dashboard-b");

    const resFincaA = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ nombre: "Finca Dashboard A", municipio: "Villavicencio", departamento: "Meta" });
    idFincaA = resFincaA.body.id_finca;

    const resFincaVacia = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ nombre: "Finca Sin Censos", municipio: "Villavicencio", departamento: "Meta" });
    idFincaVacia = resFincaVacia.body.id_finca;

    await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .field("id_finca", idFincaA)
      .field("numero_animal", `DASH-${Date.now()}`)
      .field("sexo", "Hembra");

    const resCenso = await request(app)
      .post("/api/censos")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .field("id_finca", idFincaA)
      .attach("imagen", Buffer.from("contenido-simulado"), {
        filename: "vuelo.jpg",
        contentType: "image/jpeg",
      });

    idCensoA = resCenso.body.censo.id_censo;
    cantidadDetectada = resCenso.body.deteccion.cantidad_animales;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM finca WHERE id_finca IN ($1, $2)", [idFincaA, idFincaVacia]);
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuarioA.id_usuario]);
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuarioB.id_usuario]);
    await pool.end();
  });

  it("devuelve un dashboard vacío (sin errores) para una finca sin censos", async () => {
    const res = await request(app)
      .get(`/api/dashboard/finca/${idFincaVacia}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.total_bovinos_registrados).toBe(0);
    expect(res.body.numero_censos).toBe(0);
    expect(res.body.id_ultimo_censo).toBeNull();
  });

  it("registra el conteo manual de un censo", async () => {
    const res = await request(app)
      .patch(`/api/censos/${idCensoA}/conteo-manual`)
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ conteo_manual: cantidadDetectada });

    expect(res.statusCode).toBe(200);
    expect(res.body.conteo_manual).toBe(cantidadDetectada);
  });

  it("calcula correctamente el dashboard con diferencia 0 y precisión 100%", async () => {
    const res = await request(app)
      .get(`/api/dashboard/finca/${idFincaA}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.total_bovinos_registrados).toBe(1);
    expect(res.body.numero_censos).toBe(1);
    expect(res.body.id_ultimo_censo).toBe(idCensoA);
    expect(res.body.cantidad_detectada_ultimo_censo).toBe(cantidadDetectada);
    expect(res.body.diferencia_ultimo_censo).toBe(0);
    expect(res.body.porcentaje_precision_ultimo_censo).toBe(100);
  });

  it("devuelve la evolución de censos con el punto registrado", async () => {
    const res = await request(app)
      .get(`/api/dashboard/finca/${idFincaA}/evolucion`)
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id_censo).toBe(idCensoA);
    expect(res.body[0].cantidad_animales).toBe(cantidadDetectada);
  });

  it("devuelve el resumen de vacunación del usuario y no inventa vencimientos", async () => {
    const res = await request(app)
      .get("/api/dashboard/vacunacion")
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.total_aplicaciones).toBe(0);
    expect(res.body.animales_vacunados).toBe(0);
    expect(res.body.ultima_vacunacion).toBeNull();
    expect(res.body.proximas_dosis).toBeNull();
    expect(res.body.vacunaciones_vencidas).toBeNull();
    expect(res.body.calculo_programacion_disponible).toBe(false);
    expect(res.body.mensaje_programacion).toMatch(/intervalos de refuerzo/i);
  });

  it("requiere autenticación para el resumen de vacunación", async () => {
    const res = await request(app).get("/api/dashboard/vacunacion");
    expect(res.statusCode).toBe(401);
  });

  it("usuario B no puede ver el dashboard de la finca de A (404)", async () => {
    const res = await request(app)
      .get(`/api/dashboard/finca/${idFincaA}`)
      .set("Authorization", `Bearer ${usuarioB.token}`);

    expect(res.statusCode).toBe(404);
  });

  it("usuario B no puede registrar el conteo manual de un censo de A (404)", async () => {
    const res = await request(app)
      .patch(`/api/censos/${idCensoA}/conteo-manual`)
      .set("Authorization", `Bearer ${usuarioB.token}`)
      .send({ conteo_manual: 10 });

    expect(res.statusCode).toBe(404);
  });
});