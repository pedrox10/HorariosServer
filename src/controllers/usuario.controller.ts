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
import {Between, In} from "typeorm";
import {Excepcion} from "../models/Excepcion";
import axios from "axios";
import {Interrupcion} from "../entity/Interrupcion";
import {Grupo} from "../entity/Grupo";

const momentExt = extendMoment(MomentExt);

export interface SolicitudAprobada {
    _id: string;
    tipo: string;
    detalle: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
    hora_inicio: string;
    hora_fin: string;
    dias: Array<{
        fecha: string;     // ISO date string
        jornada: 'completa' | 'media';
        turno?: string;
    }>;
}

export const getUsuarios = async (req: Request, res: Response) => {
    const {id} = req.params;
    const terminal = await Terminal.findOne({
        where: {id: parseInt(id)}
    });
    let usuarios = await Usuario.find({ where: {terminal: terminal!}, relations: {grupo: true}} )

    if (usuarios) {
        for (const usuario of usuarios) {
            let jornada = await ultJornadaAsignada(usuario.id);
            if (jornada) {
                let dia = moment(jornada.fecha).format("DD");
                let mes = moment(jornada.fecha).format("MMM");
                usuario.ultAsignacion = "Hasta " + dia + " " + mes;
            } else {
                usuario.ultAsignacion = "Sin Asignar"
                let t = await Terminal.findOne({
                    where: {id: parseInt(id)}
                });
            }
        }
        res.send(usuarios)
    }
}

export const infoOrganigram = async (req: Request, res: Response) => {
    const {ci} = req.params;
    const ACCESS_CODE = "ga8f0051d6ff90ff485359f626060aa0fe38fc2c451c184f337ae146e4cd7eefcb8497011ee63534e4afd7eedf65fc1d9017f67c2385bc85b392b862a7bedfd6g";
    const BASE_URL = "http://190.181.22.149:3310";
    const HEADERS = { headers: { "X-Access-Code": ACCESS_CODE}, timeout: 500 };
    try {
        const { data: funcionarios } = await axios.get(
            `${BASE_URL}/funcionario/filtro/ci/${ci}`,
            HEADERS
        );
        const funcionario = funcionarios?.[0];
        if (!funcionario || !funcionario.estado) {
            return res.status(200).json({ exito: false, respuesta: "Funcionario no encontrado o inactivo"});
        }
        // 2. Buscar registros del funcionario
        const { data: registros } = await axios.get(
            `${BASE_URL}/registro/filtro/id_funcionario/${funcionario._id}`,
            HEADERS
        );
        const registroActivo = registros.find((r: any) => r.estado === true);
        if (!registroActivo) {
            return res.status(200).json({ exito: false, respuesta: "\"No se encontró un registro activo\""});
        }
        // Reemplazar id_funcionario con los datos del funcionario
        registroActivo.id_funcionario = {
            nombre: funcionario.nombre,
            paterno: funcionario.paterno,
            materno: funcionario.materno,
            ci: funcionario.ci,
            ext: funcionario.ext ? funcionario.ext : "",
        };
        // 3. Buscar rotaciones activas del registro
        const { data: rotaciones } = await axios.get(
            `${BASE_URL}/rotacion/filtro/id_registro/${registroActivo._id}`,
            HEADERS
        );
        // Asociar rotaciones si existe al registro
        const rotacionActivo = rotaciones.find(
            (r: any) => registroActivo?.id_funcionario && r.estado === true
        );
        if (rotacionActivo) {
            registroActivo.id_rotacion = rotacionActivo;
        }
        console.log(registroActivo)
        return res.status(200).json({ exito: true, respuesta: registroActivo});
    } catch (error: any) {
        return res.status(500).json({ exito: false, respuesta: "Error al obtener solicitudes aprobadas"});
        console.error("Error al obtener solicitudes aprobadas:", error.response?.data || error.message);
    }
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
        usuario.estado = parseInt(estado)
        usuario.save()
        let jornada = await ultJornadaAsignada(usuario.id);
        if (jornada) {
            let dia = moment(jornada.fecha).format("DD");
            let mes = moment(jornada.fecha).format("MMM");
            usuario.ultAsignacion = "Hasta " + dia + " " + mes;
        } else {
            usuario.ultAsignacion = "Sin Asignar"
            let t = await Terminal.findOne({
                where: {id: parseInt(id)}
            });
        }
        res.status(200).json({accion: "editar", usuario: usuario})
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
    const marcaciones = await Marcacion.find({ where: { ci: usuario?.ci, terminal: usuario?.terminal},
        order: { fecha: "DESC", hora: "DESC"}});
    res.send(marcaciones)
}

export const getUltMarcacion = async (req: Request, res: Response) => {
    const {id} = req.params;
    const usuario = await Usuario.findOne({
        where: {id: parseInt(id)}, relations: {
            terminal: true,
        }
    });
    const ultMarcacion = await Marcacion.findOne({
        where: { ci: usuario?.ci, terminal: usuario?.terminal},
        order: { fecha: 'DESC', hora: 'DESC'},
    });
    res.send(ultMarcacion)
}

export const asignarGrupo = async (req: Request, res: Response) => {
    const {id, ids} = req.params;
    const grupo = await Grupo.findOne({where: {id: parseInt(id)},});
    let listaIds = ids.split(",")
    let usuarios = await Usuario.find({
        where: {id: In(listaIds)},
    });
    if(grupo) {
        for (let usuario of usuarios) {
            usuario.grupo = grupo;
            usuario.save()
        }
        return res.status(200).json(grupo)
    }
}

export const limpiarGrupo = async (req: Request, res: Response) => {
    const {ids} = req.params;
    let listaIds = ids.split(",")
    let usuarios = await Usuario.find({
        where: {id: In(listaIds)},
    });
    for (let usuario of usuarios) {
        usuario.grupo = null;
        usuario.save()
    }
    return res.status(200).json({ success: true, usuarios })
}

export const getResumenMarcaciones = async (req: Request, res: Response) => {
    const {id, ini, fin} = req.params;
    let resumenMarcacion = await getReporteMarcaciones(id, ini, fin);
    res.send(resumenMarcacion);
}

export const getResumenMarcacionesPorCI = async (req: Request, res: Response) => {
    const {ci, ini, fin} = req.params;
    const usuarios = await Usuario.createQueryBuilder("usuario")
        .innerJoin(subQuery => {
            return subQuery
                .select("marcacion.terminalId", "terminalId")
                .from(Marcacion, "marcacion")
                .where("marcacion.ci = :ci", { ci: parseInt(ci) })
                .andWhere("marcacion.fecha BETWEEN :fechaIni AND :fechaFin", {
                    fechaIni: moment(ini).format('YYYY-MM-DD'),
                    fechaFin: moment(fin).format('YYYY-MM-DD')
                })
                .groupBy("marcacion.terminalId");
        }, "sub", "usuario.terminalId = sub.terminalId")
        .where("usuario.ci = :ci", { ci: parseInt(ci) })
        .getMany();
    let respuesta: ResumenMarcacion[] = [];
    for(let usuario of usuarios) {
        let resumenMarcacion = await getReporteMarcaciones(usuario.id + "", ini, fin);
        if(resumenMarcacion)
            respuesta.push(resumenMarcacion);
    }
    res.send(respuesta)
}

