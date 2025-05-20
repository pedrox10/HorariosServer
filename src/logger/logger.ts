import winston from 'winston';
import moment from "moment";
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.printf(({ timestamp, level, message }) => {
    let outputMessage = message;

    if (typeof message === 'string' && message.length > 1000) {
        outputMessage = message.substring(0, 1000) + '... [mas]';
    }
    return `${timestamp} [${level.toUpperCase()}]: ${outputMessage}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => moment().format('DD/MM/YYYY HH:mm:ss'),
        }),
        logFormat
    ),
    transports: [
        new DailyRotateFile({
            dirname: 'logs',
            filename: 'app-%DATE%.log',
            datePattern: 'YYYY-MM', // un log por mes
            zippedArchive: false,
            maxSize: '20m',
            maxFiles: '12m', // guarda hasta 12 meses
            level: 'info',
        }),
        new winston.transports.Console(),
        // Solo logs de ERROR
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            handleExceptions: true
        })
    ],
});

export default logger;