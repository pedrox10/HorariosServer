import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, BaseEntity} from "typeorm"
import {Horario} from "./Horario";
import {EstadoUsuario, Usuario} from "./Usuario";
import {Turno} from "./Turno";
import {InfoExtraJornada} from "../models/InfoExtraJornada";

export enum EstadoJornada {
    dia_libre,
    activa,
    feriado,
    con_excepcion_completa,
    con_excepcion_horas,
    sin_asignar,
}

@Entity()
export class Jornada extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'date'})
    fecha: Date
    @OneToOne(() => Turno, (turno) => turno.jornada, { cascade: true, onDelete: "CASCADE" })
    @JoinColumn()
    priTurno: Turno
    @OneToOne(() => Turno,(turno) => turno.jornada, { cascade: true, onDelete: "CASCADE" } )
    @JoinColumn()
    segTurno: Turno
    @Column({ default: EstadoJornada.activa })
    estado:EstadoJornada
    @ManyToOne(() => Usuario, (usuario) => usuario.jornadas, { cascade: true, onDelete: "CASCADE" })
    usuario: Usuario
    @ManyToOne(() => Horario)
    horario: Horario

    infoExtra: InfoExtraJornada

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