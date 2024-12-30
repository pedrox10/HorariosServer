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
import {Terminal} from "../entity/Terminal";

const momentExt = extendMoment(MomentExt);

export const crearHorario = async (req: Request, res: Response) => {
    const horario = new Horario()
    res.send(horario)
}

export const getHorario = async (req: Request, res: Response) => {
    const {id} = req.params;
    const horario = await Horario.findOne({where: {id: parseInt(id)},});
    res.send(horario)
}

export const getHorarios= async (req: Request, res: Response) => {
    let horarios = await AppDataSource.manager.find(Horario, {relations: {jornadaDias: true}})
    res.send(horarios)
}

export const asignarHorario = async (req: Request, res: Response) => {
    const {id, ids, ini, fin, jornadas} = req.params;
    let horario = await Horario.findOne({where: {id: parseInt(id)},});
    let listaIds = ids.split(",")
    let usuarios = await Usuario.find({
        where: { id: In(listaIds) },
    });
    let fechaIni = moment(ini).format("YYYY-MM-DD");
    let fechaFin = moment(fin).format("YYYY-MM-DD");
    let jornadasBorrar: Jornada[] = [];
    let turnosBorrar: Turno[] = [];
    let jornadasSuperpuestas = await Jornada.find({ where: {usuario: In(listaIds), fecha: Between(moment(fechaIni).toDate(),moment(fechaFin).toDate())}, relations: {priTurno:true, segTurno: true}},)
    for(let jornada of jornadasSuperpuestas) {
        if(jornada.getNumTurnos() == 2) {
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
    listaJornadas = JSON.parse(jornadas) ;
    let jornadasGuardar: Jornada[] = [];
    let turnosGuardar: Turno[] = [];

    for (let usuario of usuarios) {
        for (let fecha of rango.by("day")) {
            let dia: string|any = env.dias.at(moment(fecha).day())
            let jornadaDia = buscarEn(dia, listaJornadas)
            let jornada = new Jornada()
            jornada.fecha = moment(fecha.format("YYYY-MM-DD")).toDate();
            jornada.usuario = usuario
            jornada.horario = horario!;
            if(jornadaDia.habilitado) {
                if(getNumTurnos(jornadaDia) == 2) {
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
    const jornada = await Jornada.findOne({where: {id: parseInt(id)}, relations: {
        priTurno: true, segTurno: true,
    }});
    if(jornada){
        let pri = jornada.priTurno
        let seg = jornada.segTurno
        await jornada.remove()
        await pri.remove()
        await seg.remove()
    }
    res.send("true")
}


function getNumTurnos(jornadaDia: JornadaDia) {
    let res: number = 0;
    if (jornadaDia.priEntrada != null && jornadaDia.priSalida != null) {
        res = 1;
        if(jornadaDia.segEntrada != null && jornadaDia.segSalida != null){
            res = 2
        }
    }
    return res;
}

function buscarEn(dia: string, jornadaDias: JornadaDia[]) {
    let res: JornadaDia|any = undefined;
    jornadaDias.forEach(jornadaDia => {
        if (dia === jornadaDia.dia) {
            res = jornadaDia
            return res;
        }
    })
    return res;
}