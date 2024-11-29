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
    if (terminal?.ult_sincronizacion === null) {
        const getMarcacionesPy = async () => {
            try {
                const pyFile = 'src/scriptpy/marcaciones.py';
                const args = [terminal.ip, terminal.puerto];
                args.unshift(pyFile);
                const pyprog = await spawn(envPython, args);
                let marcaciones: Marcacion[] = [];
                JSON.parse(pyprog.toString()).forEach((value: any) => {
                    let marcacion = new Marcacion();
                    marcacion.ci = value.user_id;
                    marcacion.fechaMarcaje = value.timestamp
                    marcacion.terminal = terminal;
                    marcaciones.push(marcacion)
                });
                const marcacionRepo = AppDataSource.getRepository(Marcacion);
                await marcacionRepo.insert(marcaciones);
                console.log("save Marcaciones")
            } catch (e: any) {
                console.log(e.stderr.toString())
            }
        }
        await getMarcacionesPy();


        const getUsuariosPy = async () => {
            try {
                const pyFile = 'src/scriptpy/usuarios.py';
                const args = [terminal.ip, terminal.puerto];
                args.unshift(pyFile);
                const pyprog = await spawn(envPython, args);
                let usuarios: Usuario[]= [];
                JSON.parse(pyprog.toString()).forEach((value: any) => {
                    let usuario = new Usuario();
                    usuario.uid = value.uid;
                    usuario.ci = value.user_id;
                    usuario.nombre = value.name;
                    usuario.terminal = terminal;
                    usuarios.push(usuario);
                });
                const userRepo = AppDataSource.getRepository(Usuario);
                await userRepo.insert(usuarios);
                await res.send(usuarios)
                console.log("save Usuarios")

            } catch (e: any) {
                console.log(e.stderr.toString())
            }
        }
        await getUsuariosPy();
    } else {
        res.send({"res": changeTimezone(terminal?.ult_sincronizacion, "America/La_Paz").toString()})
    }
}

export const verTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    res.send(terminal)
}

function changeTimezone(date: any, ianatz: string) {
    var invdate = new Date(date.toLocaleString('en-US', {
        timeZone: ianatz
    }));
    var diff = date.getTime() - invdate.getTime();
    return new Date(date.getTime() - diff); // needs to substract
}