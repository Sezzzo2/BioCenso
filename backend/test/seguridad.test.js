const request = require("supertest");
const app = require("../app");
const pool = require("../src/config/db");
const { crearUsuarioYToken } = require("./helpers/authHelper");

describe("Fase 6: Endurecimiento general de seguridad", () => {
  let usuario;
  let idFincaCreada;
  let idVacunaCreada;

  beforeAll(async () => {
    usuario = await crearUsuarioYToken("seguridad");
  });

  afterAll(async () => {
    if (idFincaCreada) {
      await pool.query("DELETE FROM finca WHERE id_finca = $1", [idFincaCreada]);
    }
    if (idVacunaCreada) {
      await pool.query("DELETE FROM vacunas WHERE id_vacunas = $1", [idVacunaCreada]);
    }
    await pool.query("DELETE FROM usuario WHERE id_usuario = $1", [usuario.id_usuario]);
    await pool.end();
  });

  it("rechaza un payload JSON mayor al límite de 100kb (413)", async () => {
    const payloadGigante = "A".repeat(150000);

    const res = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${usuario.token}`)
      .send({ nombre: payloadGigante, municipio: "Villavicencio", departamento: "Meta" });

    expect(res.statusCode).toBe(413);
  });

  it("neutraliza un intento de XSS en el nombre de una finca", async () => {
    const res = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${usuario.token}`)
      .send({
        nombre: "<script>alert('finca')</script>",
        municipio: "Villavicencio",
        departamento: "Meta",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.nombre).not.toContain("<script>");
    idFincaCreada = res.body.id_finca;
  });

  it("neutraliza un intento de XSS en el nombre de una vacuna", async () => {
    const res = await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${usuario.token}`)
      .send({ nombre: `<img src=x onerror=alert(1)>-${Date.now()}` });

    expect(res.statusCode).toBe(201);
    expect(res.body.nombre).not.toContain("<img");
    idVacunaCreada = res.body.id_vacunas;
  });

  it("neutraliza un intento de XSS en nombre/apellido al registrarse", async () => {
    const correo = `xss-${Date.now()}@biocenso.com`;

    const res = await request(app).post("/api/auth/registro").send({
      nombre: "<script>alert('nombre')</script>",
      apellido: "Normal",
      correo,
      contrasena: "ClaveSegura123",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.nombre).not.toContain("<script>");

    await pool.query("DELETE FROM usuario WHERE correo = $1", [correo]);
  });

  it("no bloquea el login al superar el límite global de solicitudes", async () => {
    const intentos = Array.from({ length: 205 }, () =>
      request(app).post("/api/auth/login").send({
        correo: usuario.correo,
        contrasena: "ClaveIncorrecta999",
      })
    );

    const respuestas = await Promise.all(intentos);
    const bloqueados = respuestas.filter((r) => r.statusCode === 429);

    expect(bloqueados).toHaveLength(0);
    expect(respuestas.every((r) => r.statusCode === 401)).toBe(true);
  }, 60000);
});