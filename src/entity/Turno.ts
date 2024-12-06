import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity} from "typeorm"
import {Horario} from "./Horario";
import {Usuario} from "./Usuario";

@Entity()
export class Turno extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    fecha: Date
    @Column({type: 'time', nullable: true})
    horaEntrada: Date;
    @Column({type: 'time', nullable: true})
    horaSalida: Date;
    @ManyToOne(() => Usuario, (usuario) => usuario.turnos)
    usuario: Usuario
    @Column()
    horario: number
}