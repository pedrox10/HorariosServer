import * as path from 'path';
import * as fsAsync from 'fs/promises';
import * as fs from 'fs';
// Asume que estas entidades y dependencias están disponibles o importadas
import {AppDataSource} from "../data-source";
import {Terminal} from "../entity/Terminal";
import {Request, Response} from 'express';
import {sincronizarTerminal} from "./terminal.controller";
import {Usuario} from "../entity/Usuario";
import {EstadoJornada, Jornada} from "../entity/Jornada";
import {Notificacion} from "../entity/Notificacion";
import moment, * as MomentExt from 'moment';
import {DateRange, extendMoment} from "moment-range";
import {getSolicitudesAprobadasPorCI} from "./usuario.controller";
import {Excepcion} from "../models/Excepcion";
import {Asueto, TipoAsueto} from "../entity/Asueto";
import {Between} from "typeorm";
import {Marcacion} from "../entity/Marcacion";

const archiver = require('archiver');
const spawn = require('await-spawn');

// --- Configuración del Servidor FTP ---
const FTP_CONFIG = {
    host: 'ftpupload.net',
    user: 'b7_40121480',
    password: 'amarse10', // Reemplazar con la contraseña real
    port: 21,
    secure: false,
};
const momentExt = extendMoment(MomentExt);
// Define la ubicación de tu entorno Python (debe ser accesible desde el service)
const envPython = path.join(__dirname, "../scriptpy/envpy", "bin", "python3");
// Define la ruta base para todos tus respaldos locales (p. ej., un directorio persistente)
const RUTA_BASE_RESPALDOS = 'respaldos'; // ¡AJUSTAR ESTA RUTA!

