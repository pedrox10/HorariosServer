import {Entity, Column, PrimaryGeneratedColumn, OneToMany, BaseEntity, OneToOne, JoinColumn} from "typeorm"
import {Turno} from "./Turno";
import {Marcacion} from "./Marcacion";
import {Horario} from "./Horario";
import {Terminal} from "./Terminal";

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
    @OneToOne(() => Terminal)
    @JoinColumn()
    terminal: Terminal
    @OneToMany(() => Turno, (turno) => turno.usuario)
    turnos: Turno[]
    @OneToMany(() => Marcacion, (marcacion) => marcacion.usuario)
    marcaciones: Marcacion[]
}


enum EstadoUsuario {
    inactivo,
    activo,
}