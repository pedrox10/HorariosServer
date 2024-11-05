import {Router} from "express";
import {crearUsuario} from "./controllers/usuario.controller";

const router = Router();

// Rutas para operaciones con Usuarios
router.post('/usuario', crearUsuario);

// Rutas para operaciones con Terminales
//router.post('/terminal', crearTerminal);

// Rutas para operaciones con Horarios
//router.post('/horario', crearUsuario);

export default router