// ----------------------------------------------------
// 1. FUNCIÓN AUXILIAR DE COMPRESIÓN
// ----------------------------------------------------
function comprimirCarpeta(sourceDir: string, outputZip: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputZip);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        output.on('close', () => {
            console.log(`Compresión finalizada. Bytes: ${archive.pointer}`);
            resolve();
        });
        archive.on('error', (err: Error) => reject(err));
        output.on('error', (err: Error) => reject(err));
        archive.pipe(output);
        // El nombre de la carpeta raíz dentro del ZIP será el nombre de la carpeta de origen (la fecha)
        archive.directory(sourceDir, path.basename(sourceDir));
        archive.finalize();
    });
}
// ----------------------------------------------------
// 2. FUNCIÓN PRINCIPAL DE RESPALDO (Para ser llamada por CRON)
// ----------------------------------------------------
export const ejecutarRespaldoDiario = async (req: Request, res: Response) => {
    const resultados: any[] = [];
    const FECHA_HOY = moment().format('DD-MM-YYYY');
    const DIR_ORIGEN_DIARIO = path.join(RUTA_BASE_RESPALDOS, FECHA_HOY);
    const ARCHIVO_FINAL_ZIP = path.join(RUTA_BASE_RESPALDOS, `${FECHA_HOY}.zip`);
    /*const ARCHIVO_FTP_FINAL = `/respaldos/${FECHA_HOY}.zip`;
    let client: ftp.Client | null = null;
    let subidaExitosa = false;*/
    let statusCode = 200; // Por defecto: éxito
    let finalMessage = 'Respaldo diario finalizado con éxito.';
    let finalError: string | null = null;
    console.log(`Iniciando respaldo para la fecha: ${FECHA_HOY}`);

    try {
        console.time("RespaldoDiario")
        // PASO 1: Asegurar que la carpeta de fecha exista (Puede estar creada por terminales sin conexión)
        await fsAsync.mkdir(DIR_ORIGEN_DIARIO, { recursive: true });
        // PASO 2: Generar respaldos de terminales con conexión
        const terminales = await AppDataSource.manager.find(Terminal, { where: { tieneConexion: true } });

        for (const terminal of terminales) {
            const nombreTerminal = terminal.nombre.replace(/\s+/g, '_');
            try {
                // Ejemplo simplificado de obtención y guardado de datos:
                const pyFileMarcaciones = 'src/scriptpy/marcaciones.py';
                let argsMarcaciones = [terminal.ip, terminal.puerto];
                argsMarcaciones.unshift(pyFileMarcaciones);
                // Ejecuta script Python para obtener datos
                const pyprogMarcaciones = await spawn(envPython, argsMarcaciones);
                let respuesta = JSON.parse(pyprogMarcaciones.toString());
                let horaTerminal = moment(respuesta.hora_terminal);
                const nombreArchivo = `${nombreTerminal}_${horaTerminal.format('YYYY-MM-DD_HH-mm-ss')}.json`;
                const rutaArchivoLocal = path.join(DIR_ORIGEN_DIARIO, nombreArchivo);
                // --- 2. PROCESAMIENTO DE USUARIOS ---
                let usuariosT: any;
                const pyFileUsuarios = 'src/scriptpy/usuarios.py';
                let argsUsuarios = [terminal.ip, terminal.puerto];
                argsUsuarios.unshift(pyFileUsuarios);
                const pyprogUsuarios = await spawn(envPython, argsUsuarios);
                usuariosT = JSON.parse(pyprogUsuarios.toString());
                // --- 3. CREACIÓN DEL CONTENIDO JSON ---
                const contenidoRespaldo = {
                    numero_serie: respuesta.numero_serie,
                    modelo: respuesta.modelo,
                    hora_terminal: horaTerminal.format("YYYY-MM-DD[T]HH:mm:ss"),
                    total_marcaciones: respuesta.total_marcaciones,
                    usuariosT,
                    marcaciones: respuesta.marcaciones,
                };
                const contenidoJSON = JSON.stringify(contenidoRespaldo, null, 2);
                await fsAsync.writeFile(rutaArchivoLocal, contenidoJSON, 'utf-8');
                resultados.push({ terminal: terminal.nombre, estado: 'Local Exitoso', ruta_local: rutaArchivoLocal });
            } catch (error: any) {
                console.error(`Error procesando terminal ${terminal.nombre}:`, error);
                resultados.push({ terminal: terminal.nombre, estado: 'Error Local', error: error.message });
            }
        }
        // PASO 3: COMPRESIÓN ÚNICA
        console.log(`Comprimiendo carpeta: ${DIR_ORIGEN_DIARIO}`);
        await comprimirCarpeta(DIR_ORIGEN_DIARIO, ARCHIVO_FINAL_ZIP);
        // PASO 4: LIMPIEZA DE LA CARPETA DE ORIGEN (Requerimiento: mantener solo el ZIP)
        await fsAsync.rm(DIR_ORIGEN_DIARIO, { recursive: true, force: true });
        console.log(`Limpieza exitosa: Carpeta de origen ${DIR_ORIGEN_DIARIO} eliminada.`);
        // PASO 5: SUBIDA ÚNICA POR FTP
        /*client = new ftp.Client();
        await client.access(FTP_CONFIG);
        await client.ensureDir(path.dirname(ARCHIVO_FTP_FINAL));
        // Usar fs (Streams) para la lectura del ZIP
        const streamRespaldo = fs.createReadStream(ARCHIVO_FINAL_ZIP);
        await client.uploadFrom(streamRespaldo, ARCHIVO_FTP_FINAL);
        subidaExitosa = true;
        console.log(`Subida FTP exitosa: ${ARCHIVO_FTP_FINAL}`);*/
    } catch (error) {
        statusCode = 500;
        finalMessage = 'Fallo crítico durante el proceso de respaldo.';
        finalError = error instanceof Error ? error.message : String(error);
        console.error('Fallo general en la tarea de respaldo:', error);
    } finally {
        // PASO 6: CIERRE DE CONEXIÓN FTP
        /*if (client) {
            client.close();
        }*/
        res.status(statusCode).json({
            mensaje: finalMessage,
            error: finalError,
            estado: {
                fecha: FECHA_HOY,
                zip_local: ARCHIVO_FINAL_ZIP,
                //ftp_subido: subidaExitosa,
                terminal_logs: resultados
            }
        });
        console.timeEnd("RespaldoDiario")
    }
};

