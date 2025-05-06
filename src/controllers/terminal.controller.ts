
import {Request, Response} from "express"
import {Terminal} from "../entity/Terminal";
import {AppDataSource} from "../data-source";
import {Marcacion} from "../entity/Marcacion";
import path from "path";
import {EstadoUsuario, Usuario} from "../entity/Usuario";
import moment from 'moment';
import {Turno} from "../entity/Turno";
import {Jornada} from "../entity/Jornada";
import {Between, EntityManager, QueryRunner} from "typeorm";
import {Sincronizacion} from "../entity/Sincronizacion";
import {Interrupcion} from "../entity/Interrupcion";
import {Horario} from "../entity/Horario";

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

export const agregarInterrupcion = async (req: Request, res: Response) => {
    try {
        const {idTerminal, fecha, motivo, horaIni, horaFin, detalle} = req.body
        const terminal = await Terminal.findOne({where: {id: parseInt(idTerminal)},});
        if(terminal) {
            let interrupcion = new Interrupcion()
            interrupcion.fecha = moment(fecha, "YYYY-MM-DD").toDate()
            interrupcion.motivo = motivo
            interrupcion.horaIni = moment(fecha + " " + horaIni!, 'YYYY-MM-DD HH:mm').toDate()
            interrupcion.horaFin = moment(fecha + " " + horaFin!, 'YYYY-MM-DD HH:mm').toDate()
            interrupcion.detalle = detalle
            interrupcion.terminal = terminal;
            await interrupcion.save();
            return res.status(200).json(interrupcion)
        } else {
            return res.status(404).json({ info: 'Terminal biométrico no encontrado' })
        }

    } catch (error) {
        console.error("Error al guardar interrupción:", error);
        return res.status(500).json({ info: 'Error interno del servidor' });
    }
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
        await queryRunner.manager.delete(Marcacion, { terminal: terminal.id });
        let aux = await queryRunner.manager.delete(Terminal, { id: terminal.id });
        res.send(aux)
    }
}

export const eliminarInterrupcion = async (req: Request, res: Response) => {
    const {id} = req.params;
    const aux = await Interrupcion.delete({id: parseInt(id)});
    res.send(aux)
}

export const getTerminales = async (req: Request, res: Response) => {
    let terminales = await AppDataSource.manager.find(Terminal)
    res.send(terminales)
}

export const getUsuarios = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({
        where: {id: parseInt(id)}, relations: {
            usuarios: true,
        }
    });
    let usuarios = terminal?.usuarios;
    if (usuarios) {
        for (const usuario of usuarios) {
            let jornada = await ultJornadaAsignadaMes(usuario.id);
            if (jornada) {
                let dia = moment(jornada.fecha).format("DD");
                let mes = moment(jornada.fecha).format("MMM");
                usuario.horarioMes = "Hasta " + dia + " " + mes;
            } else {
                usuario.horarioMes = "Sin Asignar"
            }
        }
        res.send(usuarios)
    }
}

export const getSincronizaciones = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.createQueryBuilder('terminal')
        .leftJoinAndSelect('terminal.sincronizaciones', 'sincronizacion')
        .where('terminal.id = :id', { id: parseInt(id) })
        .orderBy('sincronizacion.fecha', 'DESC')  // Ordena por fecha de mayor a menor
        .getOne();
    let sincronizaciones = terminal?.sincronizaciones;
    res.send(sincronizaciones)
}

export const getInterrupciones = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const terminalId = parseInt(id);

        const terminal = await Terminal.findOne({
            where: { id: terminalId },
            relations: { interrupciones: true }
        });
        if (!terminal) {
            return res.status(404).json({ error: "Terminal no encontrada" });
        }
        return res.json(terminal.interrupciones);
    } catch (error) {
        console.error("Error al obtener interrupciones:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

export const getTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    res.send(terminal)
}

export const getFechaPriMarcacion = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)}, relations: {marcaciones: true}});
    console.log(terminal?.marcaciones[0].fecha)
    res.send(JSON.stringify(terminal?.marcaciones[0].fecha))
}

