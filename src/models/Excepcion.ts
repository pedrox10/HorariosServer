import {Usuario} from "../entity/Usuario";

export class Excepcion {
    fecha: Date
    jornada:string
    turno: string
    horaIni: string
    horaFin: string
    detalle: string
    licencia: string

    constructor() {
    }
}