
import {Request, Response} from "express"
import {Terminal} from "../entity/Terminal";
import {AppDataSource} from "../data-source";
import {Marcacion} from "../entity/Marcacion";
import path from "path";
import {EstadoUsuario, Usuario} from "../entity/Usuario";
import moment from 'moment';
import {Turno} from "../entity/Turno";
import {Jornada} from "../entity/Jornada";
import {EntityManager, QueryRunner} from "typeorm";
import * as fs from "fs";

const envPython = path.join(__dirname, "../scriptpy/envpy", "bin", "python3");
const spawn = require('await-spawn');

export const crearTerminal = async (req: Request, res: Response) => {
    const terminal = new Terminal()
    terminal.nombre = req.body.nombre
    terminal.ip = req.body.ip
    terminal.puerto = req.body.puerto
    terminal.tieneConexion = req.body.tieneConexion
    await terminal.save();
    console.log(terminal)
    res.send(terminal)
}

export const editarTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const {nombre, ip, puerto, tieneConexion} = req.body
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        terminal.nombre = nombre;
        terminal.ip = ip;
        terminal.puerto = puerto
        terminal.tieneConexion = tieneConexion
        terminal.save()
        res.send(terminal)
    }
}

export const eliminarTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)}, relations: {usuarios: true}});
    if (terminal) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        for (let usuario of terminal.usuarios) {
            await eliminarUsuario(usuario, terminal, queryRunner)
        }
        const aux = await Terminal.delete({id: parseInt(id)});
        res.send(aux)
    }
}

export const getTerminales = async (req: Request, res: Response) => {
    let terminales = await AppDataSource.manager.find(Terminal)
    res.send(terminales)
}

export const getTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    res.send(terminal)
}

export const getFechaPriMarcacion = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)}, relations: {marcaciones: true}});
    res.send(JSON.stringify(terminal?.marcaciones[0].fecha))
}

export const sincronizarTerminal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const terminal = await Terminal.findOne({ where: { id: parseInt(id) } });
    if (!terminal) {
        return res.status(404).json({ error: "Terminal no encontrada" });
    }

    const fueSincronizado = terminal.ult_sincronizacion !== null;
    let marcacionesNuevas: Marcacion[] = [];
    let usuariosNuevos: Usuario[] = [];
    let usuariosEditados: Usuario[] = [];
    let usuariosEliminados: Usuario[] = [];

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        // Iniciar una única transacción para todo el proceso
        await queryRunner.startTransaction();
        const manager: EntityManager = queryRunner.manager;
        // --- Procesamiento de Marcaciones ---
        const pyFileMarcaciones = 'src/scriptpy/marcaciones.py';
        let argsMarcaciones = [terminal.ip, terminal.puerto];
        if (fueSincronizado) {
            argsMarcaciones.push(moment(terminal.ult_sincronizacion).format('MM/DD/YY HH:mm:ss'));
        }
        argsMarcaciones.unshift(pyFileMarcaciones);
        const pyprogMarcaciones = await spawn(envPython, argsMarcaciones);
        let marcacionesT = JSON.parse(pyprogMarcaciones.toString());

        for (let value of marcacionesT) {
            let marcacion = new Marcacion();
            marcacion.ci = value.user_id;
            // Se asume que el timestamp viene en formato adecuado;
            // ajustar los formatos según sea necesario
            marcacion.fecha = moment(value.timestamp, "YYYY-MM-DD").toDate();
            marcacion.hora = moment(value.timestamp, "YYYY-MM-DD HH-mm-ss").toDate();
            marcacion.terminal = terminal;
            marcacionesNuevas.push(marcacion);
        }

        // Inserta las marcaciones usando el mismo queryRunner
        await queryRunner.manager.insert(Marcacion, marcacionesNuevas);

        // --- Procesamiento de Usuarios ---
        const pyFileUsuarios = 'src/scriptpy/usuarios.py';
        let argsUsuarios = [terminal.ip, terminal.puerto];
        argsUsuarios.unshift(pyFileUsuarios);
        const pyprogUsuarios = await spawn(envPython, argsUsuarios);
        let usuariosT: any = JSON.parse(pyprogUsuarios.toString());
        let usuariosBD = await Usuario.find({ where: { terminal: terminal } });

        if (fueSincronizado) {
            // Comparar usuarios del terminal con los de la BD
            for (let usuarioT of usuariosT) {
                let usuarioBD = await Usuario.findOneBy({ uid: usuarioT.uid, terminal: terminal });
                if (usuarioBD) {
                    // Si ya existe, actualizar si hay cambios en el nombre
                    if (usuarioT.name !== usuarioBD.nombre) {
                        usuarioBD.nombre = usuarioT.name;
                        usuariosEditados.push(usuarioBD);
                    }
                } else {
                    let usuario = await getNuevoUsuario(usuarioT, terminal, manager);
                    usuariosNuevos.push(usuario);
                }
            }
            for (let usuario of usuariosBD) {
                if (!buscarUsuarioEn(usuario, usuariosT)) {
                    usuariosEliminados.push(usuario);
                }
            }
        } else {
            // Si es la primera sincronización, agregar todos los usuarios nuevos
            for (let usuarioT of usuariosT) {
                let usuario = await getNuevoUsuario(usuarioT, terminal, manager);
                usuariosNuevos.push(usuario);
            }
        }

        // Insertar y actualizar usuarios
        if (usuariosNuevos.length > 0) {
            await queryRunner.manager.insert(Usuario, usuariosNuevos);
        }
        if (usuariosEditados.length > 0) {
            await queryRunner.manager.save(usuariosEditados);
        }
        // Para usuarios eliminados, se hace la eliminación de sus marcaciones, turnos y el propio usuario
        for (let usuario of usuariosEliminados) {
            await eliminarUsuario(usuario, terminal, queryRunner);
        }

        // Actualizar la terminal con la fecha de sincronización
        terminal.ult_sincronizacion = moment().toDate();
        await queryRunner.manager.save(terminal);

        // Si todo sale bien, hacer commit de la transacción
        await queryRunner.commitTransaction();

        // Recuperar la terminal con la relación de usuarios para la respuesta
        let t = await Terminal.findOne({
            where: { id: terminal.id },
            relations: { usuarios: true },
        });

        console.log({
            mensaje: "Sincronización exitosa",
            nuevas_marcaciones: marcacionesNuevas.length,
            usuarios_agregados: usuariosNuevos.length,
            usuarios_editados: usuariosEditados.length,
            usuarios_eliminados: usuariosEliminados.length,
            usuarios: t?.usuarios || []
        });

        return res.status(200).json({
            mensaje: "Sincronización exitosa",
            nuevas_marcaciones: marcacionesNuevas.length,
            usuarios_agregados: usuariosNuevos.length,
            usuarios_editados: usuariosEditados.length,
            usuarios_eliminados: usuariosEliminados.length,
            usuarios: t?.usuarios || []
        });

    } catch (error: any) {
        // Si ocurre cualquier error, se revierte la transacción completa
        if (queryRunner.isTransactionActive) {
            await queryRunner.rollbackTransaction();
        }
        return res.status(500).json({
            error: "Error en la sincronización",
            detalle: error.message
        });
    } finally {
        // Liberar el queryRunner para evitar fugas de conexión
        await queryRunner.release();
    }
};

