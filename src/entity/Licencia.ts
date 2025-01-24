import {Entity, Column, PrimaryGeneratedColumn, BaseEntity, OneToMany} from "typeorm"
import {JornadaDia} from "./JornadaDia";
import {ExcepcionTickeo, TipoExcepcion} from "./ExcepcionTickeo";

@Entity()
export class Licencia extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string;
    @Column()
    tipo:TipoExcepcion
}