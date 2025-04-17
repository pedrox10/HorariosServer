import mongoose from 'mongoose';
import { conectarMongo } from '../mongo.connection';

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