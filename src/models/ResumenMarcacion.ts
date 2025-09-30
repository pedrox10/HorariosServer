import {InfoMarcacion} from "./InfoMarcacion";
import {Usuario} from "../entity/Usuario";

export class ResumenMarcacion{
    usuario: Usuario;
    totalCantRetrasos:number;
    totalMinRetrasos: number;
    multaRetrasos: number;
    totalSinMarcar: number;
    totalSinMarcarEntradas: number;
    totalSinMarcarSalidas: number;
    multaSinMarcar: number;
    totalSalAntes: number;
    multaSalAntes: number;
    totalAusencias: number;
    multaAusencias: number;
    totalSanciones: number;
    //Contadores de excepciones
    totalExcTickeos: number
    totalInterrupciones: number
    totalTolerancias: number
    totalExcepciones: number
    totalVacaciones: number;
    totalBajas: number;
    totalPermisosSG: number;
    totalPermisos: number;
    totalLicencias: number;
    totalCapacitaciones: number;
    totalOtros: number;
    diasComputados: number;
    infoMarcaciones: InfoMarcacion[];
    organigrama?: any
    sinAsignar?: number;

    constructor() {
    }
}