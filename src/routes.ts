import {Router} from "express";
import {login} from "./controllers/intercomunicacion.controller";
import {
    getResumenMarcaciones, getJornada,
    getMarcaciones,
    getUsuario,
    getUsuarios, getExcepciones, editarUsuario, getUltMarcacion, asignarGrupo, limpiarGrupo
} from "./controllers/usuario.controller";
import {
    agregarGrupo,
    agregarInterrupcion,
    crearTerminal, editarGrupo,
    editarTerminal, eliminarGrupo, eliminarInterrupcion,
    eliminarTerminal, getFechaPriMarcacion, getGrupos, getInterrupciones, getSincronizaciones, getTerminal,
    getTerminales, getTerminalPorIp, respaldarTerminales,
    sincronizarTerminal
} from "./controllers/terminal.controller";
import {
    asignarHorario,
    crearHorario, editarFechaAsueto, editarHorario, eliminarHorario,
    eliminarJornada,
    getAsuetos,
    getHorario,
    getHorarios, getJornadas, getLicencias, getNumJornadas
} from "./controllers/horario.controller";
import {conectar, infoCapacidad, infoExtra} from "./controllers/comandos.controller";

const router = Router();
//Ruta para Login
router.post("/login",login);

// Rutas para operaciones con Terminales
router.get("/terminal/:id",getTerminal);
router.get("/terminal/ip/:ip",getTerminalPorIp);
router.post('/terminal/agregar', crearTerminal);
router.put('/terminal/editar/:id', editarTerminal);
router.delete('/terminal/eliminar/:id', eliminarTerminal);
router.get("/terminales",getTerminales);
router.get("/terminal/sincronizar/:id", sincronizarTerminal);
router.post("/terminal/sincronizar-post/:id", sincronizarTerminal);
router.get("/terminal/:id/pri-marcacion",getFechaPriMarcacion);
router.get("/terminal/:id/sincronizaciones", getSincronizaciones);
router.get("/terminal/:id/interrupciones", getInterrupciones)
router.post("/terminal/interrupcion/agregar", agregarInterrupcion)
router.delete("/terminal/interrupcion/:id/eliminar", eliminarInterrupcion)
router.get("/terminales/respaldar", respaldarTerminales)
router.get("/terminal/:id/grupos", getGrupos)
router.post("/terminal/:id/grupos/agregar", agregarGrupo)
router.put("/terminal/:idTerminal/grupos/editar/:idGrupo", editarGrupo)
router.delete("/terminal/:idTerminal/grupos/eliminar/:idGrupo", eliminarGrupo)

// Rutas para operaciones con Usuarios
router.get("/terminal/:id/usuarios", getUsuarios)
router.get("/usuario/:id", getUsuario)
router.put('/usuario/editar/:id', editarUsuario);
router.get('/usuario/:id/fecha/:fecha', getJornada);
router.get('/usuario/:id/gestion/:gestion/mes/:mes', getJornadas);
router.get("/marcaciones/:id", getMarcaciones)
router.get("/excepciones/:id/gestion/:gestion", getExcepciones)
router.get("/usuario/:id/ini/:ini/fin/:fin", getResumenMarcaciones)
router.get("/usuario/:id/ultMarcacion", getUltMarcacion)
router.get("/asignar-grupo/:id/usuarios/:ids", asignarGrupo)
router.get("/limpiar-grupo/usuarios/:ids", limpiarGrupo)
//router.post('/usuario', agregarUsuario);

// Rutas para operaciones con Horarios
router.get('/horario/:id', getHorario);
router.get('/horarios/', getHorarios);
router.get("/asignar-horario/:id/usuarios/:ids/ini/:ini/fin/:fin/jornadas/:jornadas", asignarHorario)
router.get('/horario/crear/:horario/:jornadas', crearHorario);
router.put('/horario/editar/:id', editarHorario);
router.get('/horario/:id/eliminar', eliminarHorario);
router.delete('/eliminar-jornada/:id', eliminarJornada);
router.get('/asuetos/', getAsuetos);
router.get('/asueto/:id/editarFecha/:fecha', editarFechaAsueto);
router.get('/licencias/', getLicencias);
router.get('/horario/:id/jornadas', getNumJornadas);

// Rutas para operaciones con Comandos
router.get("/terminal/:id/conectar", conectar)
router.get("/terminal/:id/info-capacidad", infoCapacidad)
router.get("/terminal/:id/info-extra", infoExtra)

export default router