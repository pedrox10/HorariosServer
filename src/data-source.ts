import "reflect-metadata"
import {DataSource} from "typeorm"
import {Terminal} from "./entity/Terminal"
import {Marcacion} from "./entity/Marcacion";
import {Usuario} from "./entity/Usuario";
import {JornadaDia} from "./entity/JornadaDia";
import {Horario} from "./entity/Horario";
import {Turno} from "./entity/Turno";
import {Jornada} from "./entity/Jornada";
import {Asueto} from "./entity/Asueto";
import {Licencia} from "./entity/Licencia";
import {ExcepcionTickeo} from "./entity/ExcepcionTickeo";
import {Sincronizacion} from "./entity/Sincronizacion";
import {Interrupcion} from "./entity/Interrupcion";
import {UsuarioLogin} from "./entity/UsuarioLogin";

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "127.0.0.1",
    port: 3306,
    username: "admin",
    password: "admin",
    database: "horarios",
    synchronize: true,
    logging: false,
    entities: [Terminal, Usuario, Marcacion, JornadaDia, Horario, Jornada, Turno, Asueto,
                Licencia, ExcepcionTickeo, Sincronizacion, Interrupcion, UsuarioLogin],
    subscribers: [],
    migrations: [],
})