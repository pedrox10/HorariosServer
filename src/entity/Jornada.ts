import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity} from "typeorm"
import {Horario} from "./Horario";
import {EstadoUsuario, Usuario} from "./Usuario";
import {Turno} from "./Turno";

export enum EstadoJornada {
    activa,
    dia_libre,
    vacacion,
    baja_medica,
    permiso,
    feriado,
}

@Entity()
export class Jornada extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'date'})
    fecha: Date
    @OneToOne(() => Turno)
    @JoinColumn()
    priTurno: Turno
    @OneToOne(() => Turno)
    @JoinColumn()
    segTurno: Turno
    @Column()
    estado:EstadoJornada
    @ManyToOne(() => Usuario, (usuario) => usuario.jornadas)
    usuario: Usuario
    @ManyToOne(() => Horario)
    horario: Horario

    getNumTurnos() {
        let res: number = 0;
        if (this.priTurno == null && this.segTurno == null)
            res = 0;
        else if (this.priTurno != null && this.segTurno == null)
            res = 1;
        else if (this.priTurno != null && this.segTurno != null)
            res = 2
        return res;
    }
}