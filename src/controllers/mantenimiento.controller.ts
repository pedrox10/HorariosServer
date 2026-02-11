import * as ftp from 'basic-ftp';
import * as path from 'path';
import * as fsAsync from 'fs/promises';
import * as fs from 'fs';
const archiver = require('archiver');
// Asume que estas entidades y dependencias están disponibles o importadas
import { AppDataSource } from "../data-source";
import { Terminal } from "../entity/Terminal";
const spawn = require('await-spawn');
import { Request, Response } from 'express';
import {sincronizarTerminal} from "./terminal.controller";
import {EstadoUsuario, Usuario} from "../entity/Usuario";
import {Jornada} from "../entity/Jornada";
import {Marcacion} from "../entity/Marcacion";
import {Notificacion} from "../entity/Notificacion";
import moment, * as MomentExt from 'moment';
import {DateRange, extendMoment} from "moment-range";
import {getSolicitudesAprobadasPorCI} from "./usuario.controller";
import {Excepcion} from "../models/Excepcion";

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
    // 0️⃣ Limpiar tabla
    //await Notificacion.clear();
    const hoy = moment();
    const semanaActualISO = `${hoy.isoWeekYear()}-W${hoy.isoWeek()}`;
    const semanaAnteriorISO = `${hoy.clone().subtract(1, 'week').isoWeekYear()}-W${hoy.clone().subtract(1, 'week').isoWeek()}`;
    console.log(semanaActualISO)
    console.log(semanaAnteriorISO)
    // 1️⃣ Obtener terminales
    const terminales = await Terminal.find({
        where: { tieneConexion: true }
    });
    for (const terminal of terminales) {
        if (!terminal.ultSincronizacion) continue;
        // 2️⃣ Fecha hasta evaluada (regla clave)
        const fechaHastaEvaluada = moment(terminal.ultSincronizacion)
            .subtract(1, 'day')
            .endOf('day');
        // Muy vieja → no genera nada
        if (fechaHastaEvaluada.isBefore(
            hoy.clone().subtract(2, 'weeks').startOf('isoWeek')
        )) {
            continue;
        }
        // Semana de la última sync
        const semanaSyncISO =
            `${fechaHastaEvaluada.isoWeekYear()}-W${fechaHastaEvaluada.isoWeek()}`;
        // 3️⃣ Decidir semanas a generar
        const semanas: Array<'actual' | 'anterior'> = [];
        if (semanaSyncISO === semanaActualISO) {
            semanas.push('actual', 'anterior');
        } else if (semanaSyncISO === semanaAnteriorISO) {
            semanas.push('anterior');
        } else {
            continue;
        }
        // 4️⃣ Usuarios del terminal
        const usuarios = await Usuario.find({ where: {
                terminal: { id: terminal.id },
                estado: 1 // activo
            }
        });
        // 5️⃣ Procesar semanas
        for (const tipoSemana of semanas) {
            const base = tipoSemana === 'actual' ? hoy : hoy.clone().subtract(1, 'week');
            let inicio = base.clone().startOf('isoWeek');
            let fin = base.clone().endOf('isoWeek');
            // recorte por fechaHastaEvaluada
            if (fechaHastaEvaluada.isBefore(fin)) {
                fin = fechaHastaEvaluada.clone();
            }
            if (fin.isBefore(inicio)) continue;
            const rango = momentExt.range(inicio, fin);
            // 6️⃣ Procesar usuarios
            for (const usuario of usuarios) {
                //console.log(usuario.nombre)
                let diasSinMarcacion = 0;
                let diasSinAsignacion = 0;
                let excepcionesCompletas = await getExcepcionesCompletasPorCI(usuario.ci, rango)
                if (excepcionesCompletas.length > 0) {
                    console.log(
                        `${usuario.nombre} tiene ${excepcionesCompletas.length} excepciones completas`,
                        excepcionesCompletas
                    );
                }
                for (const dia of rango.by('day')) {
                    console.log(dia.toISOString())
                    /*const tieneJornada = true;
                    const tieneMarcacion = false;
                    if (!tieneJornada) {
                        diasSinAsignacion++;
                    } else if (!tieneMarcacion) {
                        diasSinMarcacion++;
                    }*/
                }
                if (diasSinMarcacion === 0 && diasSinAsignacion === 0) continue;
                await Notificacion.save({
                    usuario,
                    terminal,
                    diasSinMarcacion,
                    diasSinAsignacion,
                    semanaISO: tipoSemana === 'actual' ? semanaActualISO : semanaAnteriorISO,
                    tipoSemana,
                    fechaHastaEvaluada: fechaHastaEvaluada.toDate(),
                    fechaActualizacion: new Date()
                });
            }
        }
    }
    console.log('✅ Notificaciones generadas correctamente');
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