import {InfoMarcacion} from "./InfoMarcacion";
import {Usuario} from "../entity/Usuario";

export class ResumenMarcacion{
    usuario: Usuario;
    totalCantRetrasos:number;
    totalMinRetrasos: number;
    totalSalAntes: number;
    totalSinMarcar: number;
    totalAusencias: number;
    totalPermisosSG: number;
    diasComputados: number;
    infoMarcaciones: InfoMarcacion[];
    mensajeError?: string | any
    sinAsignar?: number;

    constructor() {
    }
}