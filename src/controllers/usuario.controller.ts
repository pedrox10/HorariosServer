import {Request, Response} from "express"
import {Usuario} from "../entity/Usuario";
import path from "path";
import {Terminal} from "../entity/Terminal";
import {Marcacion} from "../entity/Marcacion";
import moment from 'moment';
import {Turno} from "../entity/Turno";

export const getUsuarios = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)}, relations: {
            usuarios: true,
        }});
    res.send(terminal?.usuarios)
}

export const getMarcaciones = async (req: Request, res: Response) => {
    const {id} = req.params;
    const usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    const marcaciones = await Marcacion.findBy( {ci: usuario?.ci, terminal: usuario?.terminal})
    console.log(moment(marcaciones.at(marcaciones.length-1)?.fechaMarcaje).utc(true).toDate())
    res.send(marcaciones)
}

export const getTurnos = async (req: Request, res: Response) => {
    const {id,fecha} = req.params;
    const usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    //const turnos = await Turno.findBy( {usuario: usuario?, fecha: fecha})
    //console.log(moment(turnos.at(turnos.length-1)?.fechaMarcaje).utc(true).toDate())
    //res.send(turnos)
}

export const agregarUsuario = async (req: Request, res: Response) => {
    const usuario = new Usuario()
    usuario.ci = req.body.ci
    usuario.nombre = req.body.nombre
    await usuario.save();
    console.log(usuario)
    res.send(usuario)
}

