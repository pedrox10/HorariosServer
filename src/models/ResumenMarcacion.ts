import {InfoMarcacion} from "./InfoMarcacion";
import {Usuario} from "../entity/Usuario";

export class ResumenMarcacion{
    usuario: Usuario;
    totalCantRetrasos:number;
    totalMinRetrasos: number;
    totalSinMarcar: number;
    infoMarcaciones: InfoMarcacion[];

    constructor() {
    }
}