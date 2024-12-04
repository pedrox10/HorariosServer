import {Entity, Column, PrimaryGeneratedColumn, OneToMany, BaseEntity, OneToOne, JoinColumn, ManyToOne} from "typeorm"
import {TurnoDia} from "./TurnoDia";
import {Marcacion} from "./Marcacion";
import {Horario} from "./Horario";
import {Terminal} from "./Terminal";
import {Turno} from "./Turno";

enum EstadoUsuario {
    inactivo,
    activo,
}

@Entity()
export class Usuario extends BaseEntity{
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    uid: number
    @Column()
    ci: number
    @Column()
    nombre:string
    @Column({ default: EstadoUsuario.inactivo })
    estado:EstadoUsuario
    @OneToMany(() => Turno, (turno) => turno.usuario)
    turnos: Turno[]
    @ManyToOne(() => Terminal, (terminal) => terminal.usuarios)
    terminal: Terminal
}
