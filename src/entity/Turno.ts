import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity} from "typeorm"
import {Jornada} from "./Jornada";

@Entity()
export class Turno extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'time'})
    horaEntrada: Date;
    @Column({type: 'time'})
    horaSalida: Date;
    @OneToOne(() => Jornada)
    jornada: Jornada
}