//Funciones auxiliares
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

function getExcepcionCompleta(jornada: Jornada, excepcionesCompletas: Excepcion[]) {
    let res: Excepcion | null = null;
    for (let excepcionCompleta of excepcionesCompletas) {
        const fechaExcepcion = moment(excepcionCompleta.fecha).utc().startOf('day').toDate();
        const fechaJornada = moment(jornada.fecha).utc().startOf('day').toDate();
        if (fechaExcepcion.getTime() === fechaJornada.getTime()) { // Comparación con timestamps
            res = excepcionCompleta;
            break;
        }
    }
    return res;
}

function getExcepcionesTickeo(jornada: Jornada, excepcionesRangoHoras: Excepcion[]) {
    const res: Excepcion[] = [];
    const fechaJornada = moment(jornada.fecha).utc().startOf('day');
    const fechaJornadaSiguiente = fechaJornada.clone().add(1, 'day');

    for (let excepcionTickeo of excepcionesRangoHoras) {
        const fechaExcepcion = moment(excepcionTickeo.fecha).utc().startOf('day');
        if (jornada.horario.jornadasDosDias) {
            if (fechaExcepcion.isSame(fechaJornada, 'day') || fechaExcepcion.isSame(fechaJornadaSiguiente, 'day')) {
                res.push(excepcionTickeo);
            }
        } else {
            if (fechaExcepcion.isSame(fechaJornada, 'day')) {
                res.push(excepcionTickeo);
            }
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
        infoMarcacion.fecha = moment(fecha).toDate();
        infoMarcacion.horario = "Sin registros"
        infoMarcacion.estado = EstadoJornada.sin_registros;
        infoMarcacion.activo = false
        infoMarcacion.mensaje = "Funcionario aún no registrado en el biométrico"
        if (fecha.isSame(rangoSinRegistros.start, 'day')) {
            infoMarcacion.primerDia = {success: true, mes: capitalizar(moment(fecha).locale("es").format("MMMM"))};
        } else {
            if(fecha.date() === 1)
                infoMarcacion.primerDia = {success: true, mes: capitalizar(moment(fecha).locale("es").format("MMMM"))};
        }
        infoMarcaciones.push(infoMarcacion)
    }
    return infoMarcaciones;
}

function getAvisosDeBaja(rangoDeBaja: DateRange) {
    let infoMarcaciones: InfoMarcacion[] = [];
    for (let fecha of rangoDeBaja.by("day")) {
        let infoMarcacion = new InfoMarcacion();
        let dia = moment(fecha).locale("es").format("ddd DD")
        dia = dia.charAt(0).toUpperCase() + dia.substring(1)
        infoMarcacion.dia = dia
        infoMarcacion.fecha = moment(fecha).toDate();
        infoMarcacion.horario = "Sin registros"
        infoMarcacion.estado = EstadoJornada.sin_registros;
        infoMarcacion.activo = false
        infoMarcacion.mensaje = "Funcionario fué dado de baja en el sistema"
        infoMarcaciones.push(infoMarcacion)
    }
    return infoMarcaciones;
}

export async function ultJornadaAsignada(usuarioId: number) {
    // Buscamos la última jornada (fecha más alta) entre inicioMes y finMes
    const ultimaJornada = await Jornada.findOne({
        where: {
            usuario: {id: usuarioId}, // Relación con el usuario
        },
        order: {
            fecha: 'DESC', // Orden descendente para tomar la más reciente
        },
        relations: {
            priTurno: true,
            segTurno: true,
        },
    });
    return ultimaJornada;
}

export async function ultMarcacion(usuario: Usuario, terminal: Terminal) {
    // Buscamos la última jornada (fecha más alta) entre inicioMes y finMes
    const ultMarcacion = await Marcacion.findOne({
        where: {
            ci: usuario.ci,
            terminal: terminal
        },
        order: {
            fecha: 'DESC', hora: 'DESC' // Orden descendente para tomar la más reciente
        },
    });
    return ultMarcacion;
}

async function getSolicitudesAprobadasPorCI(ci: number) {
    const ACCESS_CODE = "ga8f0051d6ff90ff485359f626060aa0fe38fc2c451c184f337ae146e4cd7eefcb8497011ee63534e4afd7eedf65fc1d9017f67c2385bc85b392b862a7bedfd6g";
    const BASE_URL = "http://190.181.22.149:3310";
    const HEADERS = { headers: { "X-Access-Code": ACCESS_CODE}, timeout: 500 };
    let solicitudesAprobadas = [];
    let fechaAlta: string;
    let fechaBaja: string;
    let fechaRotacion: string = "";

    try {
        // 1. Busqueda del funcionario por CI
        const { data: funcionarios } = await axios.get(`${BASE_URL}/funcionario/filtro/ci/${ci}`, HEADERS);
        const funcionario = funcionarios?.[0];
        if (!funcionario) {
            return {success: false, error: "Número de CI no encontrado en Organigrama"}
        }
        // 2. Buscar todos los registros del funcionario sea activo o no
        const { data: registros } = await axios.get(`${BASE_URL}/registro/filtro/id_funcionario/${funcionario._id}`, HEADERS);
        if (!registros.length) {
            return {success: false, error: "El funcionario no tiene registros"}
        }
        // 3. Obtengo el registro mas reciente y determinar si es activo o no
        const registroMasReciente = registros.reduce((prev: any, curr: any) => {
            return moment(curr.fecha_conclusion).isAfter(prev.fecha_conclusion) ? curr : prev;
        });
        if(registroMasReciente.estado) {
            fechaAlta = moment(registroMasReciente.fecha_ingreso).format("DD/MM/YYYY");
            fechaBaja = "";
            // Buscar rotaciones activas del registro
            const { data: rotaciones } = await axios.get(`${BASE_URL}/rotacion/filtro/id_registro/${registroMasReciente._id}`, HEADERS);
            const rotacionActivo = rotaciones.find((r: any) => registroMasReciente?.id_funcionario && r.estado === true);
            if (rotacionActivo)
                fechaRotacion = moment(rotacionActivo.fecha_ingreso).format("DD/MM/YYYY");
        } else {
            fechaAlta = moment(registroMasReciente.fecha_ingreso).format("DD/MM/YYYY");
            fechaBaja = moment(registroMasReciente.fecha_conclusion).format("DD/MM/YYYY");
        }
        // 4. Iteración por cada registro para obtener solicitudes, los registros obtenidos son tanto de alta como de baja, esto con el objetivo de obtener los registros si un funcionario cambio durante el mes de cargo y asi obtener ambos registros
        for (const registro of registros) {
            const { data: solicitudes } = await axios.get(`${BASE_URL}/solicitud/filtro/id_registro/${registro._id}`, HEADERS);
            const aprobadas = solicitudes.filter((s: any) => s.estado === 'APROBADO');
            for(let solicitud of aprobadas) {
                solicitudesAprobadas.push(solicitud)
            }
        }
        return {success: true, solicitudes: solicitudesAprobadas, alta: fechaAlta, baja: fechaBaja, rotacion: fechaRotacion}

    } catch (error: any) {
        console.error("Error al obtener solicitudes aprobadas:", error.response?.data || error.message);
        return {success: false, error: "No hay conexión a Organigrama"}
    }
}

export async function obtenerSolicitudesAprobadasPorCI(ci: number) {
    const ACCESS_CODE =
        "ga8f0051d6ff90ff485359f626060aa0fe38fc2c451c184f337ae146e4cd7eefcb8497011ee63534e4afd7eedf65fc1d9017f67c2385bc85b392b862a7bedfd6g";
    const BASE_URL = "http://190.181.22.149:3310";
    const HEADERS = {
        headers: {
            "X-Access-Code": ACCESS_CODE,
        },
    };

    try {
        // 1. Buscar funcionario por CI
        const {data: funcionarios} = await axios.get(
            `${BASE_URL}/funcionario/filtro/ci/${ci}`,
            HEADERS
        );
        const funcionario = funcionarios?.[0];
        if (!funcionario) {
            return {success: false, error: "Número de CI no encontrado en Organigrama"}
        }
        if (!funcionario.estado) {
            const {data: registros} = await axios.get(
                `${BASE_URL}/registro/filtro/id_funcionario/${funcionario._id}`,
                HEADERS
            );
            const inactivos = registros.filter((r: any)  => r.estado === false);
            if (inactivos.length === 0) {
                return { success: false, error: 'No hay registros inactivos' };
            }
            if (inactivos.length === 1) {
                if(inactivos[0].fecha_ingreso === undefined)
                    return {success: false, error: "Funcionario aún no tiene un cargo asignado"}
            }
            const registroMasReciente = inactivos.reduce((prev: any, curr: any) => {
                return moment(curr.fecha_conclusion).isAfter(prev.fecha_conclusion) ? curr : prev;
            });
            return {
                success: false,
                error: `Funcionario dado de baja en Organigrama el: ${moment(registroMasReciente.fecha_conclusion).format("DD/MM/YYYY")}`
            };
        }
        // 2. Buscar registros del funcionario
        const {data: registros} = await axios.get(
            `${BASE_URL}/registro/filtro/id_funcionario/${funcionario._id}`,
            HEADERS
        );
        const registroActivo = registros.find((r: { estado: boolean }) => r.estado === true);
        //console.log(registroActivo)
        if (!registroActivo) {
            console.log("No se encontró un registro activo");
            return {success: false, error: "Funcionario aún no tiene un cargo asignado"}
        }
        const {data: solicitudes} = await axios.get<SolicitudAprobada[]>(
            `${BASE_URL}/solicitud/filtro/id_registro/${registroActivo._id}`,
            HEADERS
        );
        // 3) Filtra por estado y devuelve todas las propiedades:
        let solicitudesAprobadas = solicitudes.filter(s => s.estado === 'APROBADO');
        return {success: true, solicitudes: solicitudesAprobadas}
    } catch (error: any) {
        console.error(
            "Error al obtener solicitudes aprobadas:",
            error.response?.data || error.message
        );
        return {success: false, error: "No hay conexión a Organigrama"}
    }
}

function capitalizar(cadena: string): string {
    if (!cadena) return "";
    return cadena.charAt(0).toUpperCase() + cadena.slice(1).toLowerCase();
}

function getLicencia(excepcion: Excepcion): string {
    let res: string;
    switch (excepcion.licencia) {
        case "ET":
            res = "Excepción de Tickeo"; break;
        case "TO":
            res = "Tolerancia"; break;
        case "VA":
            res = "Vacación"; break;
        case "BM":
            res = "Baja Médica"; break;
        case "SG":
            res = "PermisoSG"; break;
        case "PO":
            res = "Permiso"; break;
        case "LI":
            res = "Licencia"; break;
        case "CA":
            res = "Capacitación"; break;
        default:
            res = "Otros"
    }
    return res;
}

function getMultaRetrasos(min: number): number {
    if (min <= 30) return 0;
    if (min <= 45) return 0.5;
    if (min <= 60) return 1;
    if (min <= 90) return 2;
    if (min <= 120) return 3;
    return 4;
}

function getMultaSinMarcar(sinMarcar: number): number {
    switch (sinMarcar) {
        case 0: return 0;
        case 1: return 0.5;
        case 2: return 1;
        case 3: return 2;
        case 4: return 2.5;
        case 5: return 3;
        default: return 3;
    }
}

function getMultaSalAntes(salAntes: number): number {
    return salAntes * 0.5
}

function getMultaAusencias(ausencias: number): number {
    return ausencias * 2
}

export async function getReporteMarcaciones(id: string, ini: string, fin: string ) {
    console.time("GetUsuario")
    let usuario = await Usuario.findOne({
        where: {id: parseInt(id)}, relations: {
            terminal: true,
        }
    });
    console.timeEnd("GetUsuario")
    if (usuario) {
        let fechaIni = moment(ini).format('YYYY-MM-DD')
        let fechaFin = moment(fin).format('YYYY-MM-DD')
        let resumenMarcacion: ResumenMarcacion = new ResumenMarcacion();
        resumenMarcacion.usuario = usuario;
        let infoMarcaciones: InfoMarcacion[] = [];
        let rango = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())

        if (moment(fechaIni).isBefore(moment(usuario.fechaAlta)) && moment(fechaFin).isBefore(usuario.fechaAlta)) {
            let rangoSinRegistros = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())
            infoMarcaciones.push(...getSinRegistros(rangoSinRegistros))
            resumenMarcacion.infoMarcaciones = infoMarcaciones
            return resumenMarcacion;
        } else {
            let rangoValido: DateRange;
            let hayFeriados = false;
            let hayExcepcionesCompletas = false;
            let hayExcepcionesRangoHoras = false;
            let rangoDeBaja: DateRange | any;
            let hayRangoValido: boolean = true;

            if (rango.contains(moment(usuario.fechaAlta), {excludeStart: true})) {
                let rangoSinRegistros = momentExt.range(moment(fechaIni).toDate(), moment(usuario.fechaAlta).subtract(1, "day").toDate())
                rangoValido = momentExt.range(moment(usuario.fechaAlta).toDate(), moment(fechaFin).toDate())
                infoMarcaciones.push(...getSinRegistros(rangoSinRegistros))
            } else {
                rangoValido = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())
            }
            if (usuario.fechaBaja) {
                if (rangoValido.contains(moment(usuario.fechaBaja), {excludeEnd: true})) {
                    rangoDeBaja = momentExt.range(moment(usuario.fechaBaja).add(1, "day").toDate(), moment(fechaFin).toDate())
                    rangoValido = momentExt.range(rangoValido.start.toDate(), moment(usuario.fechaBaja).toDate())
                } else {
                    if (moment(usuario.fechaBaja).isBefore(moment(rangoValido.start))) {
                        rangoDeBaja = momentExt.range(moment(fechaIni).toDate(), moment(fechaFin).toDate())
                        hayRangoValido = false;
                    }
                }
            }
            console.time("FeriadosInterrupciones")
            let feriados: Asueto[] = await Asueto.findBy({
                fecha: Between(rangoValido.start.toDate(), rangoValido.end.toDate()),
                tipo: TipoAsueto.todos
            })
            if (feriados.length > 0)
                hayFeriados = true

            let excepcionesCompletas: Excepcion[] = [];
            let excepcionesRangoHoras: Excepcion[] = [];
            let interrupciones: Interrupcion[] = await Interrupcion.findBy({
                fecha: Between(rangoValido.start.toDate(), rangoValido.end.toDate()),
                terminal: usuario.terminal
            })
            if(interrupciones.length > 0) {
                for(let interrupcion of interrupciones) {
                    let excepcion = new Excepcion();
                    excepcion.fecha = interrupcion.fecha;
                    excepcion.jornada = 'rango';
                    excepcion.detalle = capitalizar(interrupcion.detalle);
                    excepcion.licencia = "IT";
                    excepcion.horaIni = moment(interrupcion.horaIni).format("HH:mm");
                    excepcion.horaFin = moment(interrupcion.horaFin).format("HH:mm");
                    excepcion.esInterrupcion = true
                    excepcion.motivo = interrupcion.motivo
                    excepcionesRangoHoras.push(excepcion);
                }
            }
            console.timeEnd("FeriadosInterrupciones")
            console.time("Organigram")
            let respuesta = await getSolicitudesAprobadasPorCI(usuario.ci)
            //console.log(respuesta)
            if(respuesta.success) {
                const solicitudesAprobadas = respuesta.solicitudes ?? [];
                for (const solicitud of solicitudesAprobadas) {
                    if (solicitud.tipo === "ET" || solicitud.tipo === "TO") {
                        let fechaInicio = moment(solicitud.fecha_inicio, "YYYY-MM-DD");
                        if (fechaInicio.isSameOrAfter(rangoValido.start) && fechaInicio.isSameOrBefore(rangoValido.end)) {
                            let excepcion = new Excepcion();
                            excepcion.fecha = fechaInicio.toDate();
                            excepcion.jornada = 'rango';
                            excepcion.detalle = capitalizar(solicitud.detalle);
                            excepcion.licencia = solicitud.tipo;
                            excepcion.horaIni = solicitud.hora_inicio;
                            excepcion.horaFin = solicitud.hora_fin;
                            excepcionesRangoHoras.push(excepcion);
                        }
                    } else {
                        for (const diaObj of solicitud.dias) {
                            let fechaDia= moment(diaObj.fecha, "YYYY-MM-DD");
                            if (fechaDia.isBefore(rangoValido.start) || fechaDia.isAfter(rangoValido.end)) {
                                continue;
                            }
                            if (diaObj.jornada === 'completa') {
                                let excepcion = new Excepcion();
                                excepcion.fecha = fechaDia.toDate();
                                excepcion.jornada = 'completa';
                                excepcion.detalle = capitalizar(solicitud.detalle);
                                excepcion.licencia = solicitud.tipo;
                                excepcionesCompletas.push(excepcion);

                            } else { // media
                                let excepcion = new Excepcion();
                                excepcion.fecha = fechaDia.toDate();
                                excepcion.jornada = 'media';
                                excepcion.turno = diaObj.turno!;
                                if (diaObj.turno === "mañana") {
                                    excepcion.horaIni = "08:00"
                                    excepcion.horaFin = "12:00"
                                } else {
                                    excepcion.horaIni = "14:00"
                                    excepcion.horaFin = "18:00"
                                }
                                excepcion.detalle = capitalizar(solicitud.detalle);
                                excepcion.licencia = solicitud.tipo;
                                excepcionesRangoHoras.push(excepcion);
                            }
                        }
                    }
                }
            }
            //console.log(excepcionesRangoHoras)
            resumenMarcacion.organigrama = generarInfoOrganigrama(respuesta, rangoValido);
            if (excepcionesCompletas.length > 0)
                hayExcepcionesCompletas = true
            if (excepcionesRangoHoras.length > 0)
                hayExcepcionesRangoHoras = true
            console.timeEnd("Organigram")

            let totalCantRetrasos: number = 0
            let totalMinRetrasos: number = 0
            let totalSinMarcar: number = 0
            let totalSinMarcarEntradas: number = 0;
            let totalSinMarcarSalidas: number = 0;
            let totalSalAntes: number = 0
            let totalAusencias: number = 0
            //Contadores de Excepciones
            let totalExcTickeos: number = 0
            let totalInterrupciones: number = 0
            let totalPermisosSG: number = 0
            let totalVacaciones: number = 0
            let totalBajas: number = 0
            let totalTolerancias: number = 0
            let totalPermisos: number = 0
            let totalLicencias: number = 0
            let totalCapacitaciones: number = 0
            let diasComputados: number = 0
            let sinAsignar: number = 0

            if(hayRangoValido) {
                console.time("RangoValido")
                //Obtengo toaas las jornadas y marcaciones del usuario
                let jornadasDelRango = await Jornada.find({
                    where: {
                        usuario: { id: usuario.id },
                        fecha: Between(rangoValido.start.toDate(), rangoValido.end.toDate()),
                    }, relations: {
                        priTurno: true, segTurno: true, horario: true
                    }
                });
                //Creo una copia del fin del rangoValido
                let finRango = rangoValido.end.clone().add(1, "day").toDate();
                let marcacionesDelRango = await Marcacion.find({
                    where: {
                        ci: usuario?.ci,
                        terminal: usuario?.terminal,
                        fecha: Between(rangoValido.start.toDate(), finRango),
                    },
                })
                if(marcacionesDelRango.length == 0) {
                    let marcacion: Marcacion | null= await ultMarcacion(usuario, usuario.terminal);
                    let ultima: string;
                    if(marcacion === null)
                        ultima = "Ultima marcacion: Sin Marcaciones"
                    else
                        ultima = "Ultima marcacion: <br>" + moment(marcacion.fecha).format("DD/MM/YYYY") +
                            " " + moment(marcacion.hora, "HH:mm:ss").format("HH:mm");
                    resumenMarcacion.usuario.ultMarcacion = ultima
                }
                //Clasifico las jornadas y marcaciones en un hashmap por fecha
                let jornadasPorFecha = new Map<string, Jornada>();
                jornadasDelRango.forEach(jornada => {
                    jornadasPorFecha.set(moment(jornada.fecha).format('YYYY-MM-DD'), jornada);
                });

                let marcacionesPorFecha = new Map<string, Marcacion[]>();
                marcacionesDelRango.forEach(marcacion => {
                    const fecha = moment(marcacion.fecha).format('YYYY-MM-DD');
                    if (!marcacionesPorFecha.has(fecha)) {
                        marcacionesPorFecha.set(fecha, []);
                    }
                    marcacionesPorFecha.get(fecha)!.push(marcacion);
                });
                for (let fecha of rangoValido.by("day")) {
                    //console.time("Jornada")
                    const fechaStr = fecha.format('YYYY-MM-DD');
                    let jornada = jornadasPorFecha.get(fechaStr);
                    //console.timeEnd("Jornada")
                    let infoMarcacion = new InfoMarcacion();
                    let cantRetrasos: number = 0
                    let cantSalAntes: number = 0
                    let minRetrasos: number = 0
                    let sinMarcar: number = 0
                    let sinMarcarEntradas: number= 0
                    let sinMarcarSalidas: number = 0
                    infoMarcacion.activo = false
                    let hayPriRetraso: boolean = false
                    let haySegRetraso: boolean = false
                    let hayPriAntes: boolean = false
                    let haySegAntes: boolean = false
                    let dia = moment(fecha).locale("es").format("ddd DD")
                    if (fecha.isSame(rango.start, 'day')) {
                        infoMarcacion.primerDia = {success: true, mes: capitalizar(moment(fecha).locale("es").format("MMMM"))};
                    } else {
                        if(fecha.date() === 1)
                            infoMarcacion.primerDia = {success: true, mes: capitalizar(moment(fecha).locale("es").format("MMMM"))};
                    }
                    dia = dia.charAt(0).toUpperCase() + dia.substring(1)
                    infoMarcacion.fecha = moment(fecha).toDate();
                    infoMarcacion.dia = dia

                    if (jornada) {
                        infoMarcacion.esInvierno = jornada.esInvierno
                        infoMarcacion.esLactancia = jornada.esLactancia
                        infoMarcacion.esJornadaDosDias = jornada.horario.jornadasDosDias
                        diasComputados++;
                        //Si hay feriados, verificamos si la jornada actual es feriado
                        let feriado: Asueto | any;
                        if(!jornada.horario.incluyeFeriados) {
                            if (hayFeriados) {
                                feriado = getFeriado(jornada, feriados);
                                if (feriado)
                                    jornada.estado = EstadoJornada.feriado;
                            }
                        }
                        //Si hay excepciones de jornada, verificamos si la jornada actual es vacacion, permiso, baja medica. etc
                        let excepcionCompleta: Excepcion | any;
                        if (hayExcepcionesCompletas) {
                            excepcionCompleta = getExcepcionCompleta(jornada, excepcionesCompletas)
                            if (excepcionCompleta) {
                                switch (excepcionCompleta.licencia) {
                                    case "VA":
                                        jornada.estado = EstadoJornada.vacacion; break;
                                    case "BM":
                                        jornada.estado = EstadoJornada.baja_medica; break;
                                    case "SG":
                                        jornada.estado = EstadoJornada.permiso_sg; break;
                                    case "PO":
                                        jornada.estado = EstadoJornada.permiso; break;
                                    case "LI":
                                        jornada.estado = EstadoJornada.licencia; break;
                                    case "CA":
                                        jornada.estado = EstadoJornada.capacitacion; break;
                                    default :
                                }
                            }
                        }

                        if (jornada.estado != EstadoJornada.dia_libre && jornada.estado != EstadoJornada.activa && jornada.estado != EstadoJornada.teletrabajo) {
                            infoMarcacion.activo = false
                            if (jornada.estado == EstadoJornada.feriado) {
                                infoMarcacion.horario = {nombre: "Feriado", color: "#9da3fd"};
                                infoMarcacion.mensaje = feriado.nombre;
                                infoMarcacion.estado = EstadoJornada.feriado
                            } else {
                                infoMarcacion.horario = {nombre: "", color: ""};
                                infoMarcacion.mensaje = excepcionCompleta.detalle;
                                switch (jornada.estado) {
                                    case EstadoJornada.vacacion:
                                        infoMarcacion.horario.color = "#7fd5fa";
                                        infoMarcacion.horario.nombre = "Vacación"
                                        infoMarcacion.estado = EstadoJornada.vacacion
                                        totalVacaciones++
                                        break;
                                    case EstadoJornada.baja_medica:
                                        infoMarcacion.horario.color = "#fc7b7d";
                                        infoMarcacion.horario.nombre = "Baja Médica"
                                        infoMarcacion.estado = EstadoJornada.baja_medica
                                        totalBajas++
                                        break;
                                    case EstadoJornada.permiso_sg:
                                        infoMarcacion.horario.color = "#a7c454";
                                        infoMarcacion.horario.nombre = "PermisoSG"
                                        infoMarcacion.estado = EstadoJornada.permiso_sg
                                        totalPermisosSG++;
                                        break;
                                    case EstadoJornada.permiso:
                                        infoMarcacion.horario.color = "#939393";
                                        infoMarcacion.horario.nombre = "Permiso"
                                        infoMarcacion.estado = EstadoJornada.permiso
                                        totalPermisos++
                                        break;
                                    case EstadoJornada.licencia:
                                        infoMarcacion.horario.color = "#939393";
                                        infoMarcacion.horario.nombre = "Licencia"
                                        infoMarcacion.estado = EstadoJornada.licencia
                                        totalLicencias++
                                        break;
                                    case EstadoJornada.capacitacion:
                                        infoMarcacion.horario.color = "#939393";
                                        infoMarcacion.horario.nombre = "Capacitación"
                                        infoMarcacion.estado = EstadoJornada.capacitacion
                                        totalCapacitaciones++
                                        break;
                                    default:
                                }
                            }
                        } else {
                            //Si hay excepciones de tickeo, verificamos si la jornada actual es excepcion de tickeo
                            let priEntExcepcion: any = {existe: false}
                            let priSalExcepcion: any = {existe: false}
                            let segEntExcepcion: any = {existe: false}
                            let segSalExcepcion: any = {existe: false}
                            let numTurnos = jornada.getNumTurnos();
                            console.log(numTurnos)

                            let excepcionesTickeo: Excepcion [] = [];
                            if (hayExcepcionesRangoHoras) {
                                excepcionesTickeo = getExcepcionesTickeo(jornada, excepcionesRangoHoras)
                                console.log(excepcionesTickeo)
                                for (let excepcionTickeo of excepcionesTickeo) {
                                    switch (excepcionTickeo.licencia) {
                                        case "ET":
                                            totalExcTickeos++; break;
                                        case "TO":
                                            totalTolerancias++; break;
                                        case "IT":
                                            totalInterrupciones++; break;
                                        case "VA":
                                            totalVacaciones = totalVacaciones + 0.5; break;
                                        case "BM":
                                            totalBajas = totalBajas + 0.5; break;
                                        case "SG":
                                            totalPermisosSG = totalPermisosSG + 0.5; break;
                                        case "PO":
                                            totalPermisos = totalPermisos + 0.5; break;
                                        case "LI":
                                            totalLicencias = totalLicencias + 0.5; break;
                                        case "CA":
                                            totalCapacitaciones = totalCapacitaciones + 0.5; break;
                                        default:
                                    }
                                    let rangoTickeo: DateRange;
                                    let [hora, minuto] = excepcionTickeo.horaIni.split(':').map(Number);
                                    let inicio = moment(excepcionTickeo.fecha).utc().set({
                                        hour: hora,
                                        minute: minuto,
                                        second: 0,
                                        millisecond: 0
                                    });
                                    let [horaFin, minutoFin] = excepcionTickeo.horaFin.split(':').map(Number);
                                    let fin = moment(excepcionTickeo.fecha).utc().set({
                                        hour: horaFin,
                                        minute: minutoFin,
                                        second: 0,
                                        millisecond: 0
                                    });
                                    rangoTickeo = momentExt.range(moment(inicio), moment(fin))
                                    //console.log(rangoTickeo)
                                    if(numTurnos != 0) {
                                        console.log("Num turnos distinto " + numTurnos)
                                        let priTurno = jornada.priTurno!
                                        if (!priEntExcepcion.existe) {
                                            let priHoraEntrada = moment(jornada.fecha + " " + priTurno.horaEntrada).format("YYYY-MM-DDTHH:mm:ss[Z]")
                                            if (rangoTickeo.contains(moment(priHoraEntrada))) {
                                                priEntExcepcion = {
                                                    existe: true,
                                                    licencia: getLicencia(excepcionTickeo),
                                                    jornada: capitalizar(excepcionTickeo.jornada),
                                                    horaIni: excepcionTickeo.horaIni,
                                                    horaFin: excepcionTickeo.horaFin,
                                                    detalle: excepcionTickeo.detalle
                                                }
                                                if(excepcionTickeo.esInterrupcion) {
                                                    priEntExcepcion.esInterrupcion = excepcionTickeo.esInterrupcion
                                                    priEntExcepcion.motivo = excepcionTickeo.motivo
                                                }
                                            }
                                        }
                                        if (!priSalExcepcion.existe) {
                                            let priHoraSalida;
                                            if (jornada.horario.jornadasDosDias)
                                                priHoraSalida = moment(jornada.fecha + " " + priTurno.horaSalida).add(1, "day").format("YYYY-MM-DDTHH:mm:ss[Z]")
                                            else
                                                priHoraSalida = moment(jornada.fecha + " " + priTurno.horaSalida).format("YYYY-MM-DDTHH:mm:ss[Z]")

                                            if (rangoTickeo.contains(moment(priHoraSalida))) {
                                                priSalExcepcion = {
                                                    existe: true,
                                                    licencia: getLicencia(excepcionTickeo),
                                                    jornada: capitalizar(excepcionTickeo.jornada),
                                                    horaIni: excepcionTickeo.horaIni,
                                                    horaFin: excepcionTickeo.horaFin,
                                                    detalle: excepcionTickeo.detalle
                                                }
                                                if(excepcionTickeo.esInterrupcion) {
                                                    priSalExcepcion.esInterrupcion = excepcionTickeo.esInterrupcion
                                                    priSalExcepcion.motivo = excepcionTickeo.motivo
                                                }
                                            }
                                        }
                                    }
                                    if(numTurnos == 2) {
                                        let segTurno = jornada.segTurno!
                                        if (!segEntExcepcion.existe) {
                                            let segHoraEntrada = moment(jornada.fecha + " " + segTurno.horaEntrada).format("YYYY-MM-DDTHH:mm:ss[Z]")
                                            if (rangoTickeo.contains(moment(segHoraEntrada))) {
                                                segEntExcepcion = {
                                                    existe: true,
                                                    licencia: getLicencia(excepcionTickeo),
                                                    jornada: capitalizar(excepcionTickeo.jornada),
                                                    horaIni: excepcionTickeo.horaIni,
                                                    horaFin: excepcionTickeo.horaFin,
                                                    detalle: excepcionTickeo.detalle
                                                }
                                                if(excepcionTickeo.esInterrupcion) {
                                                    segEntExcepcion.esInterrupcion = excepcionTickeo.esInterrupcion
                                                    segEntExcepcion.motivo = excepcionTickeo.motivo
                                                }
                                            }
                                        }
                                        if (!segSalExcepcion.existe) {
                                            let segHoraSalida = moment(jornada.fecha + " " + segTurno.horaSalida).format("YYYY-MM-DDTHH:mm:ss[Z]")
                                            if (rangoTickeo.contains(moment(segHoraSalida))) {
                                                segSalExcepcion = {
                                                    existe: true,
                                                    licencia: getLicencia(excepcionTickeo),
                                                    jornada: capitalizar(excepcionTickeo.jornada),
                                                    horaIni: excepcionTickeo.horaIni,
                                                    horaFin: excepcionTickeo.horaFin,
                                                    detalle: excepcionTickeo.detalle
                                                }
                                                if(excepcionTickeo.esInterrupcion) {
                                                    segSalExcepcion.esInterrupcion = excepcionTickeo.esInterrupcion
                                                    segSalExcepcion.motivo = excepcionTickeo.motivo
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            infoMarcacion.horario = {
                                nombre: jornada.horario.nombre,
                                color: jornada.horario.color,
                                incluyeFeriados: jornada.horario.incluyeFeriados
                            };
                            infoMarcacion.numTurnos = jornada.getNumTurnos();

                            if (numTurnos == 2) {
                                let priTurno = jornada.priTurno!
                                let segTurno = jornada.segTurno!
                                infoMarcacion.horario = {
                                    nombre: jornada.horario.nombre, color: jornada.horario.color,
                                    priEntrada: priTurno.horaEntrada, priSalida: priTurno.horaSalida,
                                    segEntrada: segTurno.horaEntrada, segSalida: segTurno.horaSalida,
                                    incluyeFeriados: jornada.horario.incluyeFeriados
                                };
                                let priEntradasM: Moment[] = [];
                                let priSalidasM: Moment[] = [];
                                let segEntradasM: Moment[] = [];
                                let segSalidasM: Moment[] = [];
                                //Genero los rangos para los cuatro posibles casos:
                                let priEntIni = moment(jornada.fecha + " " + "00:00").format('YYYY-MM-DD HH:mm')
                                let priEntFin = moment(jornada.fecha + " " + priTurno.horaSalida).subtract(2, "hours").format('YYYY-MM-DD HH:mm')
                                let priEntRango = momentExt.range(moment(priEntIni).toDate(), moment(priEntFin).toDate())
                                let dif = moment(jornada.fecha + " " + segTurno.horaEntrada).diff(moment(jornada.fecha + " " + priTurno.horaSalida), "hours")
                                let priSalFin = moment(jornada.fecha + " " + priTurno.horaSalida).add(dif / 2, "hours")
                                let priSalRango = momentExt.range(moment(priEntFin).toDate(), moment(priSalFin).toDate())
                                let segEntFin = moment(jornada.fecha + " " + segTurno.horaSalida).subtract(2, "hours").format('YYYY-MM-DD HH:mm')
                                let segEntRango = momentExt.range(moment(priSalFin).toDate(), moment(segEntFin).toDate())
                                let segSalFin = moment(jornada.fecha + " " + "23:59").format('YYYY-MM-DD HH:mm')
                                let segSalRango = momentExt.range(moment(segEntFin).toDate(), moment(segSalFin).toDate())
                                //Obtengo las marcaciones segun fecha y clasifico segun rangos
                                //console.time("Marcaciones")
                                let marcacionesDia = marcacionesPorFecha.get(fecha.format('YYYY-MM-DD')) || [];
                                marcacionesDia.forEach(marcacion => {
                                    let horaMarcaje = moment(marcacion.fecha + " " + marcacion.hora).format('YYYY-MM-DD HH:mm')
                                    if (priEntRango.contains(moment(horaMarcaje), {excludeEnd: true}))
                                        priEntradasM.push(moment(horaMarcaje))
                                    else if (priSalRango.contains(moment(horaMarcaje), {excludeEnd: true}))
                                        priSalidasM.push(moment(horaMarcaje))
                                    else if (segEntRango.contains(moment(horaMarcaje), {excludeEnd: true}))
                                        segEntradasM.push(moment(horaMarcaje))
                                    else if (segSalRango.contains(moment(horaMarcaje)))
                                        segSalidasM.push(moment(horaMarcaje))
                                })
                                //console.timeEnd("Marcaciones")
                                let priEntradas: string[] = [];
                                let priSalidas: string[] = [];
                                let segEntradas: string[] = [];
                                let segSalidas: string[] = [];

                                if (!priEntExcepcion.existe) {
                                    if (priEntradasM.length > 0) {
                                        priEntradasM.sort((a, b) => a.diff(b));
                                        priEntradasM.map(entrada => {
                                            priEntradas.push(entrada.format("HH:mm"))
                                        })
                                        infoMarcacion.priEntradas = priEntradas
                                        let retraso = priEntradasM.at(0)?.diff(moment(jornada.fecha + " " + priTurno.horaEntrada), "minutes")
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
                                        sinMarcarEntradas++
                                        totalSinMarcar++
                                        totalSinMarcarEntradas ++
                                    }
                                }

                                if (!priSalExcepcion.existe) {
                                    if (priSalidasM.length > 0) {
                                        priSalidasM.sort((a, b) => a.diff(b));
                                        priSalidasM.map(salida => {
                                            priSalidas.push(salida.format("HH:mm"))
                                        })
                                        infoMarcacion.priSalidas = priSalidas
                                        let ultimo = priSalidasM.length -1
                                        if(priSalidasM.at(ultimo)?.isBefore(moment(jornada.fecha + " " + priTurno.horaSalida))) {
                                            cantSalAntes++
                                            totalSalAntes++
                                            hayPriAntes = true
                                        }
                                    } else {
                                        sinMarcar++
                                        sinMarcarSalidas++
                                        totalSinMarcar++
                                        totalSinMarcarSalidas++

                                    }
                                }

                                if (!segEntExcepcion.existe) {
                                    if (segEntradasM.length > 0) {
                                        segEntradasM.sort((a, b) => a.diff(b));
                                        segEntradasM.map(entrada => {
                                            segEntradas.push(entrada.format("HH:mm"))
                                        })
                                        infoMarcacion.segEntradas = segEntradas
                                        let retraso = segEntradasM.at(0)?.diff(moment(jornada.fecha + " " + segTurno.horaEntrada), "minutes")
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
                                        sinMarcarEntradas++
                                        totalSinMarcar++
                                        totalSinMarcarEntradas++
                                    }
                                }

                                if (!segSalExcepcion.existe) {
                                    if (segSalidasM.length > 0) {
                                        segSalidasM.sort((a, b) => a.diff(b));
                                        segSalidasM.map(salida => {
                                            segSalidas.push(salida.format("HH:mm"))
                                        })
                                        infoMarcacion.segSalidas = segSalidas
                                        let ultimo = segSalidasM.length -1
                                        if(segSalidasM.at(ultimo)?.isBefore(moment(jornada.fecha + " " + segTurno.horaSalida))) {
                                            cantSalAntes++
                                            totalSalAntes++
                                            haySegAntes = true
                                        }
                                    } else {
                                        sinMarcar++
                                        sinMarcarSalidas++
                                        totalSinMarcar++
                                        totalSinMarcarSalidas++
                                    }
                                }
                                infoMarcacion.activo = true;
                                if (sinMarcar == numTurnos * 2) {
                                    infoMarcacion.noMarcados = 0;
                                    infoMarcacion.sinMarcarEntradas = 0
                                    infoMarcacion.sinMarcarSalidas = 0
                                    totalSinMarcar = totalSinMarcar - numTurnos * 2;
                                    totalSinMarcarEntradas = totalSinMarcarEntradas - numTurnos;
                                    totalSinMarcarSalidas = totalSinMarcarSalidas - numTurnos;
                                    totalAusencias++;
                                    infoMarcacion.estado = EstadoJornada.ausencia
                                } else {
                                    infoMarcacion.noMarcados = sinMarcar;
                                    infoMarcacion.sinMarcarEntradas = sinMarcarEntradas;
                                    infoMarcacion.sinMarcarSalidas = sinMarcarSalidas;
                                }
                                infoMarcacion.cantRetrasos = cantRetrasos;
                                infoMarcacion.minRetrasos = minRetrasos;
                                infoMarcacion.cantSalAntes = cantSalAntes;
                                infoMarcacion.hayPriEntExcepcion = priEntExcepcion;
                                infoMarcacion.hayPriSalExcepcion = priSalExcepcion;
                                infoMarcacion.haySegEntExcepcion = segEntExcepcion;
                                infoMarcacion.haySegSalExcepcion = segSalExcepcion;
                                infoMarcacion.hayPriRetraso = hayPriRetraso;
                                infoMarcacion.haySegRetraso = haySegRetraso;
                                infoMarcacion.hayPriAntes = hayPriAntes;
                                infoMarcacion.haySegAntes = haySegAntes;
                            } else {
                                if (numTurnos == 1) {
                                    let priTurno = jornada.priTurno!
                                    infoMarcacion.horario = {
                                        nombre: jornada.horario.nombre, color: jornada.horario.color,
                                        priEntrada: priTurno.horaEntrada, priSalida: priTurno.horaSalida,
                                        incluyeFeriados: jornada.horario.incluyeFeriados
                                    };
                                    let priEntradasM: Moment[] = [];
                                    let priSalidasM: Moment[] = [];
                                    //Genero los rangos para entradas y salidas:
                                    let priEntIni = moment(jornada.fecha + " " + "00:00").format('YYYY-MM-DD HH:mm')
                                    if(jornada.horario.jornadasDosDias) {
                                        const hora = moment(priTurno.horaEntrada, 'HH:mm');
                                        const medioDia = moment('12:00', 'HH:mm');
                                        if (hora.isAfter(medioDia))
                                            priEntIni = moment(jornada.fecha + " " + "12:00").format('YYYY-MM-DD HH:mm')
                                    }

                                    let priEntFin;
                                    let priSalFin;
                                    console.time("Marcaciones1T")
                                    let marcacionesDia = marcacionesPorFecha.get(fecha.format('YYYY-MM-DD')) || [];
                                    if(jornada.horario.jornadasDosDias) {
                                        priEntFin = moment(jornada.fecha + " " + priTurno.horaSalida).add(1, "day").subtract(2, "hours").format('YYYY-MM-DD HH:mm')
                                        priSalFin = moment(jornada.fecha + " " + "11:59").add(1, "day").format('YYYY-MM-DD HH:mm')
                                        let marcacionesSigDia = marcacionesPorFecha.get(fecha.add(1, "day").format('YYYY-MM-DD')) || [];
                                        marcacionesDia.push(... marcacionesSigDia)
                                    }
                                    else {
                                        priEntFin = moment(jornada.fecha + " " + priTurno.horaSalida).subtract(2, "hours").format('YYYY-MM-DD HH:mm')
                                        priSalFin = moment(jornada.fecha + " " + "23:59").format('YYYY-MM-DD HH:mm')
                                    }
                                    let priEntRango = momentExt.range(moment(priEntIni).toDate(), moment(priEntFin).toDate())
                                    let priSalRango = momentExt.range(moment(priEntFin).toDate(), moment(priSalFin).toDate())
                                    //Obtengo las marcaciones segun fecha y clasifico segun rangos

                                    marcacionesDia.forEach(marcacion => {
                                        let horaMarcaje = moment(marcacion.fecha + " " + marcacion.hora).format('YYYY-MM-DD HH:mm')
                                        if (priEntRango.contains(moment(horaMarcaje), {excludeEnd: true}))
                                            priEntradasM.push(moment(horaMarcaje))
                                        else if (priSalRango.contains(moment(horaMarcaje)))
                                            priSalidasM.push(moment(horaMarcaje))
                                    })
                                    console.timeEnd("Marcaciones1T")
                                    let priEntradas: string[] = [];
                                    let priSalidas: string[] = [];
                                    if (!priEntExcepcion.existe) {
                                        if (priEntradasM.length > 0) {
                                            priEntradasM.sort((a, b) => a.diff(b));
                                            priEntradasM.map(entrada => {
                                                priEntradas.push(entrada.format("HH:mm"))
                                            })
                                            infoMarcacion.priEntradas = priEntradas
                                            let retraso = priEntradasM.at(0)?.diff(moment(jornada.fecha + " " + priTurno.horaEntrada), "minutes")
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
                                            sinMarcarEntradas++
                                            totalSinMarcar++
                                            totalSinMarcarEntradas++
                                        }
                                    }

                                    if (!priSalExcepcion.existe) {
                                        if (priSalidasM.length > 0) {
                                            priSalidasM.sort((a, b) => a.diff(b));
                                            priSalidasM.map(salida => {
                                                priSalidas.push(salida.format("HH:mm"))
                                            })
                                            infoMarcacion.priSalidas = priSalidas
                                            let ultimo = priSalidasM.length -1
                                            if(priSalidasM.at(ultimo)?.isBefore(moment(jornada.fecha + " " + priTurno.horaSalida))) {
                                                cantSalAntes++
                                                totalSalAntes++
                                                hayPriAntes = true
                                            }
                                        } else {
                                            sinMarcar++
                                            sinMarcarSalidas++
                                            totalSinMarcar++
                                            totalSinMarcarSalidas++
                                        }
                                    }
                                    infoMarcacion.activo = true;
                                    if (sinMarcar == numTurnos * 2) {
                                        infoMarcacion.noMarcados = 0;
                                        infoMarcacion.sinMarcarEntradas = 0
                                        infoMarcacion.sinMarcarSalidas = 0
                                        totalSinMarcar = totalSinMarcar - numTurnos * 2;
                                        totalSinMarcarEntradas = totalSinMarcarEntradas - numTurnos;
                                        totalSinMarcarSalidas = totalSinMarcarSalidas - numTurnos;
                                        totalAusencias++;
                                        infoMarcacion.estado = EstadoJornada.ausencia
                                    } else {
                                        infoMarcacion.noMarcados = sinMarcar;
                                        infoMarcacion.sinMarcarEntradas = sinMarcarEntradas
                                        infoMarcacion.sinMarcarSalidas = sinMarcarSalidas
                                    }
                                    infoMarcacion.cantRetrasos = cantRetrasos;
                                    infoMarcacion.minRetrasos = minRetrasos;
                                    infoMarcacion.cantSalAntes = cantSalAntes;
                                    infoMarcacion.hayPriEntExcepcion = priEntExcepcion;
                                    infoMarcacion.hayPriSalExcepcion = priSalExcepcion;
                                    infoMarcacion.hayPriRetraso = hayPriRetraso;
                                    infoMarcacion.hayPriAntes = hayPriAntes;
                                } else {
                                    if (jornada.estado === EstadoJornada.teletrabajo) {
                                        infoMarcacion.estado = EstadoJornada.teletrabajo
                                        infoMarcacion.mensaje = "Trabajo a distancia (desde casa)"
                                    } else {
                                        infoMarcacion.estado = EstadoJornada.dia_libre
                                        infoMarcacion.mensaje = "Día de descanso"
                                    }
                                }
                            }
                        }
                    } else {
                        infoMarcacion.horario = "Ninguno"
                        infoMarcacion.mensaje = "Asigna antes un horario"
                        infoMarcacion.estado = EstadoJornada.sin_asignar
                        sinAsignar++;
                    }
                    infoMarcaciones.push(infoMarcacion)
                }
                console.timeEnd("RangoValido")
            }
            if (rangoDeBaja) {
                infoMarcaciones.push(...getAvisosDeBaja(rangoDeBaja))
            }
            resumenMarcacion.totalCantRetrasos = totalCantRetrasos
            resumenMarcacion.totalMinRetrasos = totalMinRetrasos
            resumenMarcacion.multaRetrasos = getMultaRetrasos(totalMinRetrasos)
            resumenMarcacion.totalSinMarcar = totalSinMarcar
            resumenMarcacion.totalSinMarcarEntradas = totalSinMarcarEntradas
            resumenMarcacion.totalSinMarcarSalidas = totalSinMarcarSalidas
            resumenMarcacion.multaSinMarcar = getMultaSinMarcar(totalSinMarcar)
            resumenMarcacion.totalSalAntes = totalSalAntes
            resumenMarcacion.multaSalAntes = getMultaSalAntes(totalSalAntes)
            resumenMarcacion.totalAusencias = totalAusencias
            resumenMarcacion.multaAusencias = getMultaAusencias(totalAusencias)
            resumenMarcacion.totalSanciones = resumenMarcacion.multaRetrasos + resumenMarcacion.multaSinMarcar + resumenMarcacion.multaSalAntes + resumenMarcacion.multaAusencias
            resumenMarcacion.diasComputados = diasComputados
            resumenMarcacion.sinAsignar = sinAsignar;
            resumenMarcacion.infoMarcaciones = infoMarcaciones

            resumenMarcacion.totalExcTickeos = totalExcTickeos
            resumenMarcacion.totalTolerancias = totalTolerancias
            resumenMarcacion.totalInterrupciones = totalInterrupciones
            resumenMarcacion.totalExcepciones = totalExcTickeos + totalTolerancias + totalInterrupciones
            resumenMarcacion.totalVacaciones = totalVacaciones
            resumenMarcacion.totalBajas = totalBajas
            resumenMarcacion.totalPermisosSG = totalPermisosSG
            resumenMarcacion.totalPermisos = totalPermisos
            resumenMarcacion.totalLicencias = totalLicencias
            resumenMarcacion.totalCapacitaciones = totalCapacitaciones
            resumenMarcacion.totalOtros = totalPermisos + totalLicencias + totalCapacitaciones;
            return resumenMarcacion;
        }
    }
}

interface RespuestaOrganigrama {
    success: boolean;
    alta?: string;
    baja?: string;
    rotacion?: string;
    error?: string;
}
/**
 * Genera la información desde Organigrama que debe mostrarse en el reporte
 *
 * @param respuesta    Objeto devuelto por getSolicitudesAprobadasPorCI
 * @param rangoValido  Rango de fechas del reporte
 */
export function generarInfoOrganigrama(respuesta: RespuestaOrganigrama, rangoValido: DateRange) {
    if (!respuesta.success) {
        return { error: respuesta.error };
    }
    const tieneAlta = !!respuesta.alta;
    const tieneBaja = !!respuesta.baja;
    const tieneRotacion = !!respuesta.rotacion;

    const altaEnRango = tieneAlta && rangoValido.contains( moment(respuesta.alta, "DD/MM/YYYY").toDate(),
            { excludeStart: false, excludeEnd: false }
        );

    if (tieneBaja) {
        if (altaEnRango) {
            return { alta: respuesta.alta, baja: respuesta.baja };
        }
        return { baja: respuesta.baja };
    }

    if (tieneRotacion) {
        const info: any = { rotacion: respuesta.rotacion };
        if (altaEnRango)
            info.alta = respuesta.alta;
        return info;
    }
    if (altaEnRango) {
        return { alta: respuesta.alta };
    }
    return undefined;
}