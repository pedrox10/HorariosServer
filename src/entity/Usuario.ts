import {Entity, Column, PrimaryGeneratedColumn, OneToMany, BaseEntity} from "typeorm"
import {Turno} from "./Turno";
import {Marcacion} from "./Marcacion";

@Entity()
export class Usuario extends BaseEntity{
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    ci: number
    @Column()
    nombre:string
    @Column()
    estado:EstadoUsuario
    @OneToMany(() => Turno, (turno) => turno.usuario)
    turnos: Turno[]
    @OneToMany(() => Marcacion, (marcacion) => marcacion.usuario)
    marcaciones: Marcacion[]
}


enum EstadoUsuario {
    inactivo,
    activo,
}