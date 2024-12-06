import {Entity, Column, PrimaryGeneratedColumn, OneToMany, BaseEntity} from "typeorm"
import {TurnoDia} from "./TurnoDia";
import {Turno} from "./Turno";

@Entity()
export class Horario extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string
    @Column()
    tolerancia: number
    @Column()
    color: string
    @Column()
    descripcion: string
    @OneToMany(() => TurnoDia, (turnoDia) => turnoDia.horario)
    turnosDia: TurnoDia[]
}