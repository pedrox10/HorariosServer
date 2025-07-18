import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToMany,
    BaseEntity,
    ManyToOne,
} from "typeorm"
import {Terminal} from "./Terminal";
import {Jornada} from "./Jornada";
import {Grupo} from "./Grupo";

export enum EstadoUsuario {
        inactivo,
        activo,
        eliminado
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
    ultAsignacion?: string;
    ultMarcacion?: string;

    @OneToMany(() => Jornada, (jornada) => jornada.usuario)
    jornadas: Jornada[]
    @ManyToOne(() => Terminal, (terminal) => terminal.usuarios)
    terminal: Terminal
    @ManyToOne(() => Grupo, (grupo) => grupo.usuarios, {nullable: true, onDelete: "SET NULL"})
    grupo: Grupo | null;
}
