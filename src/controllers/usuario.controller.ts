import {Request, Response} from "express"
import {Usuario} from "../entity/Usuario";
import path from "path";
import {Terminal} from "../entity/Terminal";
import {Marcacion} from "../entity/Marcacion";
import moment from 'moment';
import {Turno} from "../entity/Turno";
import {AppDataSource} from "../data-source";

export const getUsuarios = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({where: {id: parseInt(id)}, relations: {
            usuarios: true,
        }});
    res.send(terminal?.usuarios)
}

export const getUsuario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    res.send(usuario)
}

export const getMarcaciones = async (req: Request, res: Response) => {
    const {id} = req.params;
    const usuario = await Usuario.findOne({where: {id: parseInt(id)}, relations: {
            terminal: true,
        }});
    const marcaciones = await Marcacion.findBy( {ci: usuario?.ci, terminal: usuario?.terminal})
    console.log(moment(marcaciones.at(marcaciones.length-1)?.fechaMarcaje).utc(true).toDate())
    res.send(marcaciones)
}

export const getTurnos = async (req: Request, res: Response) => {
    const {id,fecha} = req.params;
    let usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    let aux = moment(fecha).format('yyyy-MM-DD')
    console.log(aux)
    console.log(moment(aux).utc(true).toDate())
    if(usuario){
        /*const queryRunner = await AppDataSource.createQueryRunner();
        var result = await queryRunner.manager.query(
            "select * from turno t WHERE t.usuarioId = 82 AND t.fecha = '2024-12-09'"
        );
        await console.log(result)*/

        const turnos = await Turno.findBy( {usuario: usuario, fecha: moment(aux).toDate()})
        console.log(turnos.at(0)?.horaEntrada)
        res.send(turnos)
    }
}

export const agregarUsuario = async (req: Request, res: Response) => {
    const usuario = new Usuario()
    usuario.ci = req.body.ci
    usuario.nombre = req.body.nombre
    await usuario.save();
    console.log(usuario)
    res.send(usuario)
}

