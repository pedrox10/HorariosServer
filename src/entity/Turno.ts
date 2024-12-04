import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity} from "typeorm"
import {Horario} from "./Horario";
import {Usuario} from "./Usuario";
import {Terminal} from "./Terminal";

@Entity()
export class Turno extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    fecha: Date
    @Column({type: 'datetime', nullable: true})
    fechaEntrada: Date;
    @Column({type: 'datetime', nullable: true})
    fechaSalida: Date;
    @OneToOne(() => Horario)
    @JoinColumn()
    horario: Horario
    @ManyToOne(() => Usuario, (usuario) => usuario.turnos)
    usuario: Usuario
}