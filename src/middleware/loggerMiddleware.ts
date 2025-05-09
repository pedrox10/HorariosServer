import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger from '../logger/logger';

// Token personalizado para el cuerpo
morgan.token('body', (req: Request) => JSON.stringify(req.body));

morgan.token('client-ip', (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip.replace(/^::ffff:/, '');
});

// Define directamente el formato como string
const requestLogger = morgan(
    ':client-ip :method :url :status :res[content-length] - :response-time ms :body',
    {
        stream: {
            write: (message) => logger.info(message.trim())
        },
        skip: (req: Request) => {
            // Omitir archivos estáticos
            return /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?|ttf)$/.test(req.url);
        }
    }
);

export default requestLogger;