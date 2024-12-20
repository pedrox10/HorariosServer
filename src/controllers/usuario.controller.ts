import {Request, Response} from "express"
import {Usuario} from "../entity/Usuario";
import path from "path";
import {Terminal} from "../entity/Terminal";
import {Marcacion} from "../entity/Marcacion";
import moment, {Moment} from 'moment';
import * as MomentExt from 'moment';
import {InfoMarcacion} from "../models/InfoMarcacion";
import {extendMoment} from "moment-range";
import {Jornada} from "../entity/Jornada";
import {ResumenMarcacion} from "../models/ResumenMarcacion";

const momentExt = extendMoment(MomentExt);

export const getUsuarios = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({
        where: {id: parseInt(id)}, relations: {
            usuarios: true,
        }
    });
    res.send(terminal?.usuarios)
}

export const getUsuario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    res.send(usuario)
}

export const getMarcaciones = async (req: Request, res: Response) => {
    const {id} = req.params;
    const usuario = await Usuario.findOne({
        where: {id: parseInt(id)}, relations: {
            terminal: true,
        }
    });
    const marcaciones = await Marcacion.findBy({ci: usuario?.ci, terminal: usuario?.terminal})
    res.send(marcaciones)
}

export const getInfoMarcaciones = async (req: Request, res: Response) => {
    const {id, ini, fin} = req.params;
    let usuario = await Usuario.findOne({
        where: {id: parseInt(id)}, relations: {
            terminal: true,
        }
    });
    if (usuario) {
        let fecha_ini = moment(ini).format('yyyy-MM-DD')
        let fecha_fin = moment(fin).format('yyyy-MM-DD')
        console.log("Ini: " + fecha_ini + " Fin: " + fecha_fin)
        let range = momentExt.range(moment(fecha_ini).toDate(), moment(fecha_fin).toDate())
        let resumenMarcacion: ResumenMarcacion = new ResumenMarcacion();
        let infoMarcaciones: InfoMarcacion[] = [];
        let totalCantRetrasos: number = 0
        let totalMinRetrasos: number = 0
        let totalSinMarcar: number = 0
        for (let fecha of range.by("day")) {
            let jornada = await getJornadaPor(usuario, fecha.format("YYYY-MM-DD"))
            let infoMarcacion = new InfoMarcacion();
            let cantRetrasos: number = 0
            let minRetrasos: number = 0
            let sinMarcar: number = 0
            infoMarcacion.activo = false
            let hayPriRetraso: boolean = false
            let haySegRetraso: boolean = false
            let dia = moment(fecha).locale("es").format("ddd DD")
            dia = dia.charAt(0).toUpperCase() + dia.substring(1)
            infoMarcacion.dia = dia
            if (jornada) {
                infoMarcacion.horario = jornada.horario.nombre;
                infoMarcacion.numTurnos = jornada.getNumTurnos();
                if (jornada.getNumTurnos() == 2) {
                    let priEntradasM: Moment[] = [];
                    let priSalidasM: Moment[] = [];
                    let segEntradasM: Moment[] = [];
                    let segSalidasM: Moment[] = [];
                    //Genero los rangos para los cuatro posibles casos:
                    let priEntIni = moment(jornada.fecha + " " + "00:00").format('YYYY-MM-DD HH:mm')
                    let priEntFin = moment(jornada.fecha + " " + jornada.priTurno.horaSalida).subtract(1, "hours").format('YYYY-MM-DD HH:mm')
                    let priEntRango = momentExt.range(moment(priEntIni).toDate(), moment(priEntFin).toDate())
                    let dif = moment(jornada.fecha + " " + jornada.segTurno.horaEntrada).diff(moment(jornada.fecha + " " + jornada.priTurno.horaSalida), "hours")
                    let priSalFin = moment(jornada.fecha + " " + jornada.priTurno.horaSalida).add(dif / 2, "hours")
                    let priSalRango = momentExt.range(moment(priEntFin).toDate(), moment(priSalFin).toDate())
                    let segEntFin = moment(jornada.fecha + " " + jornada.segTurno.horaSalida).subtract(1, "hours").format('YYYY-MM-DD HH:mm')
                    let segEntRango = momentExt.range(moment(priSalFin).toDate(), moment(segEntFin).toDate())
                    let segSalFin = moment(jornada.fecha + " " + "23:59").format('YYYY-MM-DD HH:mm')
                    let segSalRango = momentExt.range(moment(segEntFin).toDate(), moment(segSalFin).toDate())
                    //Ontengo las marcaciones segun fecha y clasifico segun rangos
                    let marcaciones = await getMarcacionesPor(usuario, fecha.format("YYYY-MM-DD"))
                    marcaciones.forEach(marcacion => {
                        let horaMarcaje = moment(marcacion.fecha + " " + marcacion.hora).format('YYYY-MM-DD HH:mm')
                        console.log(horaMarcaje)
                        if (priEntRango.contains(moment(horaMarcaje), {excludeEnd: true}))
                            priEntradasM.push(moment(horaMarcaje))
                        else if (priSalRango.contains(moment(horaMarcaje), {excludeEnd: true}))
                            priSalidasM.push(moment(horaMarcaje))
                        else if (segEntRango.contains(moment(horaMarcaje), {excludeEnd: true}))
                            segEntradasM.push(moment(horaMarcaje))
                        else if (segSalRango.contains(moment(horaMarcaje)))
                            segSalidasM.push(moment(horaMarcaje))
                    })
                    let priEntradas: string[] = [];
                    let priSalidas: string[] = [];
                    let segEntradas: string[] = [];
                    let segSalidas: string[] = [];

                    if (priEntradasM.length > 0) {
                        priEntradasM.sort((a, b) => a.diff(b));
                        priEntradasM.map(entrada => {
                            priEntradas.push(entrada.format("HH:mm"))
                        })
                        infoMarcacion.priEntradas = priEntradas
                        let retraso = priEntradasM.at(0)?.diff(moment(jornada.fecha + " " + jornada.priTurno.horaEntrada), "minutes")
                        if(retraso){
                            if (retraso > jornada.horario.tolerancia) {
                                cantRetrasos++;
                                totalCantRetrasos++;
                                minRetrasos = minRetrasos + retraso
                                totalMinRetrasos = totalMinRetrasos +retraso;
                                hayPriRetraso = true
                            }
                        }
                    } else {
                        sinMarcar++
                        totalSinMarcar++
                    }

                    if (priSalidasM.length > 0) {
                        priSalidasM.sort((a, b) => a.diff(b));
                        priSalidasM.map(salida => {
                            priSalidas.push(salida.format("HH:mm"))
                        })
                        infoMarcacion.priSalidas = priSalidas
                    } else {
                        sinMarcar++
                        totalSinMarcar++
                    }

                    if (segEntradasM.length > 0) {
                        segEntradasM.sort((a, b) => a.diff(b));
                        segEntradasM.map(entrada => {
                            segEntradas.push(entrada.format("HH:mm"))
                        })
                        infoMarcacion.segEntradas = segEntradas
                        let retraso = segEntradasM.at(0)?.diff(moment(jornada.fecha + " " + jornada.segTurno.horaEntrada), "minutes")
                        if(retraso){
                            if (retraso > jornada.horario.tolerancia){
                                cantRetrasos++;
                                totalCantRetrasos++
                                minRetrasos = minRetrasos + retraso
                                totalMinRetrasos = totalMinRetrasos + retraso
                                haySegRetraso = true
                            }
                        }
                    } else {
                        sinMarcar++
                        totalSinMarcar++
                    }

                    if (segSalidasM.length > 0) {
                        segSalidasM.sort((a, b) => a.diff(b));
                        segSalidasM.map(salida => {
                            segSalidas.push(salida.format("HH:mm"))
                        })
                        infoMarcacion.segSalidas = segSalidas
                    } else {
                        sinMarcar++
                        totalSinMarcar++
                    }
                    infoMarcacion.activo = true
                    infoMarcacion.noMarcados = sinMarcar
                    infoMarcacion.cantRetrasos = cantRetrasos
                    infoMarcacion.minRetrasos = minRetrasos
                    infoMarcacion.hayPriRetraso = hayPriRetraso
                    infoMarcacion.haySegRetraso = haySegRetraso
                } else {
                    if (jornada.getNumTurnos() == 1) {
                        let priEntradasM: Moment[] = [];
                        let priSalidasM: Moment[] = [];
                        //Genero los rangos para entrdas y salidas:
                        let priEntIni = moment(jornada.fecha + " " + "00:00").format('YYYY-MM-DD HH:mm')
                        let priEntFin = moment(jornada.fecha + " " + jornada.priTurno.horaSalida).subtract(1, "hours").format('YYYY-MM-DD HH:mm')
                        let priEntRango = momentExt.range(moment(priEntIni).toDate(), moment(priEntFin).toDate())

                        let priSalFin = moment(jornada.fecha + " " + "23:59").format('YYYY-MM-DD HH:mm')
                        let priSalRango = momentExt.range(moment(priEntFin).toDate(), moment(priSalFin).toDate())
                        //Ontengo las marcaciones segun fecha y clasifico segun rangos
                        let marcaciones = await getMarcacionesPor(usuario, fecha.format("YYYY-MM-DD"))
                        marcaciones.forEach(marcacion => {
                            let horaMarcaje = moment(marcacion.fecha + " " + marcacion.hora).format('YYYY-MM-DD HH:mm')
                            console.log(horaMarcaje)
                            if (priEntRango.contains(moment(horaMarcaje), {excludeEnd: true}))
                                priEntradasM.push(moment(horaMarcaje))
                            else if (priSalRango.contains(moment(horaMarcaje)))
                                priSalidasM.push(moment(horaMarcaje))
                        })
                        let priEntradas: string[] = [];
                        let priSalidas: string[] = [];

                        if (priEntradasM.length > 0) {
                            priEntradasM.sort((a, b) => a.diff(b));
                            priEntradasM.map(entrada => {
                                priEntradas.push(entrada.format("HH:mm"))
                            })
                            infoMarcacion.priEntradas = priEntradas
                            let retraso = priEntradasM.at(0)?.diff(moment(jornada.fecha + " " + jornada.priTurno.horaEntrada), "minutes")
                            if(retraso){
                                if (retraso > jornada.horario.tolerancia) {
                                    cantRetrasos++;
                                    totalCantRetrasos++
                                    minRetrasos = minRetrasos + retraso
                                    totalMinRetrasos = totalMinRetrasos + retraso
                                    hayPriRetraso = true
                                }
                            }
                        } else {
                            sinMarcar++
                            totalSinMarcar++
                        }

                        if (priSalidasM.length > 0) {
                            priSalidasM.sort((a, b) => a.diff(b));
                            priSalidasM.map(salida => {
                                priSalidas.push(salida.format("HH:mm"))
                            })
                            infoMarcacion.priSalidas = priSalidas
                        } else {
                            sinMarcar++
                            totalSinMarcar++
                        }
                        infoMarcacion.noMarcados = sinMarcar
                        infoMarcacion.cantRetrasos = cantRetrasos
                        infoMarcacion.minRetrasos = minRetrasos
                        infoMarcacion.hayPriRetraso = hayPriRetraso
                        infoMarcacion.activo = true
                    } else {
                        infoMarcacion.mensaje = "Dia de descanso"
                    }
                }
            } else {
                infoMarcacion.horario = "Ninguno"
                infoMarcacion.mensaje = "Asigna antes un horario"
            }
            infoMarcaciones.push(infoMarcacion)
        }
        resumenMarcacion.totalCantRetrasos = totalCantRetrasos
        resumenMarcacion.totalMinRetrasos = totalMinRetrasos
        resumenMarcacion.totalSinMarcar = totalSinMarcar
        resumenMarcacion.infoMarcaciones = infoMarcaciones
        res.send(resumenMarcacion)
    }
}

async function getJornadaPor(usuario: Usuario, fecha: string) {
    let jornada = await Jornada.findOne({
        where: {usuario: usuario, fecha: moment(fecha).toDate()}, relations: {
            priTurno: true, segTurno: true, horario: true
        }
    })
    return jornada;
}

async function getMarcacionesPor(usuario: Usuario, fecha: string) {
    let marcaciones = await Marcacion.find({
        where: {
            ci: usuario?.ci,
            terminal: usuario?.terminal,
            fecha: moment(fecha).toDate()
        },
    })
    return marcaciones;
}

