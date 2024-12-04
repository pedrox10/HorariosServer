import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity, OneToMany} from "typeorm"
import {Horario} from "./Horario";
import {Turno} from "./Turno";

@Entity()
export class TurnoDia extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    dia: string
    @Column()
    num_turno: number
    @Column({type: 'time', nullable: true})
    horaEntrada: Date;
    @Column({type: 'time', nullable: true})
    horaSalida: Date;
    @ManyToOne(() => Horario, (horario) => horario.turnosDia)
    horario: Horario
}