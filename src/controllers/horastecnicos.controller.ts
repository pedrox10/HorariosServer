import { Request, Response } from "express";
import moment, * as MomentExt from "moment";
import { Usuario } from "../entity/Usuario";
import { Marcacion } from "../entity/Marcacion";
import { Not, Between } from "typeorm";
import { EstadoUsuario } from "../entity/Usuario";
import { getReporteMarcaciones } from "./usuario.controller"; // reutiliza la función existente

// ─────────────────────────────────────────────────────────────────────────────
// POST /reporte-horas-tecnicos
//
// Body JSON:
// {
//   "cis": [12345678, 23456789, 34567890],   ← lista de CIs de los técnicos
//   "ini": "2025-02-01",                      ← fecha inicio
//   "fin": "2025-02-28"                       ← fecha fin
// }
//
// Respuesta: lista ordenada de mayor a menor horas trabajadas
// ─────────────────────────────────────────────────────────────────────────────
export const reporteHorasTecnicos = async (req: Request, res: Response) => {
    const { cis, ini, fin } = req.body;

    // ── Validaciones básicas ──────────────────────────────────────────────
    if (!cis || !Array.isArray(cis) || cis.length === 0) {
        return res.status(400).json({ mensaje: "Se requiere el campo 'cis' como array de números." });
    }
    if (!ini || !fin) {
        return res.status(400).json({ mensaje: "Se requieren los campos 'ini' y 'fin' (YYYY-MM-DD)." });
    }
    if (!moment(ini, "YYYY-MM-DD", true).isValid() || !moment(fin, "YYYY-MM-DD", true).isValid()) {
        return res.status(400).json({ mensaje: "Formato de fecha inválido. Usar YYYY-MM-DD." });
    }
    if (moment(fin).isBefore(moment(ini))) {
        return res.status(400).json({ mensaje: "La fecha 'fin' debe ser igual o posterior a 'ini'." });
    }

    const resultados: any[] = [];
    const noEncontrados: number[] = [];
    const errores: any[] = [];

    // ── Procesar cada CI ──────────────────────────────────────────────────
    for (const ci of cis) {
        try {
            // Un técnico puede estar en más de un terminal → buscar todos
            const usuarios = await Usuario.find({
                where: { ci: ci, estado: Not(EstadoUsuario.eliminado) },
                relations: { terminal: true }
            });

            if (usuarios.length === 0) {
                noEncontrados.push(ci);
                continue;
            }

            let minutosTotales = 0;
            let diasTrabajados = 0;
            let diasComputados = 0;
            let nombre = usuarios[0].nombre;
            let terminalesDelTecnico: string[] = [];

            for (const usuario of usuarios) {
                // Solo procesar terminales donde el usuario tiene
                // al menos una marcación en el rango solicitado
                const tieneMarcaciones = await Marcacion.count({
                    where: {
                        ci: ci,
                        terminal: usuario.terminal,
                        fecha: Between(
                            moment(ini, "YYYY-MM-DD").toDate(),
                            moment(fin, "YYYY-MM-DD").toDate()
                        )
                    }
                });
                if (tieneMarcaciones === 0) continue;

                terminalesDelTecnico.push(usuario.terminal.nombre);

                const resumen = await getReporteMarcaciones(usuario.id.toString(), ini, fin);
                if (!resumen || !resumen.infoMarcaciones) continue;

                diasComputados += resumen.diasComputados ?? 0;

                for (const info of resumen.infoMarcaciones) {
                    if (!info.activo) continue;
                    const minsDia = calcularMinutosTrabajados(info);
                    if (minsDia > 0) {
                        minutosTotales += minsDia;
                        diasTrabajados++;
                    }
                }
            }

            const horas = Math.floor(minutosTotales / 60);
            const mins = minutosTotales % 60;

            resultados.push({
                ci,
                nombre,
                terminales: terminalesDelTecnico,
                horas_trabajadas: horas,
                minutos_trabajados: minutosTotales,
                horas_formateado: `${horas}h ${mins.toString().padStart(2, '0')}m`,
                dias_trabajados: diasTrabajados,
                dias_computados: diasComputados,
                // Promedio sobre días efectivamente trabajados
                promedio_horas_por_dia: diasTrabajados > 0
                    ? parseFloat((minutosTotales / diasTrabajados / 60).toFixed(2))
                    : 0
            });

        } catch (err: any) {
            errores.push({ ci, error: err.message });
        }
    }

    // ── Ordenar por horas trabajadas (mayor a menor) ──────────────────────
    resultados.sort((a, b) => {
        // 1° horas trabajadas totales (desc)
        if (b.minutos_trabajados !== a.minutos_trabajados)
            return b.minutos_trabajados - a.minutos_trabajados;
        // 2° días trabajados (desc)
        if (b.dias_trabajados !== a.dias_trabajados)
            return b.dias_trabajados - a.dias_trabajados;
        // 3° promedio horas/día (desc)
        return b.promedio_horas_por_dia - a.promedio_horas_por_dia;
    });

    // Agregar posición en el ranking
    resultados.forEach((r, i) => { r.puesto = i + 1; });

    return res.json({
        periodo: {
            ini: moment(ini).format("DD/MM/YYYY"),
            fin: moment(fin).format("DD/MM/YYYY"),
            dias_calendario: moment(fin).diff(moment(ini), "days") + 1
        },
        total_tecnicos_consultados: cis.length,
        total_encontrados: resultados.length,
        no_encontrados_en_biometrico: noEncontrados,
        errores: errores.length > 0 ? errores : undefined,
        ranking: resultados
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// Calcula minutos trabajados en un día a partir de las marcaciones reales.
// Usa priEntradas/priSalidas para el primer turno y
// segEntradas/segSalidas para el segundo turno si existe.
// ─────────────────────────────────────────────────────────────────────────────
function calcularMinutosTrabajados(info: any): number {
    let total = 0;

    // Primer turno
    total += minutosEntreMarcaciones(info.priEntradas, info.priSalidas);

    // Segundo turno (si existe)
    if (info.numTurnos > 1) {
        total += minutosEntreMarcaciones(info.segEntradas, info.segSalidas);
    }

    return total;
}

function minutosEntreMarcaciones(entradas: string[], salidas: string[]): number {
    if (!entradas?.length || !salidas?.length) return 0;

    // Tomar la primera entrada y la última salida del turno
    const entrada = entradas[0];
    const salida = salidas[salidas.length - 1];

    if (!entrada || !salida) return 0;

    const formato = "HH:mm:ss";
    const m1 = moment(entrada, formato);
    const m2 = moment(salida, formato);

    if (!m1.isValid() || !m2.isValid()) return 0;

    const diff = m2.diff(m1, "minutes");

    // Ignorar diferencias negativas (error de dato) o mayores a 16h (probablemente dato corrupto)
    if (diff <= 0 || diff > 960) return 0;

    return diff;
}