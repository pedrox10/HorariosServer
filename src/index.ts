import "reflect-metadata"
import express from "express"
import cors from "cors"
import  morgan from "morgan"
import { Terminal } from "./entity/Terminal"
import { AppDataSource } from "./data-source"
import routes from "./routes"
import  fs from "fs";

const path = require("path");
const envPython = path.join(__dirname, "scriptpy/envpy", "bin", "python3");
const spawn = require('await-spawn')
const app = express()
app.use(express.json())
app.use(cors());
app.use(morgan("dev"))
app.use(routes)


app.get('/', (req, res) => {
    res.send("Inicio Server")
})

app.get("/terminales/agregar", async (req, res) => {
    const terminal = new Terminal()
    terminal.nombre = "Nueva"
    terminal.ip = "192.168.70.211"
    terminal.puerto = 4307
    await AppDataSource.manager.save(terminal)
    res.send(terminal)
})

app.get("/usuarios/:ip/:puerto", (req, res) => {
    let ip = req.params.ip;
    let puerto = req.params.puerto;
    const getUsuariosPy = async () => {
        try {
            const pyFile = 'src/scriptpy/usuarios.py';
            const args = [ip];
            args.unshift(pyFile);
            const pyprog = await spawn(envPython, args);
            res.send(pyprog.toString())
        } catch (e:any) {
            console.log(e.stderr.toString())
        }
    }
    getUsuariosPy()
    /*let aux = [{"uid":1,"role":0,"password":"","name":"PEDRO DINO","cardno":0,"user_id":"9420724"},{"uid":12,"role":0,"password":"111","name":"testing","cardno":0,"user_id":"9"},{"uid":4,"role":0,"password":"0895","name":"","cardno":0,"user_id":"5297992"},{"uid":7,"role":0,"password":"","name":"RUTH  PEREZ CUBA","cardno":0,"user_id":"7948392"},{"uid":8,"role":14,"password":"","name":"","cardno":0,"user_id":"7912911"},{"uid":10,"role":0,"password":"","name":"CARMELO VALENCIA CARBALL","cardno":0,"user_id":"5317614"},{"uid":13,"role":0,"password":"","name":"LOURDES MAITA VELIZ ","cardno":0,"user_id":"14850113"},{"uid":18,"role":0,"password":"","name":"NELIA  LOPEZ AREVALO","cardno":0,"user_id":"13658745"},{"uid":19,"role":0,"password":"","name":"ANDREA  SERRUDO VILLCA","cardno":0,"user_id":"12556096"},{"uid":20,"role":14,"password":"","name":"LUIS","cardno":0,"user_id":"9413936"},{"uid":21,"role":0,"password":"","name":"DENIS FLORES  ARGOTE","cardno":0,"user_id":"6493074"},{"uid":22,"role":14,"password":"","name":"DENILSON","cardno":0,"user_id":"1"}]
    res.send(aux)*/
})

app.get("/marcaciones/:ip/:puerto", (req, res) => {
    let ip = req.params.ip;
    let puerto = req.params.puerto;
    const getRegistrosPy = async () => {
        try {
            const pyFile = 'src/scriptpy/registros.py';
            const args = [ip];
            args.unshift(pyFile);
            const pyprog = await spawn(envPython, args);
            res.send(pyprog.toString())
        } catch (e:any) {
            console.log(e.stderr.toString())
        }
    }
    getRegistrosPy()
    /*try {
        const jsonString = fs.readFileSync("./src/registros.json");
        res.send(JSON.parse(jsonString.toString()));
      } catch (err) {
        console.log(err);
        return;
      }*/
})

async function main() {
    await AppDataSource.initialize();
    app.listen(4000, () => {
        console.log("Servidor corriendo");
    })
    console.log("desde index ggg...")
}
main()