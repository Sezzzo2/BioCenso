const request = require("supertest");
const app = require("../app");
const { crearUsuarioYToken } = require("./helpers/authHelper");
const pool = require("../src/config/db");

describe("Validación y autenticación de Finca", () => {
  let token;

  beforeAll(async () => {
    const usuario = await crearUsuarioYToken("finca-val");
    token = usuario.token;
  });

  it("rechaza acceso sin token", async () => {
    const res = await request(app).post("/api/fincas").send({
      nombre: "La Vitrina",
      municipio: "Villavicencio",
      departamento: "Meta",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rechaza crear finca sin nombre", async () => {
    const res = await request(app)
      .post("/api/fincas")
      .set("Authorization", `Bearer ${token}`)
      .send({ municipio: "Villavicencio", departamento: "Meta" });

    expect(res.statusCode).toBe(422);
    expect(res.body.errores.some((e) => e.campo === "nombre")).toBe(true);
  });

  it("rechaza id de finca inválido en la URL", async () => {
    const res = await request(app)
      .get("/api/fincas/no-es-un-id")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(422);
  });
});

afterAll(async () => {
  await pool.end();
});