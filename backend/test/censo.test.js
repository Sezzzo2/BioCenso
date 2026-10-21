const request = require("supertest");
const app = require("../app");
const pool = require("../src/config/db");
const { crearUsuarioYToken } = require("./helpers/authHelper");

describe("Fase 7: Censo y Detección (vía mock de IA)", () => {
  let usuarioA, usuarioB;
  let idFincaA;
  let idCensoA;

  beforeAll(async () => {
    usuarioA = await crearUsuarioYToken("censo-a");
    usuarioB = await crearUsuarioYToken("censo-b");

    const resFinca = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ nombre: "Finca Censo A", municipio: "Villavicencio", departamento: "Meta" });
    idFincaA = resFinca.body.id_finca;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM finca WHERE id_finca = $1", [idFincaA]);
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuarioA.id_usuario]);
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuarioB.id_usuario]);
    await pool.end();
  });

  it("rechaza crear un censo sin archivo adjunto (422)", async () => {
    const res = await request(app)
      .post("/api/censos")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .field("id_finca", idFincaA);

    expect(res.statusCode).toBe(422);
  });

  it("crea un censo real, lo procesa vía el mock de IA y guarda el resultado", async () => {
    const res = await request(app)
      .post("/api/censos")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .field("id_finca", idFincaA)
      .field("nota", "Vuelo de prueba")
      .attach("imagen", Buffer.from("contenido-simulado-de-imagen"), {
        filename: "vuelo-prueba.jpg",
        contentType: "image/jpeg",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.censo.estado).toBe("Completado");
    expect(res.body.deteccion.cantidad_animales).toBeGreaterThan(0);

    idCensoA = res.body.censo.id_censo;
  });

  it("usuario B no puede crear un censo en la finca de A (404)", async () => {
    const res = await request(app)
      .post("/api/censos")
      .set("Authorization", `Bearer ${usuarioB.token}`)
      .field("id_finca", idFincaA)
      .attach("imagen", Buffer.from("x"), { filename: "x.jpg", contentType: "image/jpeg" });

    expect(res.statusCode).toBe(404);
  });

  it("lista los censos de la finca", async () => {
    const res = await request(app)
      .get(`/api/censos/finca/${idFincaA}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.some((c) => c.id_censo === idCensoA)).toBe(true);
  });

  it("obtiene el detalle de un censo con su detección", async () => {
    const res = await request(app)
      .get(`/api/censos/${idCensoA}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.cantidad_animales).toBeDefined();
    expect(res.body.nombre_finca).toBe("Finca Censo A");
  });

  it("usuario B no puede ver el censo de la finca de A (404)", async () => {
    const res = await request(app)
      .get(`/api/censos/${idCensoA}`)
      .set("Authorization", `Bearer ${usuarioB.token}`);

    expect(res.statusCode).toBe(404);
  });

  it("rechaza un archivo con formato no permitido (422)", async () => {
    const res = await request(app)
      .post("/api/censos")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .field("id_finca", idFincaA)
      .attach("imagen", Buffer.from("contenido"), {
        filename: "documento.pdf",
        contentType: "application/pdf",
      });

    expect(res.statusCode).toBe(422);
  });
});