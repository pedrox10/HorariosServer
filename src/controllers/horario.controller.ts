import {Request, Response} from "express"

export const crearHorario = (req: Request, res: Response) => {
    console.log(req.body)
    res.send("Crear Horario")
}