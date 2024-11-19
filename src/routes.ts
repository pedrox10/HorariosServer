import {Router} from "express";
import {crearUsuario} from "./controllers/usuario.controller";
import {crearTerminal, editarTerminal, eliminarTerminal} from "./controllers/terminal.controller";
import {AppDataSource} from "./data-source";
import {Terminal} from "./entity/Terminal";

const router = Router();

// Rutas para operaciones con Usuarios
router.post('/usuario', crearUsuario);

// Rutas para operaciones con Terminales
router.post('/terminal/agregar', crearTerminal);
router.put('/terminal/editar/:id', editarTerminal);
router.delete('/terminal/eliminar/:id', eliminarTerminal);
router.get("/terminales",async (req, res) => {
    let terminales = await AppDataSource.manager.find(Terminal)
    res.send(terminales)
})

// Rutas para operaciones con Horarios
// router.post('/horario', crearUsuario);

export default router