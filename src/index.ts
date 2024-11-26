import "reflect-metadata"
import express from "express"
import cors from "cors"
import morgan from "morgan"
import {Terminal} from "./entity/Terminal"
import {AppDataSource} from "./data-source"
import routes from "./routes"
import fs from "fs";

const path = require("path");

const app = express()
app.use(express.json())
app.use(cors());
app.use(morgan("dev"))
app.use(routes)


app.get('/', (req, res) => {
    res.send("Inicio Server")
})


async function main() {
    await AppDataSource.initialize();
    app.listen(4000, () => {
        console.log("Servidor corriendo");
    })
    console.log("desde index ggg...")
}

main()