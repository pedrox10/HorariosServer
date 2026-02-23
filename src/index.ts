import "reflect-metadata"
import express from "express"
import cors from "cors"
import morgan from "morgan"
import {AppDataSource} from "./data-source"
import routes from "./routes"
import requestLogger from './middleware/loggerMiddleware';
import errorHandler from './middleware/errorMiddleware';
import logger from './logger/logger';
const path = require("path");
const app = express()
app.set('trust proxy', true);
app.use(express.json({limit: '20mb'}))
app.use(express.urlencoded({extended: true}))
app.use(cors());
//app.use(morgan("dev"))
app.use(requestLogger);
app.use(errorHandler);
app.use(express.static(path.join(__dirname, "../public")))

app.use("/api", routes)
app.use("/api", (req, res) => {
    res.status(404).json({
        mensaje: "Ruta no encontrada",
        ruta: req.originalUrl,
    });
});
app.get('/api', (req, res) => {
    res.send("Inicio Server")
})

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

async function main() {
    await AppDataSource.initialize();
    app.listen(41300 , () => {
        logger.info("Servidor Iniciado");
    })
}
main()