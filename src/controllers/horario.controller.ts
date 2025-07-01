import {Request, Response} from "express"
import {AppDataSource} from "../data-source";
import {Horario} from "../entity/Horario";
import {Usuario} from "../entity/Usuario";
import {Between, In} from "typeorm";
import moment, * as MomentExt from "moment";
import {Moment} from "moment";
import {JornadaDia} from "../entity/JornadaDia";
import {DateRange, extendMoment} from "moment-range";
import {env} from "../environments/environments";
import {EstadoJornada, Jornada} from "../entity/Jornada";
import {Turno} from "../entity/Turno";
import {Asueto} from "../entity/Asueto";
import {Licencia} from "../entity/Licencia";
import {InfoExtraJornada} from "../models/InfoExtraJornada";

const momentExt = extendMoment(MomentExt);

export const crearHorario = async (req: Request, res: Response) => {
    const {horario, jornadas} = req.params;
    let jsonHorario = JSON.parse(horario)
    let nuevoHorario = new Horario();
    nuevoHorario.nombre = jsonHorario.nombre;
    nuevoHorario.tolerancia = jsonHorario.tolerancia;
    nuevoHorario.color = jsonHorario.color;
    nuevoHorario.area = jsonHorario.area;
    nuevoHorario.descripcion = jsonHorario.descripcion;
    nuevoHorario.diasIntercalados = jsonHorario.diasIntercalados
    nuevoHorario.jornadasDosDias = jsonHorario.jornadasDosDias
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

export const editarHorario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const horario = await Horario.findOne({where: {id: parseInt(id)}, relations: {jornadaDias: true},});
    const {nombre, tolerancia, color, area, descripcion} = req.body
    if(horario) {
        horario.nombre = nombre;
        horario.tolerancia = tolerancia;
        horario.color = color;
        horario.area = area;
        horario.descripcion = descripcion;
        await horario.save();
        res.status(200).send(horario)
    } else {
        res.status(400).send("El horario no existe")
    }
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
    try {
        let asuetos = await AppDataSource.manager.find(Asueto, {
            order: {
                tipo: "DESC", // Ordenar por tipo descendente (1 antes que 0)
                fecha: "ASC"  // Luego por fecha ascendente
            }
        });

        res.send(asuetos);

    } catch (error: any) {
        console.error("Error al obtener los asuetos:", error);
        res.status(500).send({ message: "Error al obtener los asuetos", error: error.message });
    }
};

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
    const {id, iniMes, finMes} = req.params;
    let fechaIni = moment(iniMes).format("YYYY-MM-DD");
    let fechaFin = moment(finMes).format("YYYY-MM-DD");
    let usuario = await Usuario.findOne({where: {id: parseInt(id)},});
    let jornadas: Jornada[];
    if (usuario) {
        jornadas = await Jornada.findBy({
            usuario: usuario,
            fecha: Between(moment(fechaIni).toDate(), moment(fechaFin).toDate())});
        await res.send(jornadas)
    }
}

export const asignarHorario = async (req: Request, res: Response) => {
    console.time('buscar_superpuestas');
    const {id, ids, ini, fin, jornadas} = req.params;
    const { invierno, lactancia } = req.query; // Obtener desde Query Params
    const esInvierno = invierno === "true";
    const esLactancia = lactancia === "true";
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
    console.timeEnd('buscar_superpuestas');
    console.time('bd_superpuestas');
    if(turnosBorrar.length > 0) {
        await AppDataSource
            .createQueryBuilder()
            .delete()
            .from(Turno)
            .where("id IN (:...turnos)", { turnos: turnosBorrar.map(t => t.id) })
            .execute();
    }
    if(jornadasBorrar.length > 0) {
        await AppDataSource
            .createQueryBuilder()
            .delete()
            .from(Jornada)
            .where("id IN (:...jornadas)", { jornadas: jornadasBorrar.map(j => j.id) })
            .execute();
    }
    console.timeEnd('bd_superpuestas');
    console.time('asignacion');

    let listaJornadas: JornadaDia[] = [];
    listaJornadas = JSON.parse(jornadas);
    let jornadasGuardar: Jornada[] = [];
    let turnosGuardar: Turno[] = [];

    for (let usuario of usuarios) {
        let rango = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())
        let dias: Iterable<Moment>;
        let diasDescanso: Iterable<Moment>;
        let rangoValido: DateRange;
        let esVacio = moment(fechaIni).isBefore(moment(usuario.fechaAlta)) && moment(fechaFin).isBefore(usuario.fechaAlta);
        if (!esVacio) {
            //console.log("genero rangos")
            if (rango.contains(moment(usuario.fechaAlta), {excludeStart: true})) {
                rangoValido = momentExt.range(moment(usuario.fechaAlta).toDate(), moment(fechaFin).toDate())
                //console.log("rango contiene")
            } else {
                rangoValido = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())
                //console.log("no contiene")
            }
            dias = rangoValido.by("day");
            if(horario?.diasIntercalados || horario?.jornadasDosDias) {
                dias = rangoValido.by("day", {step: 2});
                let copia = rangoValido.clone();
                let rangoDiasDescanso = momentExt.range(copia.start.add(1, "days"), moment(fechaFin).toDate())
                diasDescanso = rangoDiasDescanso.by("day", {step: 2})
            }
            for (let fecha of dias) {
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
                    jornada.estado = horario?.esTeleTrabajo ? EstadoJornada.teletrabajo : EstadoJornada.dia_libre
                }
                if(esInvierno)
                    jornada.esInvierno = esInvierno;
                if(esLactancia)
                    jornada.esLactancia = esLactancia;
                jornadasGuardar.push(jornada)
            }
            if(horario?.diasIntercalados || horario?.jornadasDosDias) {
                for(let fecha of diasDescanso!) {
                    let jornada = new Jornada()
                    jornada.fecha = moment(fecha.format("YYYY-MM-DD")).toDate();
                    jornada.usuario = usuario
                    jornada.horario = horario!;
                    jornada.estado = EstadoJornada.dia_libre
                    if(esInvierno)
                        jornada.esInvierno = esInvierno;
                    if(esLactancia)
                        jornada.esLactancia = esLactancia;
                    jornadasGuardar.push(jornada)
                }
            }
        }
    }
    await AppDataSource.getRepository(Turno).insert(turnosGuardar);
    await AppDataSource.getRepository(Jornada).insert(jornadasGuardar);
    console.timeEnd('asignacion');
    console.time("ultJornada")
    if(jornadasGuardar.length > 0) {
        let ultimaJornada = jornadasGuardar.reduce((max, jornada) =>
            max.fecha > jornada.fecha ? max : jornada
        );
        if(ultimaJornada) {
            let dia = moment(ultimaJornada.fecha).format("DD");
            let mes = moment(ultimaJornada.fecha).format("MMM");
            let horarioMes = "Hasta " + dia + " " + mes;
            res.send({"res": true, "ultDiaAsignado": horarioMes})
        }
    } else {
        res.send({"res": false, "ultDiaAsignado": ""})
    }
    console.timeEnd("ultJornada")
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

export const editarFechaAsueto = async (req: Request, res: Response) => {
    const {id, fecha} = req.params;
    let asueto = await Asueto.findOneBy({id: parseInt(id)},);
    let nuevaFecha = moment(fecha).format("YYYY-MM-DD")
    if (asueto) {
        asueto.fecha = moment(nuevaFecha).toDate()
        asueto.save();
        res.json(asueto)
    } else {

    }
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