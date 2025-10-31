import {Request, Response} from "express";
import {Terminal} from "../entity/Terminal";
import path from "path";
import moment from "moment";
import {Usuario} from "../entity/Usuario";

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

export const borrarMarcaciones = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pyBorrarMarcaciones = 'src/scriptpy/borrar_marcaciones.py';
        let args = [terminal.ip, terminal.puerto];
        args.unshift(pyBorrarMarcaciones);
        const pyprogBorrarMarcaciones = await spawn(envPython, args);
        return res.status(200).json(pyprogBorrarMarcaciones.toString())
    }
}

export const borrarTodo = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pyBorrarTodo = 'src/scriptpy/borrar_todo.py';
        let args = [terminal.ip, terminal.puerto];
        args.unshift(pyBorrarTodo);
        const pyprogBorrarTodo = await spawn(envPython, args);
        return res.status(200).json(pyprogBorrarTodo.toString())
    }
}

export const apagar = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pyApagar = 'src/scriptpy/apagar.py';
        let args = [terminal.ip, terminal.puerto];
        args.unshift(pyApagar);
        const pyprogApagar = await spawn(envPython, args);
        return res.status(200).json(pyprogApagar.toString())
    }
}

export const reiniciar = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)},});
    if (terminal) {
        const pyReiniciar = 'src/scriptpy/reiniciar.py';
        let args = [terminal.ip, terminal.puerto];
        args.unshift(pyReiniciar);
        const pyprogReiniciar = await spawn(envPython, args);
        return res.status(200).json(pyprogReiniciar.toString())
    }
}

export const clonarUsuario = async (req: Request, res: Response) => {
    const {idUsuario, idOrigen, idDestino, ci} = req.params;
    const terminalOrigen = await Terminal.findOne({where: {id: parseInt(idOrigen)},});
    const terminalDestino = await Terminal.findOne({where: {id: parseInt(idDestino)},});
    const usuario = await Usuario.findOne({where: {id: parseInt(idUsuario)},});
    const pyClonar = 'src/scriptpy/clonar_usuario.py';
    if(terminalOrigen && terminalDestino && usuario) {
        let args = [terminalOrigen.ip, terminalDestino.ip, usuario.uid, ci];
        args.unshift(pyClonar);
        const pyprogClonar = await spawn(envPython, args);
        console.log(pyprogClonar.toString())
        //Ya no devuelvo json porque python ya lo hace
        return res.status(200).send(pyprogClonar.toString())
    }
}

export const editarEnBiometrico = async (req: Request, res: Response) => {
    const {idUsuario, idOrigen, idDestino} = req.params;
    res.status(200).json({accion: "editar_en_biometrico"})
    //let resumenMarcacion = await getReporteMarcaciones(id, ini, fin);
    //res.send(resumenMarcacion);
}

export const eliminarFuncionarios = async (req: Request, res: Response) => {
    const { idTerminal , uids, cis } = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(idTerminal)},});
    console.log("terminal: " + idTerminal + " " + uids + " " + cis)
    //const idsUsuarios = uids.split(",");
    const pyEliminarFuncionarios = 'src/scriptpy/eliminar_usuarios.py';
    if(terminal) {
        let args = [terminal.ip, uids, cis];
        args.unshift(pyEliminarFuncionarios);
        const pyprogEliminarFuncionarios = await spawn(envPython, args);
        console.log(pyprogEliminarFuncionarios.toString())
        //Ya no devuelvo json porque python ya lo hace
        return res.status(200).send(pyprogEliminarFuncionarios.toString())
    }
};

