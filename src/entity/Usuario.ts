import {Entity, Column, PrimaryGeneratedColumn, OneToMany, BaseEntity} from "typeorm"
import {Turno} from "./Turno";

@Entity()
export class Usuario extends BaseEntity{
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    ci: number
    @Column()
    nombre:string
    @OneToMany(() => Turno, (turno) => turno.usuario)
    turnos: Turno[]
    @Column()
    genero:string
}