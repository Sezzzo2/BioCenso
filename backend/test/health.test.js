const request = require("supertest");
const app = require("../app");

describe("Salud del servidor y seguridad básica", () => {
  it("responde 200 en /health", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.estado).toBe("ok");
  });

  it("incluye cabeceras de seguridad de helmet", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-dns-prefetch-control"]).toBeDefined();
  });

  it("no refleja un origen no autorizado en CORS", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://sitio-malicioso.com");

    expect(res.headers["access-control-allow-origin"]).not.toBe(
      "http://sitio-malicioso.com"
    );
  });

  it("rechaza un payload JSON malformado con un error controlado", async () => {
    const res = await request(app)
      .post("/health") // ruta cualquiera que acepte POST más adelante; por ahora solo valida el parser
      .set("Content-Type", "application/json")
      .send("{ json_invalido");

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

const pool = require("../src/config/db");

afterAll(async () => {
  await pool.end();
});