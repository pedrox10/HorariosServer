import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToMany,
    BaseEntity,
    OneToOne,
    JoinColumn,
    ManyToOne,
    VirtualColumn
} from "typeorm"
import {Terminal} from "./Terminal";
import {Jornada} from "./Jornada";

export enum EstadoUsuario {
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
    @Column({ default: EstadoUsuario.activo })
    estado:EstadoUsuario
    @OneToMany(() => Jornada, (jornada) => jornada.usuario)
    jornadas: Jornada[]
    @ManyToOne(() => Terminal, (terminal) => terminal.usuarios)
    terminal: Terminal
}
