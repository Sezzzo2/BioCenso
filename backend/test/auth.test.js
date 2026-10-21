const request = require("supertest");
const app = require("../app");
const pool = require("../src/config/db");

describe("Autenticación: registro, login y protección de rutas", () => {
  const correoPrueba = `auth-test-${Date.now()}@biocenso.com`;
  const contrasenaValida = "ClaveSegura123";
  let token;

    it("ignora el rol enviado por el cliente y siempre asigna Ganadero (previene escalamiento de privilegios)", async () => {
    const correoIntento = `privesc-${Date.now()}@biocenso.com`;

    const res = await request(app).post("/api/auth/registro").send({
      nombre: "Intento",
      apellido: "Privesc",
      correo: correoIntento,
      contrasena: "ClaveSegura123",
      rol: "Administrador", // esto debe ser ignorado por el backend
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.rol).toBe("Ganadero");

    await pool.query("DELETE FROM usuario WHERE correo = $1", [correoIntento]);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM usuario WHERE correo = $1", [correoPrueba]);
    await pool.end();
  });

  it("rechaza registro con contraseña débil", async () => {
    const res = await request(app).post("/api/auth/registro").send({
      nombre: "Test",
      apellido: "Débil",
      correo: `debil-${Date.now()}@biocenso.com`,
      contrasena: "123456",
    });

    expect(res.statusCode).toBe(422);
    expect(res.body.errores.some((e) => e.campo === "contrasena")).toBe(true);
  });

  it("rechaza registro con correo inválido", async () => {
    const res = await request(app).post("/api/auth/registro").send({
      nombre: "Test",
      apellido: "Correo",
      correo: "no-es-un-correo",
      contrasena: contrasenaValida,
    });

    expect(res.statusCode).toBe(422);
  });

  it("registra un usuario válido y nunca devuelve la contraseña", async () => {
    const res = await request(app).post("/api/auth/registro").send({
      nombre: "Test",
      apellido: "Auth",
      correo: correoPrueba,
      contrasena: contrasenaValida,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.correo).toBe(correoPrueba);
    expect(res.body.contrasena).toBeUndefined();
  });

  it("rechaza registrar el mismo correo dos veces (409)", async () => {
    const res = await request(app).post("/api/auth/registro").send({
      nombre: "Test",
      apellido: "Duplicado",
      correo: correoPrueba,
      contrasena: contrasenaValida,
    });

    expect(res.statusCode).toBe(409);
  });

  it("rechaza login con correo inexistente (401 genérico)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      correo: "no-existe-nunca@biocenso.com",
      contrasena: "cualquiera123",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Credenciales inválidas");
  });

  it("rechaza login con contraseña incorrecta (mismo mensaje genérico)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      correo: correoPrueba,
      contrasena: "ClaveIncorrecta999",
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Credenciales inválidas");
  });

  it("permite login con credenciales correctas y devuelve un token", async () => {
    const res = await request(app).post("/api/auth/login").send({
      correo: correoPrueba,
      contrasena: contrasenaValida,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.contrasena).toBeUndefined();

    token = res.body.token;
  });

  it("rechaza acceso a ruta protegida sin token", async () => {
    const res = await request(app).get("/api/auth/perfil");
    expect(res.statusCode).toBe(401);
  });

  it("rechaza acceso con un token alterado/falsificado", async () => {
    const res = await request(app)
      .get("/api/auth/perfil")
      .set("Authorization", `Bearer ${token}manipulado`);

    expect(res.statusCode).toBe(401);
  });

  it("rechaza acceso con un token mal formado (sin 'Bearer ')", async () => {
    const res = await request(app)
      .get("/api/auth/perfil")
      .set("Authorization", token);

    expect(res.statusCode).toBe(401);
  });

  it("permite acceso a ruta protegida con token válido", async () => {
    const res = await request(app)
      .get("/api/auth/perfil")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.usuario.correo).toBe(correoPrueba);
  });

  it("actualiza los datos personales sin permitir cambiar el rol", async () => {
    const res = await request(app)
      .put("/api/auth/perfil")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Nombre actualizado",
        apellido: "Apellido actualizado",
        correo: correoPrueba,
        rol: "Administrador",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.usuario).toMatchObject({
      nombre: "Nombre actualizado",
      apellido: "Apellido actualizado",
      correo: correoPrueba,
      rol: "Ganadero",
    });
    expect(res.body.usuario.contrasena).toBeUndefined();
  });

  it("valida los campos requeridos al actualizar el perfil", async () => {
    const res = await request(app)
      .put("/api/auth/perfil")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Actualizado" });

    expect(res.statusCode).toBe(422);
    expect(res.body.errores.some((error) => error.campo === "correo")).toBe(true);
  });

  it("rechaza actualizar el perfil sin autenticación", async () => {
    const res = await request(app)
      .put("/api/auth/perfil")
      .send({ nombre: "N", apellido: "A", correo: correoPrueba });

    expect(res.statusCode).toBe(401);
  });

  it("rechaza un token expirado", async () => {
    const jwt = require("jsonwebtoken");
    const tokenExpirado = jwt.sign(
      { id_usuario: 1, correo: correoPrueba, rol: "Ganadero" },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" } // ya expirado al momento de crearlo
    );

    const res = await request(app)
      .get("/api/auth/perfil")
      .set("Authorization", `Bearer ${tokenExpirado}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/expirado/i);
  });
});