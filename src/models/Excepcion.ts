import {Usuario} from "../entity/Usuario";

export class Excepcion {
    fecha: Date
    jornada:string
    horaIni: string
    horaFin: string
    detalle: string
    licencia: string
    turno?: string
    esInterrupcion?: boolean
    motivo?: string

    constructor() {
    }
}