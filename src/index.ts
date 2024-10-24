import express from "express"
import cors from "cors"
import  morgan from "morgan"

const spawn = require('await-spawn')
const app = express()
app.use(cors());
app.use(morgan("dev"))

const terminales = [
    {
        nombre: "Planta Baja",
        ip: "192.168.70.199",
        puerto: 4370,
    },
    {
        nombre: "Piso 1",
        ip: "192.168.70.200",
        puerto: 4370,
    },
    {
        nombre: "Terminal",
        ip: "192.168.70.210",
        puerto: 4370,
    }
];

app.get('/', (req, res) => {
    res.send("Inicio Server")
})

app.get("/terminales", (req, res) => {
    res.send(terminales)
})

app.get("/usuarios/:ip/:puerto", (req, res) => {
    let ip = req.params.ip;
    let puerto = req.params.puerto;
    const getUsuariosPy = async () => {
        try {
            const pyFile = 'src/usuarios.py';
            const args = [ip];
            args.unshift(pyFile);
            const pyprog = await spawn('python3', args);
            res.send(pyprog.toString())
        } catch (e:any) {
            console.log(e.stderr.toString())
        }
    }
    getUsuariosPy()
})

app.get("/marcaciones/:ip/:puerto", (req, res) => {
    let ip = req.params.ip;
    let puerto = req.params.puerto;
    const getRegistrosPy = async () => {
        try {
            const pyFile = 'src/registros.py';
            const args = [ip];
            args.unshift(pyFile);
            const pyprog = await spawn('python3', args);
            res.send(pyprog.toString())
        } catch (e:any) {
            console.log(e.stderr.toString())
        }
    }
    getRegistrosPy()
})

app.listen(4000, () => {
    console.log("Servidor corriendo");
})

console.log("desde index ggg...")