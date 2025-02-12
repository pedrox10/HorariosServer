import "reflect-metadata"
import express from "express"
import cors from "cors"
import morgan from "morgan"
import {AppDataSource} from "./data-source"
import routes from "./routes"

const path = require("path");
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors());
app.use(morgan("dev"))
app.use(express.static(path.join(__dirname, "../public")))
app.use(routes)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

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