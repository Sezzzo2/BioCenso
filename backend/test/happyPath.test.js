const request = require("supertest");
const app = require("../app");
const pool = require("../src/config/db");
const { crearUsuarioYToken } = require("./helpers/authHelper");

describe("Camino feliz: Finca y Animal contra la base real (autenticado)", () => {
  let token;
  let idUsuarioPrueba;
  let idFincaPrueba;
  let idAnimalPrueba;

  beforeAll(async () => {
    const usuario = await crearUsuarioYToken("happy-path");
    token = usuario.token;
    idUsuarioPrueba = usuario.id_usuario;
  });

  afterAll(async () => {
    if (idFincaPrueba) {
      await pool.query("DELETE FROM finca WHERE id_finca = $1", [idFincaPrueba]);
    }
    if (idUsuarioPrueba) {
      await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [idUsuarioPrueba]);
    }
    await pool.end();
  });

  it("crea una finca real vía fn_crear_finca (dueño = usuario autenticado)", async () => {
    const res = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Finca de Prueba Automatizada",
        municipio: "Villavicencio",
        departamento: "Meta",
        direccion: "Vía rural km 5",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.id_usuario).toBe(idUsuarioPrueba);
    idFincaPrueba = res.body.id_finca;
  });

  it("lista solo las fincas del usuario autenticado", async () => {
    const res = await request(app)
      .get("/api/fincas")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.some((f) => f.id_finca === idFincaPrueba)).toBe(true);
  });

  it("obtiene la finca por id (acceso permitido al dueño)", async () => {
    const res = await request(app)
      .get(`/api/fincas/${idFincaPrueba}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it("responde 404 al buscar una finca inexistente", async () => {
    const res = await request(app)
      .get("/api/fincas/999999999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it("crea un animal real vía fn_crear_animal", async () => {
    const res = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${token}`)
      .field("id_finca", idFincaPrueba)
      .field("numero_animal", `TEST-${Date.now()}`)
      .field("sexo", "Hembra")
      .field("peso", "320.5")
      .field("estado_reproductivo", "Gestante");

    expect(res.statusCode).toBe(201);
    idAnimalPrueba = res.body.id_animal;
  });

  it("rechaza un segundo animal con el mismo numero_animal en la misma finca (409)", async () => {
    const animalOriginal = await pool.query(
      "SELECT numero_animal FROM animal WHERE id_animal = $1",
      [idAnimalPrueba]
    );

    const res = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${token}`)
      .field("id_finca", idFincaPrueba)
      .field("numero_animal", animalOriginal.rows[0].numero_animal)
      .field("sexo", "Macho");

    expect(res.statusCode).toBe(409);
  });

  it("lista los animales de la finca vía vista_animales_completa", async () => {
    const res = await request(app)
      .get(`/api/animales/finca/${idFincaPrueba}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    const animal = res.body.find((a) => a.id_animal === idAnimalPrueba);
    expect(animal.nombre_finca).toBe("Finca de Prueba Automatizada");
  });

  it("obtiene el animal por id vía fn_obtener_animal", async () => {
    const res = await request(app)
      .get(`/api/animales/${idAnimalPrueba}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it("actualiza el animal y el trigger refresca actualizado_en", async () => {
    const antes = await pool.query(
      "SELECT actualizado_en FROM animal WHERE id_animal = $1",
      [idAnimalPrueba]
    );

    const res = await request(app)
      .put(`/api/animales/${idAnimalPrueba}`)
      .set("Authorization", `Bearer ${token}`)
      .field("numero_animal", `TEST-ACTUALIZADO-${Date.now()}`)
      .field("sexo", "Hembra")
      .field("estado_general", "Enfermo")
      .field("enfermedad", "Mastitis");

    expect(res.statusCode).toBe(200);

    const despues = await pool.query(
      "SELECT actualizado_en FROM animal WHERE id_animal = $1",
      [idAnimalPrueba]
    );
    expect(new Date(despues.rows[0].actualizado_en).getTime()).toBeGreaterThan(
      new Date(antes.rows[0].actualizado_en).getTime()
    );
  });

  it("elimina el animal vía sp_eliminar_animal", async () => {
    const res = await request(app)
      .delete(`/api/animales/${idAnimalPrueba}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it("responde 404 al buscar el animal ya eliminado", async () => {
    const res = await request(app)
      .get(`/api/animales/${idAnimalPrueba}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});