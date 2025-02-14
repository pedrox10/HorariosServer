import winston from 'winston';
import moment from 'moment-timezone';

// Formato de logs personalizado
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Configuración de Winston
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => moment().tz('America/Caracas').format('YYYY-MM-DD HH:mm:ss') // UTC -04
        }),
        logFormat
    ),
    transports: [
        new winston.transports.Console(), // Mostrar en consola siempre

        // Logs de información y otros niveles (excluyendo 'error')
        new winston.transports.File({
            filename: 'logs/app.log',
            level: 'info', // Guarda logs de INFO, WARN, etc.
            handleExceptions: false
        }),

        // Logs de error exclusivamente
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error', // Solo guarda logs de ERROR
            handleExceptions: true
        })
    ]
});

export default logger;