export const getTerminalPorIp = async (req: Request, res: Response) => {
    const {ip} = req.params;
    try {
        const terminal = await Terminal.findOne({
            where: {ip: ip}, relations: {
                usuarios: true,
            }
        });
        if (!terminal) {
            return res.status(404).json({ exito: false, respuesta: "Terminal no encontrado en el servidor.\nSe debe agregar antes"});
        }
        return res.status(200).json({ exito: true, respuesta: terminal});
    } catch (error) {
        return res.status(500).json({ exito: false, respuesta: "Error en servidor"});
        console.error("Error en el servidor", error);
    }
}

export const sincronizarTerminal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const metodo = req.method; // "GET" o "POST"

    const terminal = await Terminal.findOne({ where: { id: parseInt(id) } });
    if (!terminal) {
        return res.status(404).json({
            mensaje: "¡Terminal no encontrado en Base de Datos!",
        });
    }

    const fueSincronizado = terminal.ultSincronizacion !== null;
    let marcacionesNuevas: Marcacion[] = [];
    let usuariosNuevos: Usuario[] = [];
    let usuariosEditados: Usuario[] = [];
    let usuariosEliminados: Usuario[] = [];

    let marcacionesT: any;
    let usuariosT: any;
    let numeroSerie;
    let horaTerminal;
    let totalMarcaciones;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        if (metodo === "GET") {
            const conectado = await conectar(terminal.ip, terminal.puerto);
            if (!conectado) {
                return res.status(500).json({
                    mensaje: "¡Terminal sin conexion a la red!",
                });
            }
            // --- Procesamiento de Marcaciones ---
            const pyFileMarcaciones = 'src/scriptpy/marcaciones.py';
            let argsMarcaciones = [terminal.ip, terminal.puerto];

            if (fueSincronizado) {
                argsMarcaciones.push(moment(terminal.ultSincronizacion).format('MM/DD/YY HH:mm:ss'));
            }
            argsMarcaciones.unshift(pyFileMarcaciones);
            const pyprogMarcaciones = await spawn(envPython, argsMarcaciones);
            //console.log(pyprogMarcaciones.toString())
            let respuesta = JSON.parse(pyprogMarcaciones.toString())
            marcacionesT = respuesta.marcaciones;
            numeroSerie = respuesta.numero_serie
            horaTerminal = respuesta.hora_terminal
            totalMarcaciones = respuesta.total_marcaciones
        } else if (metodo === "POST") {
            console.log("Petición POST recibida");
            const info = JSON.parse(req.body.info);
            marcacionesT = info.marcaciones;
            numeroSerie = info.numero_serie
            horaTerminal = info.hora_terminal
            totalMarcaciones = info.total_marcaciones
        }

        for (let value of marcacionesT) {
            let marcacion = new Marcacion();
            marcacion.ci = value.user_id;
            marcacion.fecha = moment(value.timestamp, "YYYY-MM-DD").toDate();
            marcacion.hora = moment(value.timestamp, "YYYY-MM-DD HH-mm-ss").toDate();
            marcacion.terminal = terminal;
            marcacionesNuevas.push(marcacion);
        }
        // Iniciar una única transacción para todo el proceso
        await queryRunner.startTransaction();
        const manager: EntityManager = queryRunner.manager;
        // Inserta las marcaciones usando el mismo queryRunner
        await queryRunner.manager.insert(Marcacion, marcacionesNuevas);
        // --- Procesamiento de Usuarios ---
        if (metodo === "GET") {
            const pyFileUsuarios = 'src/scriptpy/usuarios.py';
            let argsUsuarios = [terminal.ip, terminal.puerto];
            argsUsuarios.unshift(pyFileUsuarios);
            const pyprogUsuarios = await spawn(envPython, argsUsuarios);
            usuariosT = JSON.parse(pyprogUsuarios.toString());
        } else if (metodo === "POST") {
            usuariosT = JSON.parse(req.body.usuarios);
        }

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
            if(terminal.numSerie !== numeroSerie)
                terminal.numSerie = numeroSerie
        } else {
            // Si es la primera sincronización, agregar todos los usuarios nuevos
            for (let usuarioT of usuariosT) {
                let usuario = await getNuevoUsuario(usuarioT, terminal, manager);
                usuariosNuevos.push(usuario);
            }
            terminal.numSerie = numeroSerie;
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
        terminal.totalMarcaciones = totalMarcaciones;
        const fecha = moment("2026-01-01T11:43:00", "YYYY-MM-DD[T]HH:mm:ss");
        console.log("Con YYYY:", fecha.format("YYYY-MM-DD"));
        console.log("Con yyyy:", fecha.format("yyyy-MM-DD"));
        console.log(horaTerminal)
        terminal.ultSincronizacion = moment(horaTerminal, "YYYY-MM-DD[T]HH:mm:ss").toDate();
        await queryRunner.manager.save(terminal);
        // Si todo sale bien, hacer commit de la transacción
        await queryRunner.commitTransaction();
        // Recuperar la terminal con la relación de usuarios para la respuesta
        let t = await Terminal.findOne({
            where: { id: terminal.id },
            relations: { usuarios: true },
        });

        let usuarios = t?.usuarios;
        if (usuarios) {
            for (let usuario of usuarios) {
                let jornada = await ultJornadaAsignadaMes(usuario.id);
                if (jornada) {
                    let dia = moment(jornada.fecha).format("DD");
                    let mes = moment(jornada.fecha).format("MMM");
                    usuario.horarioMes = "Hasta " + dia + " " + mes;
                } else {
                    usuario.horarioMes = "Sin Asignar"
                }
            }
        }
        let sincronizacion:Sincronizacion  = new Sincronizacion()
        sincronizacion.fecha = horaTerminal;
        sincronizacion.horaServidor = moment().toDate();
        sincronizacion.nuevasMarcaciones = marcacionesNuevas.length
        sincronizacion.totalMarcaciones = totalMarcaciones
        sincronizacion.usuariosAgregados = usuariosNuevos.length
        sincronizacion.usuariosEditados = usuariosEditados.length
        sincronizacion.usuariosEliminados = usuariosEliminados.length
        sincronizacion.terminal = terminal
        await sincronizacion.save()
        console.log(sincronizacion)
        return res.status(200).json({
            mensaje: "Sincronización exitosa",
            nuevas_marcaciones: marcacionesNuevas.length,
            usuarios_agregados: usuariosNuevos.length,
            usuarios_editados: usuariosEditados.length,
            usuarios_eliminados: usuariosEliminados.length,
            numero_serie: numeroSerie,
            hora_terminal: horaTerminal,
            hora_servidor: moment().utc().toDate(),
            total_marcaciones: totalMarcaciones,
            usuarios: usuarios || []
        });

    } catch (error: any) {
        // Si ocurre cualquier error, se revierte la transacción completa
        if (queryRunner.isTransactionActive) {
            await queryRunner.rollbackTransaction();
        }
        return res.status(500).json({
            mensaje: "¡Error en la sincronización!",
            detalle: error.message
        });
    } finally {
        // Liberar el queryRunner para evitar fugas de conexión
        await queryRunner.release();
    }
};

