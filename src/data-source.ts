import "reflect-metadata"
import {DataSource} from "typeorm"
import {Terminal} from "./entity/Terminal"

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "",
    database: "horarios",
    synchronize: true,
    logging: false,
    entities: [Terminal],
    subscribers: [],
    migrations: [],
})