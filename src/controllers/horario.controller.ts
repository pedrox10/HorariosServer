import {Request, Response} from "express"
import {AppDataSource} from "../data-source";
import {Horario} from "../entity/Horario";
import {Usuario} from "../entity/Usuario";
import {Between, In} from "typeorm";
import moment, * as MomentExt from "moment";
import {JornadaDia} from "../entity/JornadaDia";
import {extendMoment} from "moment-range";
import {env} from "../environments/environments";
import {EstadoJornada, Jornada} from "../entity/Jornada";
import {Turno} from "../entity/Turno";
import {Asueto} from "../entity/Asueto";
import {Licencia} from "../entity/Licencia";
import {InfoExtraJornada} from "../models/InfoExtraJornada";
import {Moment} from "moment";

const momentExt = extendMoment(MomentExt);

export const crearHorario = async (req: Request, res: Response) => {
    const {horario, jornadas} = req.params;
    let jsonHorario = JSON.parse(horario)
    let nuevoHorario = new Horario();
    nuevoHorario.nombre = jsonHorario.nombre;
    nuevoHorario.tolerancia = jsonHorario.tolerancia;
    nuevoHorario.color = jsonHorario.color;
    nuevoHorario.descripcion = jsonHorario.descripcion;
    await nuevoHorario.save();

    let plantillaJornadas = JSON.parse(jornadas)
    let dias = env.dias_laborales.map((dia) => dia.toLowerCase());
    let jornadasDia: JornadaDia[] = [];
    let index = 0;
    for (let dia of dias) {
        let jornadaDia: JornadaDia = new JornadaDia();
        jornadaDia.habilitado = plantillaJornadas[dia + "_habilitado"]
        jornadaDia.dia = env.dias_laborales[index]
        index++
        jornadaDia.priEntrada = plantillaJornadas[dia + "_pri_entrada"]
        jornadaDia.priSalida = plantillaJornadas[dia + "_pri_salida"]
        jornadaDia.segEntrada = plantillaJornadas[dia + "_seg_entrada"]
        jornadaDia.segSalida = plantillaJornadas[dia + "_seg_salida"]
        jornadaDia.horario = nuevoHorario
        jornadasDia.push(jornadaDia)
    }
    const jornadaDiaRepo = AppDataSource.getRepository(JornadaDia);
    await jornadaDiaRepo.insert(jornadasDia);
    res.send(nuevoHorario)
}

export const eliminarHorario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const aux = await Horario.delete({id: parseInt(id)});
    res.send(aux)
}

export const getHorario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const horario = await Horario.findOne({where: {id: parseInt(id)},});
    res.send(horario)
}

export const getHorarios = async (req: Request, res: Response) => {
    let horarios = await AppDataSource.manager.find(Horario, {relations: {jornadaDias: true}})
    res.send(horarios)
}

export const getAsuetos = async (req: Request, res: Response) => {
    let asuetos = await AppDataSource.manager.find(Asueto)
    res.send(asuetos)
}

export const getLicencias = async (req: Request, res: Response) => {
    let licencias = await AppDataSource.manager.find(Licencia)
    res.send(licencias)
}

//Devuelve el numero de jornadas que tiene un Horario
export const getNumJornadas = async (req: Request, res: Response) => {
    const {id} = req.params;
    let horario = await Horario.findOneBy({id: parseInt(id)},);
    if (horario) {
        let jornadas = await Jornada.findBy({horario: horario});
        if (jornadas)
            res.send({"res" : jornadas.length})
    }
}

//Devuelve las jornadas asignadas a un Funcionario por gestion y mes
export const getJornadas = async (req: Request, res: Response) => {
    const {id, gestion, mes} = req.params;
    let usuario: Usuario | any = await Usuario.findOne({where: {id: parseInt(id)},});
    let calendar: any = []
    moment.updateLocale('es', {
        week: {
            dow: 1,
        },
    });
    let startWeek = moment().year(parseInt(gestion)).month(parseInt(mes)).startOf('month').week();
    let sumar = false;
    if(startWeek >= 52) {
        startWeek = 1
        sumar = true
    }
    let endWeek;
    if (parseInt(mes) === 11) {
        endWeek = 53
    } else {
        endWeek = moment().year(parseInt(gestion)).month(parseInt(mes)).endOf('month').week();
        if(sumar)
            endWeek = endWeek + 1
    }

    console.log("Inicio Semana: " + startWeek + " Fin semana: " + endWeek)
    for (var week = startWeek; week <= endWeek; week++) {
        let primerDiaSemana: Moment = moment().year(parseInt(gestion)).month(parseInt(mes)).week(week).startOf('week');
        let ultimoDiaSemana: Moment = moment().year(parseInt(gestion)).month(parseInt(mes)).week(week).endOf('week');
        let range = momentExt.range(primerDiaSemana, ultimoDiaSemana)
        let jornadas: Jornada[] | any = [];
        for (let fecha of range.by("day")) {
            let jornada = await getJornada(usuario, fecha.format("YYYY-MM-DD"))
            if (!jornada) {
                jornada = new Jornada();
                jornada.fecha = fecha.toDate();
                jornada.estado = EstadoJornada.sin_asignar;
                let infoExtra: InfoExtraJornada = new InfoExtraJornada()
                infoExtra.nombre = "SinAsignar"
                infoExtra.detalle = ""
                jornada.infoExtra = infoExtra
            }
            jornadas.push(jornada)
        }
        calendar.push({
            semana: week,
            dias: jornadas
        })
    }
    await res.send(calendar)
}

