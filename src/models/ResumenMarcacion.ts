import {InfoMarcacion} from "./InfoMarcacion";
import {Usuario} from "../entity/Usuario";

export class ResumenMarcacion{
    usuario: Usuario;
    totalCantRetrasos:number;
    totalMinRetrasos: number;
    multaRetrasos?: number;
    totalSinMarcar: number;
    multaSinMarcar?: number;
    totalSalAntes: number;
    multaSalAntes?: number;
    totalAusencias: number;
    multaAusencias?: number;
    totalPermisosSG: number;
    diasComputados: number;
    infoMarcaciones: InfoMarcacion[];
    mensajeError?: string | any
    sinAsignar?: number;

    constructor() {
    }
}