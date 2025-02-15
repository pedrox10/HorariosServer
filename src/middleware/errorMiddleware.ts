import { Request, Response, NextFunction } from 'express';
import logger from '../logger/logger';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Error en ${req.method} ${req.url} - ${err.message} | Body: ${JSON.stringify(req.body)}`);
    res.status(500).json({ error: 'Ocurrió un error interno' });
};

export default errorHandler;