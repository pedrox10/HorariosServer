import {Request, Response} from "express"
import {Terminal} from "../entity/Terminal";
import {AppDataSource} from "../data-source";

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
    if(!terminal) {

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
    if(terminal?.ult_sincronizacion === null) {
        res.send({"res":"No fue sync"})
    } else {
        res.send({"res":changeTimezone(terminal?.ult_sincronizacion, "America/La_Paz").toString()})
    }
}

export const verTerminal = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    res.send(terminal)
}

function changeTimezone(date:any, ianatz: string) {
    var invdate = new Date(date.toLocaleString('en-US', {
        timeZone: ianatz
    }));
    var diff = date.getTime() - invdate.getTime();
    return new Date(date.getTime() - diff); // needs to substract
}