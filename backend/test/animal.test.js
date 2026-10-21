const request = require("supertest");
const app = require("../app");
const { crearUsuarioYToken } = require("./helpers/authHelper");
const pool = require("../src/config/db");

describe("Validación y autenticación de Animal", () => {
  let token;

  beforeAll(async () => {
    const usuario = await crearUsuarioYToken("animal-val");
    token = usuario.token;
  });

  it("rechaza acceso sin token", async () => {
    const res = await request(app)
      .post("/api/animales")
      .send({ id_finca: 1, numero_animal: "A-001", sexo: "Macho" });
    expect(res.statusCode).toBe(401);
  });

  it("rechaza sexo inválido", async () => {
    const res = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${token}`)
      .send({ id_finca: 1, numero_animal: "A-001", sexo: "Otro" });

    expect(res.statusCode).toBe(422);
    expect(res.body.errores.some((e) => e.campo === "sexo")).toBe(true);
  });

  it("rechaza numero_animal con caracteres no permitidos", async () => {
    const res = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${token}`)
      .send({ id_finca: 1, numero_animal: "A#001<script>", sexo: "Macho" });

    expect(res.statusCode).toBe(422);
  });

  it("rechaza fecha_nacimiento futura", async () => {
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);

    const res = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_finca: 1,
        numero_animal: "A-002",
        sexo: "Hembra",
        fecha_nacimiento: fechaFutura.toISOString().split("T")[0],
      });

    expect(res.statusCode).toBe(422);
  });

  it("rechaza peso fuera de rango", async () => {
    const res = await request(app)
      .post("/api/animales")
      .set("Authorization", `Bearer ${token}`)
      .send({ id_finca: 1, numero_animal: "A-003", sexo: "Macho", peso: 5000 });

    expect(res.statusCode).toBe(422);
  });

  it("rechaza id de animal inválido en la URL", async () => {
    const res = await request(app)
      .get("/api/animales/no-es-un-id")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(422);
  });
});

afterAll(async () => {
  await pool.end();
});