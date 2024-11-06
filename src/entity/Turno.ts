    import {Entity, Column, PrimaryGeneratedColumn, ManyToOne} from "typeorm"
import {Horario} from "./Horario";

@Entity()
export class Turno {
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    dia:string
    @Column()
    numero:number
    @Column()
    horaEntrada: number
    @Column()
    horaSalida: number
    @ManyToOne(() => Horario, (horario) => horario.turnos)
    horario: Horario
}