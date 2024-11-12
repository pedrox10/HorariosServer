import "reflect-metadata"
import {DataSource} from "typeorm"
import {Terminal} from "./entity/Terminal"

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "127.0.0.1",
    port: 3306,
    username: "admin",
    password: "admin",
    database: "horarios",
    synchronize: true,
    logging: false,
    entities: [Terminal],
    subscribers: [],
    migrations: [],
})