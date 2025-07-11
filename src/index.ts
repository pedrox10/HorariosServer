import "reflect-metadata"
import express from "express"
import cors from "cors"
import morgan from "morgan"
import {AppDataSource} from "./data-source"
import routes from "./routes"
import requestLogger from './middleware/loggerMiddleware';
import errorHandler from './middleware/errorMiddleware';
import logger from './logger/logger';

const app = express()

app.use(express.json({limit: '20mb'}))
app.use(cors());
app.use(morgan("dev"))
app.use(requestLogger);
app.use(errorHandler);
app.use("/api", routes)


app.get('/api', (req, res) => {
    res.send("Inicio Server")
})

async function main() {
    await AppDataSource.initialize();
    app.listen(41300, () => {
        logger.info("Servidor Iniciado");
    })
}
main()