async function conectar(ip: string, puerto: number) {
    let res: boolean = false;
    const pyFileConectar = 'src/scriptpy/conectar.py';
    let args = [ip, puerto];
    args.unshift(pyFileConectar);
    const pyprogConectar = await spawn(envPython, args);
    let respuesta = JSON.parse(pyprogConectar.toString());
    res = respuesta.conectado === true ? true : false;
    return res;
}

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
    // Obtener todas las jornadas del usuario con sus turnos
    const jornadas = await queryRunner.manager.find(Jornada, { where: { usuario: usuario }, relations: { priTurno: true, segTurno: true }});
    // Extraer los turnos únicos a eliminar
    const turnosBorrar = jornadas.flatMap(j =>
        j.getNumTurnos() === 2 ? [j.priTurno, j.segTurno] :
            j.getNumTurnos() === 1 ? [j.priTurno] : []
    );
    // Eliminar turnos si hay alguno
    if (turnosBorrar.length > 0) {
        await queryRunner.manager.remove(Turno, turnosBorrar);
    }
    //Borramos las jornadas restantes
    await queryRunner.manager.delete(Usuario, { id: usuario.id });
}

export async function ultJornadaAsignadaMes(usuarioId: number) {
    const inicioMes = moment().startOf('month').toDate();
    const finMes = moment().endOf('month').toDate();
    // Buscamos la última jornada (fecha más alta) entre inicioMes y finMes
    const ultimaJornada = await Jornada.findOne({
        where: {
            usuario: {id: usuarioId}, // Relación con el usuario
            fecha: Between(inicioMes, finMes),
        },
        order: {
            fecha: 'DESC', // Orden descendente para tomar la más reciente
        },
        relations: {
            priTurno: true,
            segTurno: true,
        },
    });
    return ultimaJornada;
}
