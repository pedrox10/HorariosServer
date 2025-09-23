import mongoose from 'mongoose';
import { conectarMongo } from '../mongo.connection';
import { Request, Response } from "express";
import { UsuarioLogin } from "../entity/UsuarioLogin";
import bcrypt from "bcrypt";
import {IpUsuario} from "../entity/IpUsuario";
import fs from "fs";
import moment from "moment";
import {Terminal} from "../entity/Terminal";
import {Marcacion} from "../entity/Marcacion";
import {Interrupcion} from "../entity/Interrupcion";
import path from "path";

interface Funcionario {
  ci: number;
  _id: mongoose.Types.ObjectId;
}
interface Registro {
  id_funcionario: mongoose.Types.ObjectId;
  estado: boolean;
}
interface Dia {
  fecha: Date;
  jornada: string;
  turno: string;
}
interface Solicitud {
  id_registro: mongoose.Types.ObjectId;
  estado: string;
  dias: Dia[];
  tipo: string;
  detalle: string;
}

const funcionarioModel = mongoose.model<Funcionario>(
    'funcionarios',
    new mongoose.Schema({}, { strict: false })
);
const registroModel = mongoose.model<Registro>(
    'registros',
    new mongoose.Schema({}, { strict: false })
);
const solicitudModel = mongoose.model<Solicitud>(
    'solicitudes',
    new mongoose.Schema({}, { strict: false })
);

export async function obtenerSolicitudesAprobadasPorCI(ci: number) {
  await conectarMongo('mongodb://localhost:27017/management');

  try {
    const funcionario = await funcionarioModel.findOne({ ci });
    if (!funcionario) return null;

    const registro = await registroModel.findOne({ id_funcionario: funcionario._id, estado: true });
    if (!registro) return null;

    const solicitudes = await solicitudModel.find({ id_registro: registro._id, estado: 'APROBADO' });
    return solicitudes;
  } catch (error: any) {
    console.error('[Mongo] Error al obtener solicitudes:', error.message);
    return null;
  }
}

export const login = async (req: Request, res: Response) => {
  const { usuario, clave } = req.body;
  const usuarioBD = await UsuarioLogin.findOneBy({ nombreUsuario: usuario });
  if (!usuarioBD) {
    console.log("usuario no encontrado");
    return res.status(401).json({ mensaje: "Usuario no encontrado" });
  }
  const esClaveValida = await bcrypt.compare(clave, usuarioBD.clave);
  if (!esClaveValida) {
    console.log("clave invalida");
    return res.status(401).json({ mensaje: "La contraseña es incorrecta" });
  }
  const aux = req.ip || req.connection.remoteAddress || '';
  let ip = aux.replace(/^::ffff:/, '');
  const yaExiste = await IpUsuario.findOneBy({ ip, usuario: { id: usuarioBD.id } });
  if (!yaExiste) {
    const ipUsuario = new IpUsuario()
    ipUsuario.ip = ip;
    ipUsuario.usuario = usuarioBD;
    await ipUsuario.save();
  }
  return res.json({
    id: usuarioBD.id,
    nombre: usuarioBD.nombre,
    rol: usuarioBD.rol,
  });
}

export const resincronizar = async (req: Request, res: Response) => {
  const {id} = req.params;
  res.send( await verificarMarcaciones(parseInt(id)));
}

export async function verificarMarcaciones(terminalId: number){
  const rutaArchivo = path.join(__dirname, "../../respaldos/TRANSPORTE/TRANSPORTE_2025-09-21_01-03-17.json");
  const archivo = JSON.parse(fs.readFileSync(rutaArchivo, "utf8"));
  const terminal = await Terminal.findOne({ where: { id: terminalId } });
  if (!terminal) {
    throw new Error("Terminal no encontrado");
  }
  // todas las marcaciones del terminal en BD
  const marcacionesBD = await Marcacion.find({
    where: { terminal: terminal },
  });
  // convertir a set (para búsqueda rápida)
  const setBD = new Set(
      marcacionesBD.map(m => {
        // m.fecha ya es YYYY-MM-DD (Date o string), m.hora es string HH:mm:ss
        const fechaStr = moment(m.fecha).format("YYYY-MM-DD");
        const horaStr = typeof m.hora === "string"
            ? m.hora
            : moment(m.hora).format("HH:mm:ss");

        const fechaHora = `${fechaStr} ${horaStr}`;
        return `${m.ci}_${moment(fechaHora, "YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DD HH:mm:ss")}`;
      })
  );
  // revisar las que faltan
  const faltantes = archivo.marcaciones.filter((m: any) => {
    const clave = `${m.user_id}_${moment(m.timestamp).format("YYYY-MM-DD HH:mm:ss")}`;
    return !setBD.has(clave);
  });
  console.log(`Total en JSON: ${archivo.marcaciones.length}`);
  console.log(`Total en BD: ${marcacionesBD.length}`);
  console.log(`Faltantes: ${faltantes.length}`);
  return faltantes;
}