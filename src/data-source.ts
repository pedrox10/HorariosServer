import "reflect-metadata"
import { DataSource } from "typeorm"
import { Terminal } from "./entity/Terminal"

export const AppDataSource = new DataSource({
    type: "mongodb",
    host: "localhost",
    port: 27017,
    username: "root",
    password: "",
    database: "horarios",
    synchronize: true,
    logging: true,
    entities: [Terminal],
    subscribers: [],
    migrations: [],
})