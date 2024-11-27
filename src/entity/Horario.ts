import {Entity, Column, PrimaryGeneratedColumn, OneToMany, BaseEntity} from "typeorm"
import {Turno} from "./Turno";

@Entity()
export class Horario extends BaseEntity{
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
}