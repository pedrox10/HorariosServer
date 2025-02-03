import {Request, Response} from "express"
import {Usuario} from "../entity/Usuario";
import {Terminal} from "../entity/Terminal";
import {Marcacion} from "../entity/Marcacion";
import moment, * as MomentExt from 'moment';
import {Moment} from 'moment';
import {InfoMarcacion} from "../models/InfoMarcacion";
import {DateRange, extendMoment} from "moment-range";
import {EstadoJornada, Jornada} from "../entity/Jornada";
import {ResumenMarcacion} from "../models/ResumenMarcacion";
import {ExcepcionTickeo, TipoExcepcion} from "../entity/ExcepcionTickeo";
import {Asueto, TipoAsueto} from "../entity/Asueto";
import {Between} from "typeorm";

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
    const usuario = await Usuario.findOne({where: {id: parseInt(id)}, relations: {terminal: true}});
    res.send(usuario)
}

export const editarUsuario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const {fechaAlta, fechaBaja, fechaCumpleano, estado} = req.body
    const usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    if (usuario) {
        usuario.fechaAlta = fechaAlta;
        usuario.fechaBaja = esVacio(fechaBaja) ? null : fechaBaja;
        usuario.fechaCumpleano = esVacio(fechaCumpleano) ? null : fechaCumpleano;
        usuario.estado = estado
        usuario.save()
        res.send(usuario)
    }
}

function esVacio(value: string) {
    return (value == null || (typeof value === "string" && value.trim().length === 0));
}

export const getJornada = async (req: Request, res: Response) => {
    const {id, fecha} = req.params;
    let usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    let jornada = await getJornadaPor(usuario!, moment(fecha).format('YYYY-MM-DD'))
    res.send(jornada)
}

