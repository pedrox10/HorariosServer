import {Request, Response} from "express"
import {Usuario} from "../entity/Usuario";
import path from "path";

const envPython = path.join(__dirname, "../scriptpy/envpy", "bin", "python3");
const spawn = require('await-spawn');

export const getUsuarios = (req: Request, res: Response) => {
    let ip = req.params.ip;
    let puerto = req.params.puerto;
    const getUsuariosPy = async () => {
        try {
            const pyFile = 'src/scriptpy/usuarios.py';
            const args = [ip];
            args.unshift(pyFile);
            const pyprog = await spawn(envPython, args);
            res.send(pyprog.toString())
        } catch (e: any) {
            console.log(e.stderr.toString())
        }
    }
    getUsuariosPy()
    /*let aux = [{"uid":1,"role":0,"password":"","name":"PEDRO DINO","cardno":0,"user_id":"9420724"},{"uid":12,"role":0,"password":"111","name":"testing","cardno":0,"user_id":"9"},{"uid":4,"role":0,"password":"0895","name":"","cardno":0,"user_id":"5297992"},{"uid":7,"role":0,"password":"","name":"RUTH  PEREZ CUBA","cardno":0,"user_id":"7948392"},{"uid":8,"role":14,"password":"","name":"","cardno":0,"user_id":"7912911"},{"uid":10,"role":0,"password":"","name":"CARMELO VALENCIA CARBALL","cardno":0,"user_id":"5317614"},{"uid":13,"role":0,"password":"","name":"LOURDES MAITA VELIZ ","cardno":0,"user_id":"14850113"},{"uid":18,"role":0,"password":"","name":"NELIA  LOPEZ AREVALO","cardno":0,"user_id":"13658745"},{"uid":19,"role":0,"password":"","name":"ANDREA  SERRUDO VILLCA","cardno":0,"user_id":"12556096"},{"uid":20,"role":14,"password":"","name":"LUIS","cardno":0,"user_id":"9413936"},{"uid":21,"role":0,"password":"","name":"DENIS FLORES  ARGOTE","cardno":0,"user_id":"6493074"},{"uid":22,"role":14,"password":"","name":"DENILSON","cardno":0,"user_id":"1"}]
    res.send(aux)*/
}

export const getMarcaciones = (req: Request, res: Response) => {
    let ip = req.params.ip;
    let puerto = req.params.puerto;
    const getMarcacionesPy = async () => {
        try {
            const pyFile = 'src/scriptpy/marcaciones.py';
            const args = [ip];
            args.unshift(pyFile);
            const pyprog = await spawn(envPython, args);
            res.send(pyprog.toString())
        } catch (e: any) {
            console.log(e.stderr.toString())
        }
    }
    getMarcacionesPy()
    /*try {
        const jsonString = fs.readFileSync("./src/registros.json");
        res.send(JSON.parse(jsonString.toString()));
      } catch (err) {
        console.log(err);
        return;
      }*/
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
