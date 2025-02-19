import winston from 'winston';
import moment from 'moment-timezone';

const logFormat = winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = winston.createLogger({
    level: 'info', // Asegúrate de que el nivel es correcto
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => moment().tz('America/Caracas').format('YYYY-MM-DD HH:mm:ss') // UTC -04
        }),
        logFormat
    ),
    transports: [
        new winston.transports.Console(), // Se verá en consola

        // Solo logs de INFO y superiores
        new winston.transports.File({
            filename: 'logs/app.log',
            level: 'info',
            handleExceptions: false
        }),

        // Solo logs de ERROR
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            handleExceptions: true
        })
    ]
});

export default logger;