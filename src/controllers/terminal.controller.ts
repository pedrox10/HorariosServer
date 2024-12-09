import {Request, Response} from "express"
import {Terminal} from "../entity/Terminal";
import {AppDataSource} from "../data-source";
import fs from "fs";
import {Marcacion} from "../entity/Marcacion";
import path from "path";
import {Usuario} from "../entity/Usuario";
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
    if (!terminal) {

    } else {
        terminal.nombre = nombre;
        terminal.ip = ip;
        terminal.puerto = puerto
        terminal.ult_sincronizacion = new Date();
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
                    marcacion.fechaMarcaje = value.timestamp
                    marcacion.terminal = terminal;
                    marcaciones.push(marcacion)
                });
                const marcacionRepo = AppDataSource.getRepository(Marcacion);
                await marcacionRepo.insert(marcaciones);
                console.log("Agregados: " + marcaciones.length + " nuevas marcaciones")
            } catch (e: any) {
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
                let usuariosT = JSON.parse(pyprog.toString());

                //let usuariosT = [{"uid":1,"role":0,"password":"","name":"PEDRO DINO","cardno":0,"user_id":"5907490"},{"uid":4,"role":0,"password":"","name":"MARIA TELLEZ","cardno":0,"user_id":"5907491"},{"uid":3,"role":0,"password":"","name":"Noelia","cardno":0,"user_id":"5907492"},{"uid":2,"role":0,"password":"","name":"Jose","cardno":0,"user_id":"5907493"}]
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
                }
                terminal.ult_sincronizacion = moment().toDate()
                await terminal.save()

            } catch (e: any) {
                console.log(e.stderr.toString())
            }
        }
        await getUsuariosPy();
        await res.send(await Terminal.findOne({
            where: {id: terminal.id}, relations: {
                usuarios: true,
            }
        }));
    }
}

export const verTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    res.send(terminal)
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
