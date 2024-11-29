import {Request, Response} from "express"
import {Usuario} from "../entity/Usuario";
import path from "path";
import {Terminal} from "../entity/Terminal";
import {Marcacion} from "../entity/Marcacion";
import moment from 'moment';

const envPython = path.join(__dirname, "../scriptpy/envpy", "bin", "python3");
const spawn = require('await-spawn');

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
    const marcaciones = await Marcacion.find({where: {ci: usuario?.ci}})
    //console.log(moment(marcaciones.at(marcaciones.length-1)?.fechaMarcaje).utc(true).toDate())
    res.send(marcaciones)
}

export const agregarUsuario = async (req: Request, res: Response) => {
    const usuario = new Usuario()
    usuario.ci = req.body.ci
    usuario.nombre = req.body.nombre
    await usuario.save();
    console.log(usuario)
    res.send(usuario)
}

export const actualizarUsuario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const {ci, nombre} = req.body
    const usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    if(!usuario) {

    } else {
        usuario.ci = ci;
        usuario.nombre = nombre;
        usuario.save()
        res.send(usuario)
    }
}

export const eliminarUsuario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const aux = await Usuario.delete({id: parseInt(id)});
    console.log(aux)
    res.send(aux)
}
