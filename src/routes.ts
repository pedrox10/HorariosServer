import {Router} from "express";
import {agregarUsuario, getMarcaciones, getTurnos, getUsuarios} from "./controllers/usuario.controller";
import {
    crearTerminal,
    editarTerminal,
    eliminarTerminal,
    getTerminales,
    sincronizarTerminal, verTerminal
} from "./controllers/terminal.controller";
import {getHorario, getHorarios} from "./controllers/horario.controller";

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
router.post("/usuario/:id/turnos/:fecha", getTurnos)

// Rutas para operaciones con Horarios
router.get('/horario/:id', getHorario);
router.get('/horarios/', getHorarios);

export default router