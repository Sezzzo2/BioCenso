const request = require("supertest");
const app = require("../../app");

async function crearUsuarioYToken(sufijo = Date.now()) {
  const correo = `test-${sufijo}-${Date.now()}@biocenso.com`;
  const contrasena = "ClaveSegura123";

  await request(app).post("/api/auth/registro").send({
    nombre: "Test",
    apellido: "Helper",
    correo,
    contrasena,
  });

  const loginRes = await request(app).post("/api/auth/login").send({ correo, contrasena });

  return {
    correo,
    contrasena,
    token: loginRes.body.token,
    id_usuario: loginRes.body.usuario.id_usuario,
  };
}

module.exports = { crearUsuarioYToken };