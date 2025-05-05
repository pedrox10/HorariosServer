import {BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Terminal} from "./Terminal";

@Entity()
export class Interrupcion extends BaseEntity {
    @PrimaryGeneratedColumn()
    id:number;
    @Column({type: 'date', nullable: false})
    fecha: Date;
    @Column()
    motivo: string
    @Column({type: 'datetime', nullable: false})
    horaIni: Date;
    @Column({type: 'datetime', nullable: false})
    horaFin: Date;
    @Column({ nullable: true })
    detalle: string

    @ManyToOne(() => Terminal, (terminal) => terminal.interrupciones)
    terminal: Terminal
}