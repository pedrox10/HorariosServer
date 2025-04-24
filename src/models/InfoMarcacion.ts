import {EstadoJornada} from "../entity/Jornada";

export class InfoMarcacion{
  dia:string;
  fecha: Date;
  horario: any;
  priEntradas: string[]
  priSalidas: string[]
  segEntradas: string[]
  segSalidas: string[]
  cantRetrasos: number
  minRetrasos: number
  noMarcados: number
  hayPriEntExcepcion?: any
  hayPriSalExcepcion?: any
  hayPriRetraso: boolean
  haySegRetraso: boolean
  activo:boolean
  mensaje:string
  numTurnos: number
  estado: EstadoJornada
  esInvierno:boolean
  esLactancia:boolean
  esJornadaDosDias:boolean

  constructor() {
  }
}