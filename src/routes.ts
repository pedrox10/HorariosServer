import {Router} from "express";
import {agregarUsuario, getMarcaciones, getUsuarios} from "./controllers/usuario.controller";
import {
    crearTerminal,
    editarTerminal,
    eliminarTerminal,
    getTerminales,
    sincronizarTerminal, verTerminal
} from "./controllers/terminal.controller";

const router = Router();

// Rutas para operaciones con Terminales
router.get("/terminal/:id",verTerminal);
router.post('/terminal/agregar', crearTerminal);
router.put('/terminal/editar/:id', editarTerminal);
router.delete('/terminal/eliminar/:id', eliminarTerminal);
router.get("/terminales",getTerminales);
router.get("/terminal/sincronizar/:id",sincronizarTerminal);

// Rutas para operaciones con Usuarios
router.get("/terminal/:id/usuarios", getUsuarios)
router.get("/marcaciones/:id", getMarcaciones)
router.post('/usuario', agregarUsuario);

// Rutas para operaciones con Horarios
// router.post('/horario', crearUsuario);

export default router