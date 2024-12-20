import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity} from "typeorm"
import {Horario} from "./Horario";
import {EstadoUsuario, Usuario} from "./Usuario";
import {Turno} from "./Turno";

export enum EstadoJornada {
    dia_libre,
    activa,
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
    @OneToOne(() => Turno, (turno) => turno.jornada, { cascade: true })
    @JoinColumn()
    priTurno: Turno
    @OneToOne(() => Turno,(turno) => turno.jornada, { cascade: true } )
    @JoinColumn()
    segTurno: Turno
    @Column({ default: EstadoJornada.activa })
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