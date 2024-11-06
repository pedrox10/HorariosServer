import {Request, Response} from "express"

export const crearTerminal = (req: Request, res: Response) => {
    console.log(req.body)
    res.json("{message: 2}")
}