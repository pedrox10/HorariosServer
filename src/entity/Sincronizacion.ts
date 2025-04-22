import {BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Terminal} from "./Terminal";

@Entity()
export class Sincronizacion extends BaseEntity {
    @PrimaryGeneratedColumn()
    id:number;
    @Column({type: 'datetime', nullable: true})
    fecha: Date;
    @Column({type: 'datetime', nullable: true})
    horaServidor: Date;
    @Column()
    nuevasMarcaciones: number
    @Column()
    usuariosAgregados: number
    @Column()
    usuariosEditados: number
    @Column()
    usuariosEliminados: number

    @ManyToOne(() => Terminal, (terminal) => terminal.sincronizaciones)
    terminal: Terminal
}