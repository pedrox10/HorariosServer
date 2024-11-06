import {Request, Response} from "express"

export const crearUsuario = (req: Request, res: Response) => {
    console.log(req.body)
    res.send("Crear Usuarios")
}