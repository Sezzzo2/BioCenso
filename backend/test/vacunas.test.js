const request = require("supertest");
const app = require("../app");
const pool = require("../src/config/db");
const { crearUsuarioYToken } = require("./helpers/authHelper");

describe("Fase 5: Módulo de vacunas", () => {
  let usuarioA, usuarioB;
  let idFincaA, idAnimalA;
  let idVacuna;
  let idAplicacion;

  beforeAll(async () => {
    usuarioA = await crearUsuarioYToken("vacunas-a");
    usuarioB = await crearUsuarioYToken("vacunas-b");

    const resFinca = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ nombre: "Finca Vacunas A", municipio: "Villavicencio", departamento: "Meta" });
    idFincaA = resFinca.body.id_finca;

    const resAnimal = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .field("id_finca", idFincaA)
      .field("numero_animal", `VAC-${Date.now()}`)
      .field("sexo", "Hembra");
    idAnimalA = resAnimal.body.id_animal;
  });

  afterAll(async () => {
    if (idVacuna) {
      await pool.query("DELETE FROM vacunas WHERE id_vacunas = $1", [idVacuna]);
    }
    await pool.query("DELETE FROM finca WHERE id_finca = $1", [idFincaA]);
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuarioA.id_usuario]);
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuarioB.id_usuario]);
    await pool.end();
  });

  it("rechaza crear vacuna sin nombre", async () => {
    const res = await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({});
    expect(res.statusCode).toBe(422);
  });

  it("crea una vacuna en el catálogo", async () => {
    const res = await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ nombre: `Fiebre Aftosa ${Date.now()}` });

    expect(res.statusCode).toBe(201);
    idVacuna = res.body.id_vacunas;
  });

  it("rechaza una vacuna con nombre duplicado en el catálogo (409)", async () => {
    const nombreDuplicado = `Duplicada-${Date.now()}`;

    await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ nombre: nombreDuplicado });

    const res = await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ nombre: nombreDuplicado });

    expect(res.statusCode).toBe(409);

    await pool.query("DELETE FROM vacunas WHERE nombre = $1", [nombreDuplicado]);
  });

  it("aplica una vacuna a un animal propio", async () => {
    const res = await request(app)
      .post("/api/vacunas/aplicar")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ id_animal: idAnimalA, id_vacunas: idVacuna });

    expect(res.statusCode).toBe(201);
    idAplicacion = res.body.id_animal_vacunas;
  });

  it("resume las aplicaciones reales de las fincas del usuario", async () => {
    const res = await request(app)
      .get("/api/dashboard/vacunacion")
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.total_aplicaciones).toBe(1);
    expect(res.body.animales_vacunados).toBe(1);
    expect(res.body.ultima_vacunacion).not.toBeNull();
    expect(res.body.proximas_dosis).toBeNull();
    expect(res.body.vacunaciones_vencidas).toBeNull();
    expect(res.body.calculo_programacion_disponible).toBe(false);
  });

  it("requiere autenticación para consultar el resumen de vacunación", async () => {
    const res = await request(app).get("/api/dashboard/vacunacion");
    expect(res.statusCode).toBe(401);
  });

  it("permite aplicar la misma vacuna dos veces (refuerzo anual, confirma que se quitó la restricción única)", async () => {
    const res = await request(app)
      .post("/api/vacunas/aplicar")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ id_animal: idAnimalA, id_vacunas: idVacuna, fecha_vacunacion: "2025-01-15" });

    expect(res.statusCode).toBe(201);

    await pool.query("DELETE FROM animal_vacunas WHERE id_animal_vacunas = $1", [
      res.body.id_animal_vacunas,
    ]);
  });

  it("usuario B no puede aplicar una vacuna a un animal de la finca de A (404)", async () => {
    const res = await request(app)
      .post("/api/vacunas/aplicar")
      .set("Authorization", `Bearer ${usuarioB.token}`)
      .send({ id_animal: idAnimalA, id_vacunas: idVacuna });

    expect(res.statusCode).toBe(404);
  });

  it("lista las vacunas aplicadas a un animal, incluyendo el nombre de la vacuna", async () => {
    const res = await request(app)
      .get(`/api/vacunas/animal/${idAnimalA}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.some((v) => v.id_animal_vacunas === idAplicacion)).toBe(true);
    expect(res.body[0].nombre_vacuna).toBeDefined();
  });

  it("usuario B no puede ver las vacunas de un animal de la finca de A (404)", async () => {
    const res = await request(app)
      .get(`/api/vacunas/animal/${idAnimalA}`)
      .set("Authorization", `Bearer ${usuarioB.token}`);

    expect(res.statusCode).toBe(404);
  });

  it("usuario B no puede eliminar una aplicación de vacuna de un animal de A (404)", async () => {
    const res = await request(app)
      .delete(`/api/vacunas/aplicacion/${idAplicacion}`)
      .set("Authorization", `Bearer ${usuarioB.token}`);

    expect(res.statusCode).toBe(404);
  });

  it("elimina una aplicación de vacuna propia", async () => {
    const res = await request(app)
      .delete(`/api/vacunas/aplicacion/${idAplicacion}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(200);
  });

  it("responde 404 al intentar eliminar la misma aplicación de nuevo", async () => {
    const res = await request(app)
      .delete(`/api/vacunas/aplicacion/${idAplicacion}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);

    expect(res.statusCode).toBe(404);
  });
});