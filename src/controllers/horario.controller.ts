import {Request, Response} from "express"
import {AppDataSource} from "../data-source";
import {Horario} from "../entity/Horario";

export const crearHorario = async (req: Request, res: Response) => {
    const horario = new Horario()
    //res.send(terminal)
}

export const getHorario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const horario = await Horario.findOne({where: {id: parseInt(id)},});
    res.send(horario)
}

export const getHorarios= async (req: Request, res: Response) => {
    let horarios = await AppDataSource.manager.find(Horario)
    res.send(horarios)
}