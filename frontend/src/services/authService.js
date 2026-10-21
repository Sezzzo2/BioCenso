import api from "./api";

export const login = (correo, contrasena) =>
  api.post("/auth/login", { correo, contrasena }).then((r) => r.data);

export const registro = (datos) =>
  api.post("/auth/registro", datos).then((r) => r.data);

export const obtenerPerfil = () =>
  api.get("/auth/perfil").then((r) => r.data);

export const actualizarPerfil = (datos) =>
  api.put("/auth/perfil", datos).then((r) => r.data);