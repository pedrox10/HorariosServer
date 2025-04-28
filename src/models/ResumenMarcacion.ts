import {InfoMarcacion} from "./InfoMarcacion";
import {Usuario} from "../entity/Usuario";

export class ResumenMarcacion{
    usuario: Usuario;
    totalCantRetrasos:number;
    totalMinRetrasos: number;
    totalSinMarcar: number;
    totalAusencias: number;
    diasComputados: number;
    infoMarcaciones: InfoMarcacion[];
    mensajeError?: string | any

    constructor() {
    }
}