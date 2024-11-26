    import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn} from "typeorm"
import {Horario} from "./Horario";
    import {Usuario} from "./Usuario";

@Entity()
export class Turno {
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    dia:string
    @Column()
    numero:number
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