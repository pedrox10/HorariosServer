import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToMany,
    BaseEntity,
    ManyToOne,
    VirtualColumn
} from "typeorm"
import {Terminal} from "./Terminal";
import {Jornada} from "./Jornada";
import {ExcepcionTickeo} from "./ExcepcionTickeo";

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
    @Column({type: 'date', nullable: false })
    fechaAlta: Date;
    @Column({type: 'date', nullable: true})
    fechaBaja: Date;
    @Column({type: 'date', nullable: true})
    fechaCumpleano: Date;

    ultimaJornadaDelMes: Jornada;

    @OneToMany(() => Jornada, (jornada) => jornada.usuario)
    jornadas: Jornada[]
    @ManyToOne(() => Terminal, (terminal) => terminal.usuarios)
    terminal: Terminal
    @OneToMany(() => ExcepcionTickeo, (excepcion) => excepcion.usuario)
    excepcionesTickeo: ExcepcionTickeo[]
}
