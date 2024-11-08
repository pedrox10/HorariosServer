import {Request, Response} from "express"
import {Terminal} from "../entity/Terminal";

export const crearTerminal = async (req: Request, res: Response) => {
    const terminal = new Terminal()
    terminal.nombre = req.body.nombre
    terminal.ip = req.body.ip
    terminal.puerto = req.body.puerto
    await terminal.save();
    res.send(terminal)
}