export const getExcepciones = async (req: Request, res: Response) => {
    const {id, gestion} = req.params;
    const excepciones = await ExcepcionTickeo.find()
    res.send(excepciones)
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

export const getResumenMarcaciones = async (req: Request, res: Response) => {
    const {id, ini, fin} = req.params;
    let usuario = await Usuario.findOne({
        where: {id: parseInt(id)}, relations: {
            terminal: true,
        }
    });
    if (usuario) {
        let fechaIni = moment(ini).format('yyyy-MM-DD')
        let fechaFin = moment(fin).format('yyyy-MM-DD')
        let resumenMarcacion: ResumenMarcacion = new ResumenMarcacion();
        let infoMarcaciones: InfoMarcacion[] = [];
        let rango = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())

        if (moment(fechaIni).isBefore(moment(usuario.fechaAlta)) && moment(fechaFin).isBefore(usuario.fechaAlta)) {
            let rangoSinRegistros = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())
            infoMarcaciones.push(...getSinRegistros(rangoSinRegistros))
            resumenMarcacion.infoMarcaciones = infoMarcaciones
            res.send(resumenMarcacion)
        } else {
            let rangoValido: DateRange;
            let hayFeriados = false;
            let hayExcepcionesCompletas = false;
            if (rango.contains(moment(usuario.fechaAlta), {excludeStart: true})) {
                let rangoSinRegistros = momentExt.range(moment(fechaIni).toDate(), moment(usuario.fechaAlta).subtract("day", 1).toDate())
                rangoValido = momentExt.range(moment(usuario.fechaAlta).toDate(), moment(fechaFin).toDate())
                infoMarcaciones.push(...getSinRegistros(rangoSinRegistros))
            } else {
                rangoValido = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())
            }
            let feriados: Asueto[] = await Asueto.findBy({
                fecha: Between(rangoValido.start.toDate(), rangoValido.end.toDate()),
                tipo: TipoAsueto.todos
            })
            if (feriados.length > 0)
                hayFeriados = true
            let excepcionesCompletas: ExcepcionTickeo[] = await ExcepcionTickeo.find({
                where: {
                    fecha: Between(rangoValido.start.toDate(), rangoValido.end.toDate()),
                    tipo: TipoExcepcion.completa,
                    usuario: usuario
                }, relations: {licencia: true}
            })
            if (excepcionesCompletas.length > 0)
                hayExcepcionesCompletas = true

            let totalCantRetrasos: number = 0
            let totalMinRetrasos: number = 0
            let totalSinMarcar: number = 0

            for (let fecha of rangoValido.by("day")) {
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
                    let feriado: Asueto | any;
                    let excepcionCompleta: ExcepcionTickeo | any;
                    if (hayFeriados) {
                        feriado = getFeriado(jornada, feriados);
                        if (feriado)
                            jornada.estado = EstadoJornada.feriado;
                    }
                    if (hayExcepcionesCompletas) {
                        excepcionCompleta = getExcepcionCompleta(jornada, excepcionesCompletas)
                        if (excepcionCompleta) {
                            switch (excepcionCompleta.licencia.nombre) {
                                case "Vacacion":
                                    jornada.estado = EstadoJornada.vacacion
                                    break;
                                case "Permiso":
                                    jornada.estado = EstadoJornada.permiso
                                    break;
                                case "Baja Medica":
                                    jornada.estado = EstadoJornada.baja_medica
                                    break;
                                case "Licencia":
                                    jornada.estado = EstadoJornada.licencia
                                    break;
                                default :
                                    jornada.estado = EstadoJornada.otro
                                    break;
                            }
                        }
                    }
                    if (jornada.estado != EstadoJornada.dia_libre && jornada.estado != EstadoJornada.activa) {
                        infoMarcacion.activo = false
                        if(jornada.estado == EstadoJornada.feriado) {
                            infoMarcacion.horario = "Feriado";
                            infoMarcacion.mensaje = feriado.nombre;
                            infoMarcacion.estado = EstadoJornada.feriado
                        } else {
                            infoMarcacion.horario = excepcionCompleta.licencia.nombre;
                            infoMarcacion.mensaje = excepcionCompleta.detalle;
                            switch (jornada.estado) {
                                case EstadoJornada.vacacion:
                                    infoMarcacion.estado = EstadoJornada.vacacion
                                    break;
                                case EstadoJornada.permiso:
                                    infoMarcacion.estado = EstadoJornada.permiso
                                    break;
                                case EstadoJornada.baja_medica:
                                    infoMarcacion.estado = EstadoJornada.baja_medica
                                    break;
                                case EstadoJornada.licencia:
                                    infoMarcacion.estado = EstadoJornada.licencia
                                    break;
                                case EstadoJornada.otro:
                                    infoMarcacion.estado = EstadoJornada.otro
                                    break;
                            }
                        }
                    } else {
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
                            //Obtengo las marcaciones segun fecha y clasifico segun rangos
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
                                if (retraso) {
                                    if (retraso > jornada.horario.tolerancia) {
                                        cantRetrasos++;
                                        totalCantRetrasos++;
                                        minRetrasos = minRetrasos + retraso
                                        totalMinRetrasos = totalMinRetrasos + retraso;
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
                                if (retraso) {
                                    if (retraso > jornada.horario.tolerancia) {
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
                                    if (retraso) {
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
                                infoMarcacion.estado = EstadoJornada.dia_libre
                            }
                        }
                    }
                } else {
                    infoMarcacion.horario = "Ninguno"
                    infoMarcacion.mensaje = "Asigna antes un horario"
                    infoMarcacion.estado = EstadoJornada.sin_asignar
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

function getFeriado(jornada: Jornada, feriados: Asueto[]) {
    let res: Asueto | any = null;
    for (let feriado of feriados) {
        if (feriado.fecha === jornada.fecha) {
            res = feriado
            break;
        }
    }
    return res;
}

function getExcepcionCompleta(jornada: Jornada, excepcionesCompletas: ExcepcionTickeo[]) {
    let res: ExcepcionTickeo | any = null;
    for (let excepcionCompleta of excepcionesCompletas) {
        if (excepcionCompleta.fecha === jornada.fecha) {
            res = excepcionCompleta
            break;
        }
    }
    return res;
}

function getSinRegistros(rangoSinRegistros: DateRange) {
    let infoMarcaciones: InfoMarcacion[] = [];
    for (let fecha of rangoSinRegistros.by("day")) {
        let infoMarcacion = new InfoMarcacion();
        let dia = moment(fecha).locale("es").format("ddd DD")
        dia = dia.charAt(0).toUpperCase() + dia.substring(1)
        infoMarcacion.dia = dia
        infoMarcacion.horario = "Sin registros"
        infoMarcacion.activo = false
        infoMarcacion.mensaje = "Funcionario no fué registrado"
        infoMarcaciones.push(infoMarcacion)
    }
    return infoMarcaciones;
}