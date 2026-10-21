const request = require("supertest");
const app = require("../app");
const pool = require("../src/config/db");
const { crearUsuarioYToken } = require("./helpers/authHelper");

describe("Fase 4: Autorización por finca (usuario A vs usuario B)", () => {
  let usuarioA, usuarioB;
  let idFincaA, idAnimalA;

  beforeAll(async () => {
    usuarioA = await crearUsuarioYToken("autorizacion-a");
    usuarioB = await crearUsuarioYToken("autorizacion-b");

    const resFinca = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .send({ nombre: "Finca de A", municipio: "Villavicencio", departamento: "Meta" });
    idFincaA = resFinca.body.id_finca;

    const resAnimal = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${usuarioA.token}`)
      .field("id_finca", idFincaA)
      .field("numero_animal", `AUTH-${Date.now()}`)
      .field("sexo", "Macho");
    idAnimalA = resAnimal.body.id_animal;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM finca WHERE id_finca = $1", [idFincaA]);
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuarioA.id_usuario]);
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuarioB.id_usuario]);
    await pool.end();
  });

  // Nota: respondemos 404 (no 403) a propósito para no revelar a un usuario
  // no autorizado si el recurso existe o no (evita enumeración de recursos).

  it("usuario B no puede ver la finca de usuario A (404, no revela existencia)", async () => {
    const res = await request(app)
      .get(`/api/fincas/${idFincaA}`)
      .set("Authorization", `Bearer ${usuarioB.token}`);
    expect(res.statusCode).toBe(404);
  });

  it("la finca de A no aparece en el listado de B", async () => {
    const res = await request(app)
      .get("/api/fincas")
      .set("Authorization", `Bearer ${usuarioB.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.some((f) => f.id_finca === idFincaA)).toBe(false);
  });

  it("usuario B no puede ver un animal de la finca de A (404)", async () => {
    const res = await request(app)
      .get(`/api/animales/${idAnimalA}`)
      .set("Authorization", `Bearer ${usuarioB.token}`);
    expect(res.statusCode).toBe(404);
  });

  it("usuario B no puede listar animales de la finca de A (404)", async () => {
    const res = await request(app)
      .get(`/api/animales/finca/${idFincaA}`)
      .set("Authorization", `Bearer ${usuarioB.token}`);
    expect(res.statusCode).toBe(404);
  });

  it("usuario B no puede crear un animal en la finca de A (404)", async () => {
    const res = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${usuarioB.token}`)
      .field("id_finca", idFincaA)
      .field("numero_animal", `INTRUSO-${Date.now()}`)
      .field("sexo", "Macho");
    expect(res.statusCode).toBe(404);
  });

  it("usuario B no puede actualizar un animal de la finca de A (404)", async () => {
    const res = await request(app)
      .put(`/api/animales/${idAnimalA}`)
      .set("Authorization", `Bearer ${usuarioB.token}`)
      .field("numero_animal", `HACKEADO-${Date.now()}`)
      .field("sexo", "Macho");
    expect(res.statusCode).toBe(404);
  });

  it("usuario B no puede eliminar un animal de la finca de A (404)", async () => {
    const res = await request(app)
      .delete(`/api/animales/${idAnimalA}`)
      .set("Authorization", `Bearer ${usuarioB.token}`);
    expect(res.statusCode).toBe(404);
  });

  it("usuario A sí puede ver su propia finca y su animal", async () => {
    const resFinca = await request(app)
      .get(`/api/fincas/${idFincaA}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);
    expect(resFinca.statusCode).toBe(200);

    const resAnimal = await request(app)
      .get(`/api/animales/${idAnimalA}`)
      .set("Authorization", `Bearer ${usuarioA.token}`);
    expect(resAnimal.statusCode).toBe(200);
  });
});