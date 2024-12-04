import "reflect-metadata"
import {DataSource} from "typeorm"
import {Terminal} from "./entity/Terminal"
import {Marcacion} from "./entity/Marcacion";
import {Usuario} from "./entity/Usuario";
import {TurnoDia} from "./entity/TurnoDia";
import {Horario} from "./entity/Horario";
import {Turno} from "./entity/Turno";

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "127.0.0.1",
    port: 3306,
    username: "admin",
    password: "admin",
    database: "horarios",
    synchronize: true,
    logging: false,
    entities: [Terminal, Usuario, Marcacion, TurnoDia, Horario, Turno],
    subscribers: [],
    migrations: [],

})