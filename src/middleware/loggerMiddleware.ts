import { Request, Response, NextFunction } from 'express';
import morgan, { StreamOptions } from 'morgan';
import logger from '../logger/logger';

// Token personalizado para el cuerpo de la solicitud
morgan.token('body', (req: Request) => JSON.stringify(req.body));

// Token personalizado para la IP del cliente
morgan.token('ip', (req: Request) => {
    return req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
});

// Formato del log con IP incluida
const morganFormat = 'IP: :ip :method :url :status :res[content-length] - :response-time ms :body';

// Redirigir logs de Morgan a Winston
const stream: StreamOptions = {
    write: (message) => logger.info(message.trim())
};

// Middleware para registrar las peticiones HTTP
const requestLogger = morgan(morganFormat, { stream });

export default requestLogger;