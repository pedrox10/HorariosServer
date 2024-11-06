import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from "typeorm"
import {Turno} from "./Turno";

@Entity()
export class Horario {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string
    @Column()
    descripcion: string
    @Column()
    color: string
    @Column()
    tolerancia: number
    @OneToMany(() => Turno, (turno) => turno.horario)
    turnos: Turno[]
}