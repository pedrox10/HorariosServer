const express = require("express");
const cors = require('cors');
const ZKLib = require('qr-zklib')

const app = express();
app.use(cors()); // Enable CORS

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
  let getUsuariosPy = new Promise(function(success, nosuccess) {
    const { spawn } = require('child_process');
    const pyFile = 'src/usuarios.py';
    const args = [ip];
    args.unshift(pyFile);
    const pyprog = spawn('python3', args);
    pyprog.stdout.on('data', function(data) {
        success(data);
    });
    pyprog.stderr.on('data', (data) => {
        nosuccess(data);
    });
  });
  
  //let puerto = req.params.puerto;
  
  getUsuariosPy.then(function(fromRunpy) {
    res.setHeader('Content-Type', 'application/json');
    res.send(fromRunpy);
  });
})

app.get("/marcaciones/:ip/:puerto", (req, res) => {
  let ip = req.params.ip;
  let puerto = req.params.puero;
  res.send(ip)
  /*let getRegistrosPy = new Promise(function(success, nosuccess) {
    const { spawn } = require('child_process');
    const pyFile = 'src/registros.py';
    const args = ['Envio argumento'];
    args.unshift(pyFile);
    const pyprog = spawn('python3', args);
    pyprog.stdout.on('data', function(data) {
        success(data);
    });
    pyprog.stderr.on('data', (data) => {
        nosuccess(data);
    });
  });
  getRegistrosPy.then(function(fromRunpy) {
    res.setHeader('Content-Type', 'application/json');
    res.send(fromRunpy);
  });*/
})

app.listen(4000, () => {
  console.log("Servidor corriendo");
})

console.log("desde index ggg...")