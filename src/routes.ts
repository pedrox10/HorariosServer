import {Router} from "express";
import {
    getInfoMarcaciones, getJornada,
    getMarcaciones,
    getUsuario,
    getUsuarios
} from "./controllers/usuario.controller";
import {
    crearTerminal,
    editarTerminal,
    eliminarTerminal, getTerminal,
    getTerminales,
    sincronizarTerminal
} from "./controllers/terminal.controller";
import {asignarHorario, eliminarJornada, getHorario, getHorarios} from "./controllers/horario.controller";

const router = Router();

// Rutas para operaciones con Terminales
router.get("/terminal/:id",getTerminal);
router.post('/terminal/agregar', crearTerminal);
router.put('/terminal/editar/:id', editarTerminal);
router.delete('/terminal/eliminar/:id', eliminarTerminal);
router.get("/terminales",getTerminales);
router.get("/terminal/sincronizar/:id",sincronizarTerminal);

// Rutas para operaciones con Usuarios
router.get("/terminal/:id/usuarios", getUsuarios)
router.get("/usuario/:id", getUsuario)
router.get('/usuario/:id/fecha/:fecha', getJornada);
router.get("/marcaciones/:id", getMarcaciones)
router.get("/usuario/:id/ini/:ini/fin/:fin", getInfoMarcaciones)
//router.post('/usuario', agregarUsuario);

// Rutas para operaciones con Horarios
router.get('/horario/:id', getHorario);
router.get('/horarios/', getHorarios);
router.get("/asignar-horario/:id/usuarios/:ids/ini/:ini/fin/:fin/jornadas/:jornadas", asignarHorario)
router.delete('/eliminar-jornada/:id', eliminarJornada);

export default router