export const sincronizarHorasTerminales = async (req: Request, res: Response) => {
    try {
        const terminales = await AppDataSource.manager.find(Terminal, { where: { tieneConexion: true } });
        if (!terminales || terminales.length === 0) {
            return res.status(200).json({ success: true, mensaje: "No hay terminales conectadas para sincronizar." });
        }
        const pySincronizarFecha = 'src/scriptpy/cambiar_fecha.py';
        const resultados = [];

        for (const terminal of terminales) {
            try {
                const horaActualServidor = moment().format("YYYY-MM-DDTHH:mm:ss");
                let args = [terminal.ip, terminal.puerto];
                args.push(horaActualServidor);
                args.unshift(pySincronizarFecha);
                const pyprogSincronizarFecha = await spawn(envPython, args);
                const resultadoScript = pyprogSincronizarFecha.toString();
                resultados.push({
                    ip: terminal.ip,
                    resultado: resultadoScript
                });
            } catch (e: any) {
                resultados.push({
                    ip: terminal.ip,
                    error: e.message
                });
            }
        }
        return res.status(200).json({
            success: true,
            mensaje: "Sincronización de horas finalizada.",
            resultados: resultados
        });
    } catch (error) {
        console.error("Error al sincronizar todas las terminales:", error);
        return res.status(500).json({ success: false, error: "Error interno del servidor durante la sincronización." });
    }
};

export const sincronizarTerminales = async (req: Request, res: Response) => {
    const resultados: any[] = [];
    const terminales = await Terminal.find({
        where: { tieneConexion: true }
    });
    for (const terminal of terminales) {
        try {
            // 🔁 Llamada directa, sin HTTP
            await sincronizarTerminalInterno(terminal.id);
            resultados.push({
                terminal: terminal.nombre,
                estado: 'OK'
            });
        } catch (error: any) {
            resultados.push({
                terminal: terminal.nombre,
                estado: 'ERROR',
                detalle: error.message
            });
        }
    }
    return res.json({
        mensaje: 'Sincronización nocturna finalizada',
        total: terminales.length,
        resultados
    });
};


export const generarNotificaciones = async (req: Request, res: Response) => {
    generarNotificacionesCron()
};

