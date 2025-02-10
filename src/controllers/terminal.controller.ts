import {Request, Response} from "express"
import {Terminal} from "../entity/Terminal";
import {AppDataSource} from "../data-source";
import {Marcacion} from "../entity/Marcacion";
import path from "path";
import {EstadoUsuario, Usuario} from "../entity/Usuario";
import moment from 'moment';
import {Turno} from "../entity/Turno";
import {Jornada} from "../entity/Jornada";

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
        for (let usuario of terminal.usuarios) {
            await eliminarUsuario(usuario, terminal)
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
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const fueSincronizado = !(terminal.ult_sincronizacion === null)
        const getMarcacionesPy = async () => {
            try {
                const pyFile = 'src/scriptpy/marcaciones.py';
                const args = [terminal.ip, terminal.puerto];
                if (fueSincronizado) {
                    args.push(moment(terminal.ult_sincronizacion).format('MM/DD/YY HH:mm:ss'))
                }
                args.unshift(pyFile);
                const pyprog = await spawn(envPython, args);
                let marcaciones: Marcacion[] = [];
                //const pyprog = fs.readFileSync("./src/registros.json");
                let marcacionesT = JSON.parse(pyprog.toString());
                for(let value of marcacionesT) {
                    let marcacion = new Marcacion();
                    marcacion.ci = value.user_id;
                    let fecha = moment(value.timestamp, "YYYY-MM-DD")
                    let hora = moment(value.timestamp, "YYYY-MM-DD HH-mm-ss")
                    marcacion.fecha = moment(fecha).toDate()
                    marcacion.hora = moment(hora).toDate()
                    marcacion.terminal = terminal;
                    marcaciones.push(marcacion)
                }
                /*JSON.parse(pyprog.toString()).forEach((value: any) => {
                    let marcacion = new Marcacion();
                    marcacion.ci = value.user_id;
                    let fecha = moment(value.timestamp, "YYYY-MM-DD")
                    let hora = moment(value.timestamp, "YYYY-MM-DD HH-mm-ss")
                    marcacion.fecha = moment(fecha).toDate()
                    marcacion.hora = moment(hora).toDate()
                    marcacion.terminal = terminal;
                    marcaciones.push(marcacion)
                });*/
                const marcacionRepo = AppDataSource.getRepository(Marcacion);
                await marcacionRepo.insert(marcaciones);
                console.log("Agregados: " + marcaciones.length + " nuevas marcaciones")
            } catch (e: any) {
                res.send("Error")
                console.log(e.stderr.toString())
            }
        }
        await getMarcacionesPy();

        const getUsuariosPy = async () => {
            try {
                const pyFile = 'src/scriptpy/usuarios.py';
                const args = [terminal?.ip, terminal?.puerto];
                args.unshift(pyFile);
                const pyprog = await spawn(envPython, args);
                let usuariosT: any = JSON.parse(pyprog.toString());

                //let usuariosT = [{"uid":1,"role":0,"password":"","name":"PEDRO DINO BARCO","cardno":0,"user_id":"5907490"},{"uid":2,"role":0,"password":"","name":"MARIA COSTA","cardno":0,"user_id":"5907491"}]
                let usuariosBD = await Usuario.find({where: {terminal: terminal}});
                if (fueSincronizado) {
                    //Recorro los usuarios del terminal y comparo con funcionarios de la BD

                    await usuariosT.forEach(async (usuarioT: any) => {
                        let usuarioBD = await Usuario.findOneBy({uid: usuarioT.uid, terminal: terminal})
                        //Si existe pregunto si cambió sy nombre y actualizo
                        if (usuarioBD) {
                            if (usuarioT.name !== usuarioBD.nombre) {
                                usuarioBD.nombre = usuarioT.name;
                                await usuarioBD.save()
                            }
                        } else {
                            let usuario = await getNuevoUsuario(usuarioT, terminal)
                            await usuario.save()
                        }
                    });

                    await usuariosBD.forEach(async (usuario: Usuario) => {
                        if (buscarUsuarioEn(usuario, usuariosT) == false) {
                            await eliminarUsuario(usuario, terminal);
                        }
                    });

                } else {
                    let usuarios: Usuario[] = [];
                    for (let usuarioT of usuariosT) {
                        let usuario = await getNuevoUsuario(usuarioT, terminal)
                        usuarios.push(usuario);
                    }

                    const userRepo = AppDataSource.getRepository(Usuario);
                    await userRepo.insert(usuarios);
                    console.log(usuarios)
                }
                terminal.ult_sincronizacion = moment().toDate()
                console.log(moment(terminal.ult_sincronizacion))
                await terminal.save()
            } catch (e: any) {
                res.send("Error")
                console.log(e.stderr.toString())
            }
        }
        await getUsuariosPy();

        let t = await Terminal.findOne({
            where: {id: terminal.id}, relations: {
                usuarios: true,
            },
        });
        res.send(t?.usuarios)
    }
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

async function getMarcaciones(ci: number, terminal: Terminal) {
    let marcaciones: Marcacion[] = [];
    marcaciones = await Marcacion.findBy({ci: ci, terminal: terminal});
    return marcaciones;
}

async function getNuevoUsuario(usuarioT: any, terminal: Terminal) {
    let usuario = new Usuario();
    usuario.uid = usuarioT.uid;
    usuario.ci = usuarioT.user_id;
    usuario.nombre = usuarioT.name;
    usuario.terminal = terminal;
    let marcaciones: Marcacion[] = [];
    marcaciones = await getMarcaciones(usuario.ci, terminal);
    if (marcaciones) {
        if (marcaciones.length > 0) {
            usuario.fechaAlta = moment(marcaciones.at(0)!.fecha, "YYYY-MM-DD").toDate();
            console.log(usuario.fechaAlta)
        } else {
            usuario.fechaAlta = moment().toDate();
            usuario.estado = EstadoUsuario.inactivo;
            console.log(usuario.fechaAlta)
        }
    }
    return usuario;
}

async function eliminarUsuario(usuario: Usuario, terminal: Terminal) {
    //Borramos las marcaciones
    let marcaciones: Marcacion[] = [];
    marcaciones = await getMarcaciones(usuario.ci, terminal);
    console.log("a borrar: " + marcaciones.length)
    const marcacionRepo = AppDataSource.getRepository(Marcacion);
    await marcacionRepo.remove(marcaciones);

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
    const turnoRepo = AppDataSource.getRepository(Turno);
    await turnoRepo.remove(turnosBorrar);

    //Borramos las jornadas restantes
    await Usuario.delete({id: usuario.id});
}

