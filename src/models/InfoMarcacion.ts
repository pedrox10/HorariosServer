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
  cantSalAntes: number
  minRetrasos: number
  noMarcados: number
  hayPriEntExcepcion?: any
  hayPriSalExcepcion?: any
  haySegEntExcepcion?: any
  haySegSalExcepcion?: any
  hayPriRetraso: boolean
  haySegRetraso: boolean
  hayPriAntes: boolean
  haySegAntes: boolean
  activo:boolean
  mensaje:string
  numTurnos: number
  estado: EstadoJornada
  esInvierno:boolean
  esLactancia:boolean
  esJornadaDosDias:boolean
  primerDia?:any

  constructor() {
  }
}