export async function generarNotificacionesCron() {
    console.log('⏰ Iniciando generación de notificaciones');

    await Notificacion.clear();

    const fechaActualizacion = moment().toDate();
    const notificacionesBuffer: Partial<Notificacion>[] = [];

    const hoy = moment();
    const semanaActualISO = `${hoy.isoWeekYear()}-W${hoy.isoWeek()}`;
    const semanaAnteriorISO = `${hoy.clone().subtract(1, 'week').isoWeekYear()}-W${hoy.clone().subtract(1, 'week').isoWeek()}`;
    // 🔹 Feriados (máximo 2 semanas)
    const inicioFeriados = hoy.clone().subtract(1, 'week').startOf('isoWeek');
    const finFeriados = hoy.clone().endOf('isoWeek');

    const feriados = await Asueto.findBy({
        fecha: Between(inicioFeriados.toDate(), finFeriados.toDate()),
        tipo: TipoAsueto.todos
    });
    const feriadosSet = new Set(
        feriados.map(f => moment(f.fecha).format('YYYY-MM-DD'))
    );
    const terminales = await Terminal.find({
        where: { tieneConexion: true }
    });
    for (const terminal of terminales) {
        if (!terminal.ultSincronizacion) continue;
        // 🔹 fechaHastaEvaluada por terminal
        const fechaHastaEvaluada = moment(terminal.ultSincronizacion)
            .subtract(1, 'day')
            .endOf('day');

        // Muy viejo → no se evalúa
        if (
            fechaHastaEvaluada.isBefore(
                hoy.clone().subtract(2, 'weeks').startOf('isoWeek')
            )
        ) {
            continue;
        }
        // 🔹 Rango global POR TERMINAL
        const inicioGlobal = hoy.clone().subtract(1, 'week').startOf('isoWeek');
        const finGlobalTerminal = moment.min(
            hoy.clone().endOf('isoWeek'),
            fechaHastaEvaluada
        );
        if (finGlobalTerminal.isBefore(inicioGlobal)) continue;
        // 🔹 Determinar semanas a generar
        const semanaSyncISO =
            `${fechaHastaEvaluada.isoWeekYear()}-W${fechaHastaEvaluada.isoWeek()}`;
        const semanas: Array<{
            tipo: 'actual' | 'anterior';
            iso: string;
            inicio: moment.Moment;
            fin: moment.Moment;
        }> = [];
        if (semanaSyncISO === semanaActualISO) {
            semanas.push(
                {
                    tipo: 'actual',
                    iso: semanaActualISO,
                    inicio: hoy.clone().startOf('isoWeek'),
                    fin: hoy.clone().endOf('isoWeek')
                },
                {
                    tipo: 'anterior',
                    iso: semanaAnteriorISO,
                    inicio: hoy.clone().subtract(1, 'week').startOf('isoWeek'),
                    fin: hoy.clone().subtract(1, 'week').endOf('isoWeek')
                }
            );
        } else if (semanaSyncISO === semanaAnteriorISO) {
            semanas.push({
                tipo: 'anterior',
                iso: semanaAnteriorISO,
                inicio: hoy.clone().subtract(1, 'week').startOf('isoWeek'),
                fin: hoy.clone().subtract(1, 'week').endOf('isoWeek')
            });
        } else {
            continue;
        }
        // 🔹 Usuarios del terminal
        const usuarios = await Usuario.find({
            where: {
                terminal: { id: terminal.id },
                estado: 1
            }
        });
        for (const usuario of usuarios) {
            // 🔹 Marcaciones
            const marcaciones = await Marcacion.find({
                where: {
                    ci: usuario.ci,
                    terminal: terminal,
                    fecha: Between(
                        inicioGlobal.toDate(),
                        finGlobalTerminal.toDate()
                    )
                }
            });
            const marcacionesPorDia = new Set(
                marcaciones.map(m => moment(m.fecha).format('YYYY-MM-DD'))
            );
            // 🔹 Jornadas
            const jornadas = await Jornada.find({
                where: {
                    usuario: { id: usuario.id },
                    fecha: Between(
                        inicioGlobal.toDate(),
                        finGlobalTerminal.toDate()
                    )
                },
                relations: { horario: true }
            });
            const jornadasMap = new Map(
                jornadas.map(j => [
                    moment(j.fecha).format('YYYY-MM-DD'),
                    j
                ])
            );
            // 🔹 Excepciones completas
            const excepciones = await getExcepcionesCompletasPorCI(
                usuario.ci,
                momentExt.range(inicioGlobal, finGlobalTerminal)
            );
            const excepcionesSet = new Set(
                excepciones.map(e => moment(e.fecha).format('YYYY-MM-DD'))
            );
            // 🔹 Procesar semanas
            for (const semana of semanas) {
                let diasSinMarcacion = 0;
                let diasSinAsignacion = 0;
                const finSemanaReal = moment.min(
                    semana.fin,
                    finGlobalTerminal
                );
                if (finSemanaReal.isBefore(semana.inicio)) continue;

                const rangoSemana = momentExt.range(
                    semana.inicio,
                    finSemanaReal
                );
                for (const dia of rangoSemana.by('day')) {
                    const key = dia.format('YYYY-MM-DD');
                    // 1️⃣ Fuera de vigencia del usuario
                    if (dia.isBefore(moment(usuario.fechaAlta))) continue;
                    if (usuario.fechaBaja && dia.isAfter(moment(usuario.fechaBaja))) continue;
                    // 2️⃣ Excepción de jornada completa
                    if (excepcionesSet.has(key)) continue;

                    const jornada = jornadasMap.get(key);
                    if (!jornada) {
                        diasSinAsignacion++;
                        continue;
                    }
                    if (jornada.estado === EstadoJornada.dia_libre || jornada.horario?.esTeleTrabajo) {
                        continue;
                    }
                    if (!jornada.horario?.incluyeFeriados && feriadosSet.has(key)) {
                        continue;
                    }
                    if (!marcacionesPorDia.has(key)) {
                        diasSinMarcacion++;
                    }
                }
                if (diasSinMarcacion === 0 && diasSinAsignacion === 0) continue;
                notificacionesBuffer.push({
                    usuario,
                    terminal,
                    diasSinMarcacion,
                    diasSinAsignacion,
                    semanaISO: semana.iso,
                    tipoSemana: semana.tipo,
                    fechaHastaEvaluada: fechaHastaEvaluada.toDate(),
                    fechaActualizacion
                });
            }
        }
    }
    // 🔹 Bulk insert
    if (notificacionesBuffer.length > 0) {
        await Notificacion
            .createQueryBuilder()
            .insert()
            .values(notificacionesBuffer)
            .execute();
    }
    console.log('✅ Notificaciones generadas correctamente');
}

