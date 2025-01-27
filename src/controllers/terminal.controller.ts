import {Request, Response} from "express"
import {Terminal} from "../entity/Terminal";
import {AppDataSource} from "../data-source";
import fs from "fs";
import {Marcacion} from "../entity/Marcacion";
import path from "path";
import {EstadoUsuario, Usuario} from "../entity/Usuario";
import moment from 'moment';

const envPython = path.join(__dirname, "../scriptpy/envpy", "bin", "python3");
const spawn = require('await-spawn');

export const crearTerminal = async (req: Request, res: Response) => {
    const terminal = new Terminal()
    terminal.nombre = req.body.nombre
    terminal.ip = req.body.ip
    terminal.puerto = req.body.puerto
    await terminal.save();
    console.log(terminal)
    res.send(terminal)
}

export const editarTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const {nombre, ip, puerto} = req.body
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        terminal.nombre = nombre;
        terminal.ip = ip;
        terminal.puerto = puerto
        terminal.save()
        res.send(terminal)
    }
}

export const eliminarTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const aux = await Terminal.delete({id: parseInt(id)});
    console.log(aux)
    res.send(aux)
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
                    console.log(moment(terminal.ult_sincronizacion).format('MM/DD/YY HH:mm:ss'))
                    args.push(moment(terminal.ult_sincronizacion).format('MM/DD/YY HH:mm:ss'))
                }
                args.unshift(pyFile);
                const pyprog = await spawn(envPython, args);
                console.log(envPython + " " + args)
                let marcaciones: Marcacion[] = [];
                //const pyprog = fs.readFileSync("./src/registros.json");
                JSON.parse(pyprog.toString()).forEach((value: any) => {
                    let marcacion = new Marcacion();
                    marcacion.ci = value.user_id;
                    let fecha = moment(value.timestamp, "YYYY-MM-DD")
                    let hora = moment(value.timestamp, "YYYY-MM-DD HH-mm-ss")
                    marcacion.fecha = moment(fecha).toDate()
                    marcacion.hora = moment(hora).toDate()
                    marcacion.terminal = terminal;
                    marcaciones.push(marcacion)
                });
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
                console.log(envPython + " " + args)
                let usuariosT = JSON.parse(pyprog.toString());

                //let usuariosT = [{"uid":1,"role":0,"password":"","name":"PEDRO DINO BARCO","cardno":0,"user_id":"5907490"},{"uid":2,"role":0,"password":"","name":"MARIA COSTA","cardno":0,"user_id":"5907491"}]
                let usuariosBD = await Usuario.find({where: {terminal: terminal}});
                if (fueSincronizado) {
                    await usuariosT.forEach(async (usuarioT: any) => {
                        let usuarioBD = await Usuario.findOneBy({ uid: usuarioT.uid, terminal: terminal })
                        if (usuarioBD) {
                            if (usuarioT.name !== usuarioBD.nombre) {
                            usuarioBD.nombre = usuarioT.name;
                            await usuarioBD.save()
                            }
                        } else {
                            let usuario = new Usuario();
                            usuario.uid = usuarioT.uid;
                            usuario.ci = usuarioT.user_id;
                            usuario.nombre = usuarioT.name;
                            usuario.terminal = terminal;
                            await usuario.save()
                        }
                    });

                    await usuariosBD.forEach(async (usuario: Usuario) => {
                        if (buscarUsuarioEn(usuario, usuariosT) == false) {
                            await Usuario.delete({id: usuario.id});
                        }
                    });

                } else {
                    let usuarios: Usuario[] = [];
                    await usuariosT.forEach(async (usuarioT: any) => {
                        let usuario = new Usuario();
                        usuario.uid = usuarioT.uid;
                        usuario.ci = usuarioT.user_id;
                        usuario.nombre = usuarioT.name;
                        usuario.terminal = terminal;
                        usuarios.push(usuario);
                    });
                    const userRepo = AppDataSource.getRepository(Usuario);
                    await userRepo.insert(usuarios);
                    let nuevosUsuarios = await Usuario.findBy({terminal: terminal})
                    let usuariosInactivos: Usuario[] = []
                    for(let usuario of nuevosUsuarios) {
                        let numMarcaciones = await getNumMarcaciones(usuario.ci, terminal)
                        if( numMarcaciones == 0){
                            usuario.estado = EstadoUsuario.inactivo
                            usuariosInactivos.push(usuario)
                        }
                    }
                    await userRepo.save(usuariosInactivos)
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

async function getMarcaciones(ci:number, terminal:Terminal) {
    let marcaciones = await Marcacion.findBy({ci: ci, terminal: terminal});
    return marcaciones;
}

async function getNumMarcaciones(ci:number, terminal:Terminal) {
    let marcaciones = await Marcacion.findBy({ci: ci, terminal: terminal});
    return marcaciones.length;
}

