import {Request, Response} from "express";
import {Terminal} from "../entity/Terminal";
import path from "path";
import moment from "moment";

const envPython = path.join(__dirname, "../scriptpy/envpy", "bin", "python3");
const spawn = require('await-spawn');

export const conectar = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pyFileConectar = 'src/scriptpy/conectar.py';
        let args = [terminal.ip, terminal.puerto];
        args.unshift(pyFileConectar);
        const pyprogConectar = await spawn(envPython, args);
        return res.status(200).json(pyprogConectar.toString())
    }
}

export const infoCapacidad = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pyInfoCapacidad = 'src/scriptpy/info_capacidad.py';
        let args = [terminal.ip, terminal.puerto];
        args.unshift(pyInfoCapacidad);
        const pyprogInfoCapacidad = await spawn(envPython, args);
        return res.status(200).json(pyprogInfoCapacidad.toString())
    }
}

export const infoExtra = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pyInfoExtra = 'src/scriptpy/info_extra.py';
        let args = [terminal.ip, terminal.puerto];
        args.unshift(pyInfoExtra);
        const pyprogInfoExtra = await spawn(envPython, args);
        return res.status(200).json(pyprogInfoExtra.toString())
    }
}

export const horaActual = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pyHoraActual = 'src/scriptpy/hora_actual.py';
        let args = [terminal.ip, terminal.puerto];
        args.unshift(pyHoraActual);
        const pyprogHoraActual = await spawn(envPython, args);
        return res.status(200).json(pyprogHoraActual.toString())
    }
}

export const sincronizarFecha = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pySincronizarFecha = 'src/scriptpy/cambiar_fecha.py';
        let args = [terminal.ip, terminal.puerto];
        args.push(moment().format("YYYY-MM-DDTHH:mm:ss"));
        args.unshift(pySincronizarFecha);
        const pyprogSincronizarFecha = await spawn(envPython, args);
        return res.status(200).json(pyprogSincronizarFecha.toString())
    }
}