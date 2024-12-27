import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity} from "typeorm"
import {Jornada} from "./Jornada";

@Entity()
export class Turno extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'time', nullable: true})
    horaEntrada: Date;
    @Column({type: 'time', nullable: true})
    horaSalida: Date;
    @OneToOne(() => Jornada)
    jornada: Jornada
}