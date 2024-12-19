import {Request, Response} from "express"
import {AppDataSource} from "../data-source";
import {Horario} from "../entity/Horario";
import {Usuario} from "../entity/Usuario";
import {In} from "typeorm";
import moment from "moment";
import {JornadaDia} from "../entity/JornadaDia";

export const crearHorario = async (req: Request, res: Response) => {
    const horario = new Horario()
    res.send(horario)
}

export const getHorario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const horario = await Horario.findOne({where: {id: parseInt(id)},});
    res.send(horario)
}

export const getHorarios= async (req: Request, res: Response) => {
    let horarios = await AppDataSource.manager.find(Horario, {relations: {jornadaDias: true}})
    res.send(horarios)
}

export const asignarHorario = async (req: Request, res: Response) => {
    const {id, ids, ini, fin, jornadas} = req.params;
    let horario = await Horario.findOne({where: {id: parseInt(id)},});
    let listaIds = ids.split(",")
    let usuarios = await Usuario.find({
        where: { id: In(listaIds) },
    });
    let fechaIni = moment(ini).format("YYYY-MM-DD")
    let fechaFin = moment(fin).format("YYYY-MM-DD")
    let listaJornadas: JornadaDia[];
    listaJornadas = JSON.parse(jornadas);
    for (let usuario of usuarios) {
        for(let jornada of listaJornadas) {
            console.log(jornada.dia)
        }
    }
    res.send(ini)
}