export async function getNotificaciones(req: Request, res: Response) {
    try {
        const notificaciones = await Notificacion.find({
            relations: {
                usuario: true,
                terminal: true
            },
            order: {
                terminal: { nombre: 'ASC' },
                usuario: { nombre: 'ASC' }
            }
        });
        const resultado = {
            semana_actual: { terminales: [] as any[] },
            semana_anterior: { terminales: [] as any[] },
            ultimaActualizacion: null as Date | null
        };
        if (notificaciones.length === 0) {
            return res.json(resultado);
        }
        // 👉 Todas las filas comparten la misma fecha
        resultado.ultimaActualizacion = notificaciones[0].fechaActualizacion;
        const terminalMap = new Map<string, any>();
        for (const n of notificaciones) {
            const key = `${n.tipoSemana}-${n.terminal.id}`;
            if (!terminalMap.has(key)) {
                const terminalObj = {
                    id: n.terminal.id,
                    nombre: n.terminal.nombre,
                    fechaHastaEvaluada: n.fechaHastaEvaluada,
                    totalNotificaciones: 0,
                    usuarios: [] as any[]
                };
                terminalMap.set(key, terminalObj);

                if (n.tipoSemana === 'actual') {
                    resultado.semana_actual.terminales.push(terminalObj);
                } else {
                    resultado.semana_anterior.terminales.push(terminalObj);
                }
            }
            const terminalRef = terminalMap.get(key);
            const inicioSemana = moment(n.semanaISO, 'GGGG-[W]WW').startOf('isoWeek');
            const finSemana = moment(n.semanaISO, 'GGGG-[W]WW').endOf('isoWeek');
            terminalRef.usuarios.push({
                id: n.usuario.id,
                nombre: n.usuario.nombre,
                diasSinMarcacion: n.diasSinMarcacion,
                diasSinAsignacion: n.diasSinAsignacion,
                fechaInicio: inicioSemana,
                fechaFin: finSemana
            });
            terminalRef.totalNotificaciones++;
        }
        // 🔽 ORDENAR USUARIOS (más críticos primero)
        for (const semana of ['semana_actual', 'semana_anterior'] as const) {
            for (const terminal of resultado[semana].terminales) {
                terminal.usuarios.sort((a: any, b: any) => {
                    if (b.diasSinMarcacion !== a.diasSinMarcacion) {
                        return b.diasSinMarcacion - a.diasSinMarcacion;
                    }
                    return b.diasSinAsignacion - a.diasSinAsignacion;
                });
            }
        }
        return res.json(resultado);
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        return res.status(500).json({ error: 'Error interno' });
    }
}

async function sincronizarTerminalInterno(terminalId: number) {
    const fakeReq = {
        params: { id: terminalId.toString() },
        method: 'GET'
    } as any;
    const fakeRes = {
        status: () => fakeRes,
        json: () => null
    } as any;
    await sincronizarTerminal(fakeReq, fakeRes);
}

async function getExcepcionesCompletasPorCI(
    ci: number,
    rangoValido: DateRange
): Promise<Excepcion[]> {

    const excepciones: Excepcion[] = [];
    const respuesta = await getSolicitudesAprobadasPorCI(ci);
    if (!respuesta.success) return excepciones;

    const solicitudes = respuesta.solicitudes ?? [];

    for (const solicitud of solicitudes) {
        if ( solicitud.tipo === 'ET' || solicitud.tipo === 'TO' || solicitud.tipo === 'CU') {
            continue;
        }
        if (!solicitud.dias || solicitud.dias.length === 0) continue;
        for (const diaObj of solicitud.dias) {
            // ✔ solo jornada completa
            if (diaObj.jornada !== 'completa') continue;
            const fechaDia = moment(diaObj.fecha, 'YYYY-MM-DD');
            // ✔ solo días dentro del rango evaluado
            if (!rangoValido.contains(fechaDia)) {
                continue;
            }
            const excepcion = new Excepcion();
            excepcion.fecha = fechaDia.toDate();
            excepcion.jornada = 'completa';
            excepcion.detalle = capitalizar(solicitud.detalle);
            excepcion.licencia = solicitud.tipo;
            excepciones.push(excepcion);
        }
    }
    return excepciones;
}

function capitalizar(cadena: string): string {
    if (!cadena) return "";
    return cadena.charAt(0).toUpperCase() + cadena.slice(1).toLowerCase();
}