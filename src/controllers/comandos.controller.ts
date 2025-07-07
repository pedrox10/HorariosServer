import {Request, Response} from "express";
import {Terminal} from "../entity/Terminal";
import path from "path";

const envPython = path.join("python");
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