export const  getJornadasPorMes = async (req: Request, res: Response) => {
    const {id, gestion, mes} = req.params;
    let usuario: Usuario | any = await Usuario.findOne({where: {id: parseInt(id)}, relations: {jornadas: true}});
    let jornadas: Jornada[];
    for(let jornada of usuario.jornadas) {

    }
}

export const asignarHorario = async (req: Request, res: Response) => {
    const {id, ids, ini, fin, jornadas} = req.params;
    let horario = await Horario.findOne({where: {id: parseInt(id)},});
    let listaIds = ids.split(",")
    let usuarios = await Usuario.find({
        where: {id: In(listaIds)},
    });
    let fechaIni = moment(ini).format("YYYY-MM-DD");
    let fechaFin = moment(fin).format("YYYY-MM-DD");
    let jornadasBorrar: Jornada[] = [];
    let turnosBorrar: Turno[] = [];
    let jornadasSuperpuestas = await Jornada.find({
        where: {
            usuario: In(listaIds),
            fecha: Between(moment(fechaIni).toDate(), moment(fechaFin).toDate())
        }, relations: {priTurno: true, segTurno: true}
    },)
    for (let jornada of jornadasSuperpuestas) {
        if (jornada.getNumTurnos() == 2) {
            turnosBorrar.push(jornada.priTurno);
            turnosBorrar.push(jornada.segTurno);
        } else if (jornada.getNumTurnos() == 1) {
            turnosBorrar.push(jornada.priTurno)
        } else
            jornadasBorrar.push(jornada);
    }

    console.log(turnosBorrar)
    console.log(jornadasBorrar)
    const turnoRepo = AppDataSource.getRepository(Turno);
    await turnoRepo.remove(turnosBorrar)
    const jornadaRepo = AppDataSource.getRepository(Jornada);
    await jornadaRepo.remove(jornadasBorrar)

    let rango = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())
    let listaJornadas: JornadaDia[] = [];
    listaJornadas = JSON.parse(jornadas);
    let jornadasGuardar: Jornada[] = [];
    let turnosGuardar: Turno[] = [];

    for (let usuario of usuarios) {
        for (let fecha of rango.by("day")) {
            let dia: string | any = env.dias.at(moment(fecha).day())
            let jornadaDia = buscarEn(dia, listaJornadas)
            let jornada = new Jornada()
            jornada.fecha = moment(fecha.format("YYYY-MM-DD")).toDate();
            jornada.usuario = usuario
            jornada.horario = horario!;
            if (jornadaDia.habilitado) {
                if (getNumTurnos(jornadaDia) == 2) {
                    let priTurno = new Turno()
                    priTurno.horaEntrada = jornadaDia.priEntrada;
                    priTurno.horaSalida = jornadaDia.priSalida;
                    jornada.priTurno = priTurno;

                    let segTurno = new Turno()
                    segTurno.horaEntrada = jornadaDia.segEntrada;
                    segTurno.horaSalida = jornadaDia.segSalida;
                    jornada.segTurno = segTurno;

                    turnosGuardar.push(priTurno, segTurno);
                } else {
                    let priTurno = new Turno()
                    priTurno.horaEntrada = jornadaDia.priEntrada;
                    priTurno.horaSalida = jornadaDia.priSalida;
                    jornada.priTurno = priTurno
                    turnosGuardar.push(priTurno)
                }
            } else {
                jornada.estado = EstadoJornada.dia_libre
            }
            jornadasGuardar.push(jornada)
        }
    }
    await turnoRepo.insert(turnosGuardar).then(() => {
        console.log("termino turnos")
    })
    await jornadaRepo.insert(jornadasGuardar)
    res.send({"res": true})
}

export const eliminarJornada = async (req: Request, res: Response) => {
    const {id} = req.params;
    const jornada = await Jornada.findOne({
        where: {id: parseInt(id)}, relations: {
            priTurno: true, segTurno: true,
        }
    });
    if (jornada) {
        let pri = jornada.priTurno
        let seg = jornada.segTurno
        await jornada.remove()
        await pri.remove()
        await seg.remove()
    }
    res.send("true")
}

async function getJornada(usuario: Usuario, fecha: string) {
    let jornada = await Jornada.findOne({
        where: {usuario: usuario, fecha: moment(fecha).toDate()}, relations: {
            priTurno: true, segTurno: true, horario: true
        }
    })
    return jornada;
}

function getNumTurnos(jornadaDia: JornadaDia) {
    let res: number = 0;
    if (jornadaDia.priEntrada != null && jornadaDia.priSalida != null) {
        res = 1;
        if (jornadaDia.segEntrada != null && jornadaDia.segSalida != null) {
            res = 2
        }
    }
    return res;
}

function buscarEn(dia: string, jornadaDias: JornadaDia[]) {
    let res: JornadaDia | any = undefined;
    for (let jornadaDia of jornadaDias) {
        if (dia === jornadaDia.dia) {
            res = jornadaDia
            break;
        }
    }
    return res;
}