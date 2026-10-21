import api from "./api";
import { guardarDB, leerDB } from "./localStore";

export const login = async (correo, contrasena) => {
  try {
    const r = await api.post("/auth/login", { correo, contrasena });
    return r.data;
  } catch (err) {
    if (err.response) throw err;
    const db = leerDB();
    const nombreBase = correo.split("@")[0] || "Usuario";
    const usuario = {
      ...db.usuario,
      correo,
      nombre: db.usuario?.correo === correo ? db.usuario.nombre : nombreBase,
      rol: "Ganadero",
    };
    db.usuario = usuario;
    guardarDB(db);
    return {
      token: "bc_local_demo_token",
      usuario,
    };
  }
};

export const registro = async (datos) => {
  try {
    const r = await api.post("/auth/registro", datos);
    return r.data;
  } catch (err) {
    if (err.response) throw err;
    const db = leerDB();
    const usuario = {
      id_usuario: 1,
      nombre: datos.nombre || "Ganadero",
      apellido: datos.apellido || "",
      correo: datos.correo,
      rol: "Ganadero",
    };
    db.usuario = usuario;
    guardarDB(db);
    return { usuario };
  }
};

export const obtenerPerfil = async () => {
  try {
    const r = await api.get("/auth/perfil");
    return r.data;
  } catch (err) {
    if (err.response) throw err;
    const db = leerDB();
    return { usuario: db.usuario };
  }
};

export const actualizarPerfil = async (datos) => {
  try {
    const r = await api.put("/auth/perfil", datos);
    return r.data;
  } catch (err) {
    if (err.response) throw err;
    const db = leerDB();
    db.usuario = {
      ...db.usuario,
      ...datos,
    };
    guardarDB(db);
    return { usuario: db.usuario };
  }
};
