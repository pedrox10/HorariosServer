import { Request, Response, NextFunction } from 'express';
import morgan, { StreamOptions } from 'morgan';
import logger from '../logger/logger';

// Agregar el cuerpo de la solicitud al log de Morgan
morgan.token('body', (req: Request) => JSON.stringify(req.body));

// Formato del log
const morganFormat = ':method :url :status :res[content-length] - :response-time ms :body';

// Redirigir logs de Morgan a Winston (solo INFO)
const stream: StreamOptions = {
    write: (message) => logger.info(message.trim())
};

// Middleware para registrar las peticiones HTTP
const requestLogger = morgan(morganFormat, { stream });

export default requestLogger;