function buscarUsuarioEn(usuario: Usuario, datos: any[]) {
    let res = false;
    datos.forEach(value => {
        if (usuario.uid === value.uid) {
            res = true;
            return
        }
    })
    return res;
}

async function getMarcaciones(ci: number, terminal: Terminal, manager: EntityManager) {
    return await manager.find(Marcacion, { where: { ci: ci, terminal: terminal } });
}

async function getNuevoUsuario(usuarioT: any, terminal: Terminal, manager: EntityManager) {
    let usuario = new Usuario();
    usuario.uid = usuarioT.uid;
    usuario.ci = usuarioT.user_id;
    usuario.nombre = usuarioT.name;
    usuario.terminal = terminal;
    let marcaciones = await getMarcaciones(usuario.ci, terminal, manager);
    if (marcaciones.length > 0) {
        usuario.fechaAlta = moment(marcaciones.at(0)!.fecha, "YYYY-MM-DD").toDate();
        // Aquí podrías asignar estado activo si corresponde
        usuario.estado = EstadoUsuario.activo;
    } else {
        usuario.fechaAlta = moment().toDate();
        usuario.estado = EstadoUsuario.inactivo;
    }
    return usuario;
}

async function eliminarUsuario(usuario: Usuario, terminal: Terminal, queryRunner: QueryRunner) {
    //Borramos las marcaciones
    const marcaciones: Marcacion[] = await queryRunner.manager.find(Marcacion, {
        where: { ci: usuario.ci, terminal: terminal }
    });
    console.log("a borrar: " + marcaciones.length)
    if (marcaciones.length > 0) {
        await queryRunner.manager.remove(Marcacion, marcaciones);
    }

    //Borramos los turnos asignados a ese usuario
    let turnosBorrar: Turno[] = [];
    let jornadas = await Jornada.find({
        where: {
            usuario: usuario,
        }, relations: {priTurno: true, segTurno: true}
    },)
    for (let jornada of jornadas) {
        if (jornada.getNumTurnos() == 2) {
            turnosBorrar.push(jornada.priTurno);
            turnosBorrar.push(jornada.segTurno);
        } else if (jornada.getNumTurnos() == 1) {
            turnosBorrar.push(jornada.priTurno)
        }
    }
    await queryRunner.manager.remove(Turno, turnosBorrar)

    //Borramos las jornadas restantes
    //await Usuario.delete({id: usuario.id});
    await queryRunner.manager.delete(Usuario, { id: usuario.id });
}
