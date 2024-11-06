import {Router} from "express";
import {crearUsuario} from "./controllers/usuario.controller";
import {crearTerminal} from "./controllers/terminal.controller";

const router = Router();

// Rutas para operaciones con Usuarios
router.post('/usuario', crearUsuario);

// Rutas para operaciones con Terminales
router.post('/terminal/agregar', crearTerminal);

// Rutas para operaciones con Horarios
//router.post('/horario', crearUsuario);

export default router