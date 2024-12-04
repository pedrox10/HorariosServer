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
        /*const getMarcacionesPy = async () => {
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
        await getMarcacionesPy();*/

        try {
            const jsonString = fs.readFileSync("./src/registros.json");
            let marcaciones: Marcacion[] = [];
            await JSON.parse(jsonString.toString()).forEach((value: any) => {
                let marcacion = new Marcacion();
                marcacion.ci = value.user_id;
                marcacion.fechaMarcaje = value.timestamp
                marcacion.terminal = terminal;
                marcaciones.push(marcacion)
            });
            const marcacionRepo = AppDataSource.getRepository(Marcacion);
            await marcacionRepo.insert(marcaciones);
        } catch (err) {
            console.log(err);
            return;
        }

       /* const getUsuariosPy = async () => {
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
        await getUsuariosPy();*/
        let usuarios: Usuario[]= [];
        let aux = [{"uid":1,"role":0,"password":"","name":"PEDRO DINO","cardno":0,"user_id":"9420724"},{"uid":12,"role":0,"password":"111","name":"testing","cardno":0,"user_id":"9"},{"uid":4,"role":0,"password":"0895","name":"","cardno":0,"user_id":"5297992"},{"uid":7,"role":0,"password":"","name":"RUTH  PEREZ CUBA","cardno":0,"user_id":"7948392"},{"uid":8,"role":14,"password":"","name":"","cardno":0,"user_id":"7912911"},{"uid":10,"role":0,"password":"","name":"CARMELO VALENCIA CARBALL","cardno":0,"user_id":"5317614"},{"uid":13,"role":0,"password":"","name":"LOURDES MAITA VELIZ ","cardno":0,"user_id":"14850113"},{"uid":18,"role":0,"password":"","name":"NELIA  LOPEZ AREVALO","cardno":0,"user_id":"13658745"},{"uid":19,"role":0,"password":"","name":"ANDREA  SERRUDO VILLCA","cardno":0,"user_id":"12556096"},{"uid":20,"role":14,"password":"","name":"LUIS","cardno":0,"user_id":"9413936"},{"uid":21,"role":0,"password":"","name":"DENIS FLORES  ARGOTE","cardno":0,"user_id":"6493074"},{"uid":22,"role":14,"password":"","name":"DENILSON","cardno":0,"user_id":"1"}]
        aux.forEach((value: any) => {
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
    } else {
        res.send(moment(terminal?.ult_sincronizacion).utc(true).toDate())
    }
}

export const verTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    res.send(terminal)
}

function changeTimezone(fecha: any, zonaHoraria: string) {
    var invdate = new Date(fecha.toLocaleString('en-US', {
        timeZone: zonaHoraria
    }));
    var diff = fecha.getTime() - invdate.getTime();
    return new Date(fecha.getTime() - diff); // needs to substract
}